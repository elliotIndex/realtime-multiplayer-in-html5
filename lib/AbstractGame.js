'use strict';

const MainLoop = require('@arjanfrans/mainloop');
const Timer = require('./Timer');
const CollisionSystem = require('./CollisionSystem');
const EventSystem = require('./events/EventSystem');
const PlayerEventHandler = require('./events/PlayerEventHandler');

function AbstractGame ({ options, updateHandler = null, drawHandler = null }) {
    const players = new Map();
    let started = false;
    let eventsFired = [];
    const bullets = new Set();
    const timer = Timer.create({ interval: options.timerFrequency });

    const eventSystem = EventSystem.create({
        onDispatch: (event) => {
            eventsFired.push(event);
        }
    });
    const playerEventHandler = PlayerEventHandler.create({ eventSystem, bullets });
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

        player.setSpeed(options.playerSpeed);

        players.set(player.getId(), player);
        collisionSystem.addPlayer(player);
    }

    function removePlayer (playerId) {
        const player = players.get(playerId);

        collisionSystem.removePlayer(player);
        players.delete(playerId);
    }

    function start () {
        simulationLoop.start();
        timer.start();

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
        eventSystem.update(delta);
    }

    function update (delta) {
        if (typeof updateHandler === 'function') {
            updateHandler(delta);
        }

        updateSystems(delta);

        clearInputs();
    }

    function getStateForPlayer (player) {
        return {
            serverTime: getTime(),
            ownPlayer: player.toJSON(),
            players: Array.from(players.values()).filter(otherPlayer => {
                return otherPlayer !== player;
            }).map(player => player.toJSON()),
            events: eventsFired.filter((event) => {
                return event.getFiredBy() !== player;
            }).map((event) => event.toJSON())
        };
    }

    function clearEvents () {
        eventsFired = [];
    }

    function clearPlayers () {
        players.clear();
    }

    function getOptions () {
        return options;
    }

    function getBullets () {
        return Array.from(bullets);
    }

    function onEvent (eventData, dispatchedBy) {
        playerEventHandler.onEvent(eventData, dispatchedBy);
    }

    function onNetworkEvent (eventData, dispatchedBy) {
        playerEventHandler.onNetworkEvent(eventData, dispatchedBy);
    }

    function getSimulationFps () {
        return Math.round(1000 / options.simulationTimestep);
    }

    simulationLoop.setUpdate(update);

    if (typeof drawHandler === 'function') {
        simulationLoop.setDraw(drawHandler);
    }

    return Object.freeze({
        isStarted,
        getPlayers,
        getOptions,
        getSimulationFps,
        setTime,
        addPlayer,
        getBullets,
        removePlayer,
        clearEvents,
        update,
        onEvent,
        onNetworkEvent,
        clearPlayers,
        getTime,
        clearInputs,
        getPlayerById,
        setUpdateHandler,
        setDrawHandler,
        getStateForPlayer,
        start,
        stop
    });
}

module.exports = { create: AbstractGame };
