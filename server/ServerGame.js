'use strict';

const MainLoop = require('mainloop.js');
const CollisionSystem = require('../lib/CollisionSystem');
const GameNetwork = require('./Network');
const processInput = require('../lib/physics/process-input');
const BulletSystem = require('../lib/BulletSystem');
const EventSystem = require('../lib/events/EventSystem');
const protectObject = require('../lib/protect-object');
const parseGameEvent = require('../lib/events/parse-game-events');

function ServerGame ({ options }) {
    const players = new Set();
    const network = GameNetwork();

    let started = false;
    let time = 0;
    let bulletsFired = [];
    let eventsFired = [];

    const bulletSystem = BulletSystem.create({
        onFire: (bullet) => {
            bulletsFired.push(bullet);
        }
    });

    const eventSystem = EventSystem.create({
        onDispatch: (event) => {
            eventsFired.push(event);
        }
    });

    const collisionSystem = CollisionSystem.create({ world: options.world });

    const physicsLoop = MainLoop.create({
        simulationTimestep: options.simulationTimestep
    });
    const networkLoop = MainLoop.create({
        simulationTimestep: options.networkTimestep
    });
    const timerLoop = MainLoop.create({
        simulationTimestep: options.timerFrequency
    });

    function isStarted () {
        return started;
    }

    function getNetwork () {
        return network;
    }

    function getPlayers () {
        return players;
    }

    function getTime () {
        return time;
    }

    function addPlayer (player) {
        const { x, y } = options.playerPositions[0];

        player.setPosition(x, y);
        player.setSpeed(options.playerSpeed);

        players.add(player);
        collisionSystem.addPlayer(player);
    }

    function removePlayer (player) {
        bulletSystem.removePlayer(player);
        collisionSystem.removePlayer(player);
        players.delete(player);
    }

    function start () {
        physicsLoop.start();
        networkLoop.start();
        timerLoop.start();

        bulletsFired = [];
        eventsFired = [];

        started = true;
    }

    function stop () {
        physicsLoop.stop();
        networkLoop.stop();
        timerLoop.stop();

        started = false;
    }

    function updatePhysics (delta) {
        for (const player of players) {
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

    physicsLoop.setUpdate((delta) => {
        eventSystem.update(delta);
        updatePhysics(delta);
        collisionSystem.update(delta);
        bulletSystem.update(delta);
    });

    physicsLoop.setEnd(() => {
        for (const player of players.values()) {
            player.clearInputs();
        }
    });

    networkLoop.setUpdate(() => {
        network.sendUpdates({ players, bulletsFired, eventsFired, time });

        bulletsFired = [];
        eventsFired = [];
    });

    timerLoop.setUpdate((delta) => {
        time += delta / 1000;
    });

    return Object.freeze({
        isStarted,
        getNetwork,
        getPlayers,
        addPlayer,
        removePlayer,
        getTime,
        start,
        stop,
    });
}

module.exports = { create: protectObject(ServerGame) };
