'use strict';

const MainLoop = require('mainloop.js');
const InputHandler = require('./input');
const CollisionSystem = require('../../lib/CollisionSystem');
const BulletSystem = require('../../lib/BulletSystem');
const EventSystem = require('../../lib/events/EventSystem');
const parseGameEvent = require('../../lib/events/parse-game-events');
const protectObject = require('../../lib/protect-object');
const Ghost = require('./ClientPlayer');

function addVector (a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    };
}

function interpolate (p, n, interpolation) {
    interpolation = Math.max(0, Math.min(1, interpolation));

    return p + interpolation * (n - p);
}

function lerp (a, b, interpolation) {
    return {
        x: interpolate(a.x, b.x, interpolation),
        y: interpolate(a.y, b.y, interpolation)
    };
}

function ClientGame ({ options }) {
    const players = new Map();
    const serverGhosts = new Map();
    const localGhosts = new Map();
    const bulletSystem = BulletSystem.create();
    const eventSystem = EventSystem.create();
    const inputHandler = InputHandler();
    const collisionSystem = CollisionSystem.create({ world: options.world });

    let network = null;
    let renderer = null;

    let localPlayer = null;

    let inputSeq = 0;

    let time = 0;
    let clientTime = 0;
    let serverTime = 0;

    const serverUpdates = [];

    const afterViewLoopHooks = {};

    const physicsLoop = MainLoop.create({
        simulationTimestep: options.simulationTimestep
    });
    const timerLoop = MainLoop.create({
        simulationTimestep: options.timerFrequency
    });

    function addAfterViewLoopHook (name, hook) {
        afterViewLoopHooks[name] = hook;
    }

    function removeAfterViewLoopHook (name) {
        if (afterViewLoopHooks[name]) {
            delete afterViewLoopHooks[name];
        }
    }

    function getPlayers () {
        return players;
    }

    function addPlayer (player) {
        player.setSpeed(options.playerSpeed);
        players.set(player.getId(), player);

        const { x, y } = player.getPosition();
        const serverGhost = Ghost.create({ x, y, width: player.getWidth(), height: player.getHeight() });
        const localGhost = Ghost.create({ x, y, width: player.getWidth(), height: player.getHeight() });

        serverGhosts.set(player.getId(), serverGhost);
        localGhosts.set(player.getId(), localGhost);
    }

    function removePlayer (playerId) {
        bulletSystem.removePlayer(players.get(playerId));
        collisionSystem.removePlayer(players.get(playerId));
        players.delete(playerId);
        localGhosts.delete(playerId);
        serverGhosts.delete(playerId);
    }

    function setLocalPlayer (player) {
        if (localPlayer) {
            collisionSystem.removePlayer(localPlayer);
            eventSystem.removePlayer(localPlayer);
            bulletSystem.removePlayer(localPlayer);
        }

        localPlayer = player;

        collisionSystem.addPlayer(localPlayer);
    }

    function getPlayerById (id) {
        return players.get(id);
    }

    function getOptions () {
        return options;
    }

    function setTime (value) {
        time = value;
    }

    function getTime () {
        return time;
    }

    function getServerTime () {
        return serverTime;
    }

    function getGhosts (playerId) {
        return {
            server: serverGhosts.get(playerId),
            local: localGhosts.get(playerId)
        };
    }

    function clearPlayers () {
        players.clear();
        serverGhosts.clear();
        localGhosts.clear();
    }

    function getLocalPlayer () {
        return localPlayer;
    }

    function getBullets () {
        return bulletSystem.getBullets();
    }

    function setRenderer (value) {
        renderer = value;
    }

    function start () {
        timerLoop.start();
        physicsLoop.start();
    }

    function stop () {
        physicsLoop.stop();
        timerLoop.stop();
    }

    function updatePhysics (delta) {
        // Fetch the new direction from the input buffer,
        // and apply it to the state so we can smooth it in the visual state
        if (options.clientPrediction) {
            if (localPlayer) {
                const player = localPlayer;

                player.setPreviousState({
                    position: player.getPosition()
                });

                player.update(delta, () => {
                    bulletSystem.fireBullet(player);
                }, (eventName) => {
                    if (eventName === 'reload' && !player.isReloading()) {
                        parseGameEvent(eventSystem.dispatch, {
                            firedBy: player,
                            name: 'reload'
                        });
                    }
                });
            }
        }
    }

    function updateInput () {
        const input = inputHandler.getInput();

        if (input.length > 0 && localPlayer) {
            // Update what sequence we are on now
            inputSeq += 1;

            // Store the input state as a snapshot of what happened.
            localPlayer.pushInput({
                inputs: input,
                time,
                seq: inputSeq
            });

            if (network) {
                let data = 'i.';

                data += input.join('-') + '.';
                data += time.toFixed(3).replace('.', '-') + '.';
                data += inputSeq;

                network.send(data);
            }
        }
    }

    function clientPrediction () {
        // The most recent server update
        const latestServerUpdate = serverUpdates[serverUpdates.length - 1];

        // here we handle our local input prediction ,
        // by correcting it with the server and reconciling its differences
        const serverInputSeq = latestServerUpdate.ownPlayer.lastInputSeq;


        if (serverInputSeq) {
            let lastInputSeqIndex = -1;

            const localInputs = localPlayer.getInputs();

            for (let i = 0; i < localInputs.length; ++i) {
                if (localInputs[i].seq === serverInputSeq) {
                    lastInputSeqIndex = i;
                    break;
                }
            }

            // Now we can crop the list of any updates we have already processed
            if (lastInputSeqIndex !== -1) {
                // so we have now gotten an acknowledgement from the server that our inputs here have been accepted
                // and that we can predict from this known position instead

                // remove the rest of the inputs we have confirmed on the server
                const numberToClear = Math.abs(lastInputSeqIndex - (-1));

                localPlayer.clearInputs(numberToClear);

                // The localPlayer is now located at the new server position, authoritive server
                const { x, y } = latestServerUpdate.ownPlayer.position;

                localPlayer.setPosition(x, y);
                localPlayer.setLastInputSeq(lastInputSeqIndex);
            }

            // Update the debug server position block
            const serverGhost = serverGhosts.get(localPlayer.getId());

            const { x, y } = latestServerUpdate.ownPlayer.position;

            serverGhost.setPosition(x, y);
        }
    }

    function onServerUpdate (data) {
        serverTime = data.serverTime;

        // Update our local offset time from the last server update
        clientTime = serverTime - (options.networkOffset / 1000);

        // One approach is to set the position directly as the server tells you.
        // This is a common mistake and causes somewhat playable results on a local LAN, for example,
        // but causes terrible lag when any ping/latency is introduced. The player can not deduce any
        // information to interpolate with so it misses positions, and packet loss destroys this approach
        // even more so. See 'the bouncing ball problem' on Wikipedia.
        if (options.naiveApproach) {
            localPlayer.setPosition(data.ownPlayer.position.x, data.ownPlayer.position.y);

            for (const playerData of data.players) {
                const player = players.get(playerData.id);

                player.setPosition(playerData.position.x, playerData.position.y);
            }

            for (const bullet of data.bullets) {
                const player = players.get(bullet.firedBy);

                bulletSystem.addBullet(player, Object.assign({}, bullet, {
                    x: player.position.x,
                    y: player.position.y
                }));
            }

            for (const eventData of data.events) {
                const player = players.get(eventData.firedBy);

                parseGameEvent(eventSystem, {
                    id: eventData.id,
                    firedBy: player,
                    name: eventData.name
                });
            }
        } else {
            // Cache the data from the server,
            // and then play the timeline
            // back to the player with a small delay (networkOffset), allowing
            // interpolation between the points.
            serverUpdates.push(data);

            // we limit the buffer in seconds worth of updates
            // 60fps*buffer seconds = number of samples
            if (serverUpdates.length >= (60 * options.networkBufferSize)) {
                serverUpdates.splice(0, 1);
            }

            // Handle the latest positions from the server
            // and make sure to correct our local predictions, making the server have final say.
            if (serverUpdates.length > 0) {
                if (localPlayer) {
                    clientPrediction();

                    const delta = options.simulationTimestep;

                    // Now we reapply all the inputs that we have locally that
                    // the server hasn't yet confirmed. This will 'keep' our position the same,
                    // but also confirm the server position at the same time.
                    updatePhysics(delta);
                    collisionSystem.update(delta);
                    bulletSystem.update(delta);
                    eventSystem.update(delta);
                }
            }
        }
    }

    function processNetworkUpdates (interpolation) {
        if (serverUpdates.length === 0) {
            return;
        }

        // First : Find the position in the updates, on the timeline
        // We call this clientTime, then we find the past_pos and the target_pos using this,
        // searching throught the server_updates array for clientTime in between 2 other times.
        let target = null;
        let previous = null;

        // We look from the 'oldest' updates, since the newest ones
        // are at the end (list.length-1 for example). This will be expensive
        // only when our time is not found on the timeline, since it will run all
        // samples. Usually this iterates very little before breaking out with a target.
        for (let i = 0; i < serverUpdates.length - 1; ++i) {
            const point = serverUpdates[i];
            const nextPoint = serverUpdates[i + 1];

            // Compare our point in time with the server times we have
            if (clientTime > point.serverTime && clientTime < nextPoint.serverTime) {
                target = nextPoint;
                previous = point;
                break;
            }
        }

        // With no target we store the last known
        // server position and move to that instead
        if (!target) {
            target = serverUpdates[0];
            previous = serverUpdates[0];
        }

        // Now that we have a target and a previous destination,
        // We can interpolate between then based on 'how far in between' we are.
        // This is simple percentage maths, value/target = [0,1] range of numbers.
        // lerp requires the 0,1 value to lerp to? thats the one.

        if (!target || !previous) {
            return;
        }

        const difference = target.serverTime - clientTime;
        const max_difference = target.serverTime - previous.serverTime;
        let timePoint = difference / max_difference;

        // Because we use the same target and previous in extreme cases
        // It is possible to get incorrect values due to division by 0 difference and such.
        if (Number.isNaN(timePoint) || Math.abs(timePoint) === Number.POSITIVE_INFINITY) {
            timePoint = 0;
        }

        // The most recent server update
        const latestServerUpdate = serverUpdates[serverUpdates.length - 1];

        for (let i = 0; i < latestServerUpdate.players.length; i++) {
            const playerData = latestServerUpdate.players[i];
            const serverPosition = playerData.position;

            // The other players positions in this timeline, behind us and in front of us
            if (target.players[i] && previous.players[i]) {
                const targetPosition = target.players[i].position;
                const previousPosition = previous.players[i].position;

                const ghosts = getGhosts(playerData.id);
                const player = players.get(playerData.id);

                if (player) {
                    // update the dest block, this is a simple lerp
                    // to the target from the previous point in the server_updates buffer
                    ghosts.server.setPosition(serverPosition.x, serverPosition.y);

                    const localGhostPosition = lerp(previousPosition, targetPosition, timePoint);

                    ghosts.local.setPosition(localGhostPosition.x, localGhostPosition.y);

                    if (options.clientSmoothing) {
                        const { x, y } = lerp(player.getPosition(), ghosts.local.getPosition(), interpolation);

                        player.setPosition(x, y);
                    } else {
                        const { x, y } = ghosts.local.getPosition();

                        player.setPosition(x, y);
                    }

                    for (const bullet of target.bullets) {
                        const player = players.get(bullet.firedBy);
                        const position = player.getPosition();

                        bulletSystem.addBullet(player, Object.assign({}, bullet, {
                            x: position.x,
                            y: position.y
                        }));
                    }

                    for (const eventData of target.events) {
                        const player = players.get(eventData.firedBy);

                        parseGameEvent(eventSystem.dispatch, {
                            id: eventData.id,
                            firedBy: player,
                            name: eventData.name
                        });
                    }
                }
            }
        }

        // Now, if not predicting client movement , we will maintain the local player position
        // using the same method, smoothing the players information from the past.
        if (!options.clientPrediction && !options.naiveApproach) {
            // The other players positions in this timeline, behind us and in front of us
            const my_target_pos = target.ownPlayer.position;
            const my_past_pos = previous.ownPlayer.position;

            const ghosts = getGhosts(localPlayer.getId());

            // Snap the ghost to the new server position
            ghosts.server.setPosition(latestServerUpdate.ownPlayer.position.x, latestServerUpdate.ownPlayer.position.y);

            const local_target = lerp(my_past_pos, my_target_pos, timePoint);

            // Smoothly follow the destination position
            if (options.clientSmoothing) {
                const { x, y } = lerp(localPlayer.getPosition(), local_target, interpolation);

                localPlayer.setPosition(x, y);
            } else {
                localPlayer.setPosition(local_target.x, local_target.y);
            }

            for (const bullet of latestServerUpdate.bullets) {
                const player = players.get(bullet.firedBy);
                const { x, y } = player.getPosition();

                bulletSystem.addBullet(player, Object.assign({}, bullet, {
                    x,
                    y
                }));
            }

            for (const eventData of latestServerUpdate.events) {
                const player = getPlayerById(eventData.firedBy);

                parseGameEvent(eventSystem.dispatch, {
                    id: eventData.id,
                    firedBy: player,
                    name: eventData.name
                });
            }
        }
    }

    function setNetwork (value) {
        network = value;
    }

    physicsLoop.setUpdate((delta) => {
        updateInput();

        eventSystem.update(delta);
        updatePhysics(delta);
        bulletSystem.update(delta);
        collisionSystem.update(delta);

        time += delta / 1000;
    });

    physicsLoop.setDraw((interpolation) => {
        if (!options.naiveApproach && serverUpdates.length > 0) {
            // Network player just gets drawn normally, with interpolation from
            // the server updates, smoothing out the positions from the past.
            // Note that if we don't have prediction enabled - this will also
            // update the actual local client position on screen as well.
            processNetworkUpdates(interpolation);
        }

        renderer.draw(interpolation);

        for (const hookName of Object.keys(afterViewLoopHooks)) {
            afterViewLoopHooks[hookName]({
                time,
                clientTime,
                serverTime,
                netLatency: network ? network.getNetLatency() : null,
                netPing: network ? network.getNetPing() : null
            });
        }
    });

    physicsLoop.setEnd(() => {
        for (const player of players.values()) {
            player.clearInputs();
        }
    })

    timerLoop.setUpdate((delta) => {
        time += delta / 1000;
    });

    return {
        getGhosts,
        getPlayerById,
        getBullets,
        getPlayers,
        setTime,
        getTime,
        getServerTime,
        start,
        stop,
        clearPlayers,
        getLocalPlayer,
        addAfterViewLoopHook,
        removeAfterViewLoopHook,
        addPlayer,
        removePlayer,
        setNetwork,
        setLocalPlayer,
        onServerUpdate,
        setRenderer,
        getOptions
    };
}

module.exports = {
    create: protectObject(ClientGame)
};
