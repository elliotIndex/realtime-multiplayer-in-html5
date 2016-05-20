'use strict';

const MainLoop = require('../lib/mainloop');
const Vector = require('../lib/vector');
const CollisionHandler = require('../lib/collision');
const GameNetwork = require('./network');
const processInput = require('../lib/physics/process-input');
const BulletSystem = require('../lib/BulletSystem');
const EventSystem = require('../lib/events/EventSystem');
const protectObject = require('../lib/protect-object');

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

    const collisionHandler = CollisionHandler(options.world);
    const physicsLoop = MainLoop.create();
    const networkLoop = MainLoop.create();
    const timerLoop = MainLoop.create();

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
    }

    function removePlayer (player) {
        bulletSystem.removePlayer(player);
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

            const newDir = processInput(player, { bulletSystem, eventSystem }, delta);

            const { x, y } = Vector.add(player.getPosition(), newDir);

            player.setPosition(x, y);

            collisionHandler.process(player);

            player.clearInputs();
        }
    }

    physicsLoop.setSimulationTimestep(options.simulationTimestemp).setUpdate((delta) => {
        eventSystem.update(delta);
        updatePhysics(delta);
        bulletSystem.update(delta);
    });

    networkLoop.setSimulationTimestep(options.networkTimestep).setUpdate(() => {
        network.sendUpdates({ players, bulletsFired, eventsFired, time });

        bulletsFired = [];
        eventsFired = [];
    });

    timerLoop.setSimulationTimestep(options.timerFrequency).setUpdate((delta) => {
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
