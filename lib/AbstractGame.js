'use strict';

const MainLoop = require('mainloop.js');
const Timer = require('./Timer');
const CollisionSystem = require('./CollisionSystem');
const BulletSystem = require('./BulletSystem');
const EventSystem = require('./events/EventSystem');
const PlayerEventHandler = require('./events/PlayerEventHandler');

function AbstractGame ({ options, updateHandler = null, drawHandler = null }) {
    const players = new Map();
    let started = false;
    let bulletsFired = [];
    let eventsFired = [];
    const timer = Timer.create({ interval: options.timerFrequency });

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
    const playerEventHandler = PlayerEventHandler.create({ eventSystem });

    const collisionSystem = CollisionSystem.create({ world: options.world });

    const simulationLoop = MainLoop.create({
        simulationTimestep: options.simulationTimestep
    });

    function isStarted () {
        return started;
    }

    function getPlayerById (playerId) {
        return players.get(playerId);
    }

    function getPlayers () {
        return players.values();
    }

    function getTime () {
        return timer.getTime();
    }

    function setTime (value) {
        timer.setTime(value);
    }

    function setUpdateHandler (handler) {
        updateHandler = handler;
    }

    function setDrawHandler (handler) {
        drawHandler = handler;

        if (typeof handler === 'function') {
            simulationLoop.setDraw(handler);
        }
    }

    function addPlayer (player) {
        player.setEventHandler((eventData) => {
            playerEventHandler.onEvent(eventData, player);
        });
        player.setBulletHandler(() => {
            bulletSystem.fireBullet(player);
        });

        player.setSpeed(options.playerSpeed);

        players.set(player.getId(), player);
        collisionSystem.addPlayer(player);
    }

    function removePlayer (playerId) {
        const player = players.get(playerId);

        bulletSystem.removePlayer(player);
        collisionSystem.removePlayer(player);
        players.delete(playerId);
    }

    function start () {
        simulationLoop.start();
        timer.start();

        bulletsFired = [];
        eventsFired = [];

        started = true;
    }

    function stop () {
        simulationLoop.stop();
        timer.stop();

        started = false;
    }

    function clearInputs () {
        for (const player of players.values()) {
            player.clearInputs();
        }
    }

    function updateSystems (delta) {
        collisionSystem.update(delta);
        bulletSystem.update(delta);
        eventSystem.update(delta);
    }

    function update (delta) {
        if (typeof updateHandler === 'function') {
            updateHandler(delta);
        }

        updateSystems(delta);

        clearInputs();
    }

    function getState () {
        return {
            serverTime: getTime(),
            players: Array.from(players.values()),
            bullets: bulletsFired,
            events: eventsFired
        };
    }

    function clearEvents () {
        eventsFired = [];
        bulletsFired = [];
    }

    function clearPlayers () {
        players.clear();
    }

    function getOptions () {
        return options;
    }

    function getBullets () {
        return bulletSystem.getBullets();
    }

    function onEvent (eventData, dispatchedBy) {
        playerEventHandler.onEvent(eventData, dispatchedBy);
    }

    simulationLoop.setUpdate(update);

    if (typeof drawHandler === 'function') {
        simulationLoop.setDraw(drawHandler);
    }

    return Object.freeze({
        isStarted,
        getPlayers,
        getOptions,
        getBullets,
        setTime,
        addPlayer,
        removePlayer,
        clearEvents,
        update,
        getBulletSystem () { // FIXME
            return bulletSystem;
        },
        onEvent,
        clearPlayers,
        getTime,
        clearInputs,
        getPlayerById,
        setUpdateHandler,
        setDrawHandler,
        getState,
        start,
        stop
    });
}

module.exports = { create: AbstractGame };
