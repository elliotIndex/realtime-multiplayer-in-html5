'use strict';

const uuid = require('node-uuid');
const Player = require('./ServerPlayer');
const debug = require('debug');
const log = debug('game:server/Room');

function Room ({ owner, game }) {
    const id = uuid.v4();
    const clients = new Set();

    function getId () {
        return id;
    }

    function getOwner () {
        return owner;
    }

    function getSize () {
        return clients.size;
    }

    function isGameStarted () {
        return game.isStarted();
    }

    function send (message) {
        for (const client of clients) {
            client.send(message);
        }
    }

    function emit (event, data) {
        for (const client of clients) {
            client.emit(event, data);
        }
    }

    function receiveClientInput (...args) {
        game.getNetwork().receiveClientInput(...args);
    }

    function join (client) {
        clients.add(client);

        if (game.isStarted()) {
            const player = Player.create({
                name: client.getName()
            });

            game.addPlayer(player);
            game.getNetwork().addClientPlayer(client, player);

            const state = {
                serverTime: game.getTime(),
                players: Array.from(game.getPlayers()).filter(player => {
                    return game.getNetwork().getPlayerByClient(client) !== player;
                }).map(player => player.toJSON()),
                ownPlayer: game.getNetwork().getPlayerByClient(client).toJSON()
            };

            log('joining game');

            client.emit('startGame', state);

            for (const roomClient of clients) {
                if (roomClient !== client) {
                    roomClient.emit('playerJoined', player.toJSON());
                }
            }
        }
    }

    function leave (client) {
        if (game.isStarted) {
            const player = game.getNetwork().getPlayerByClient(client);

            for (const roomClient of clients) {
                if (roomClient !== client) {
                    roomClient.emit('playerLeft', player.getId());
                }
            }

            game.removePlayer(player);
            game.getNetwork().removeClientPlayer(client);
        }

        clients.delete(client);
    }

    function startGame () {
        for (const client of clients) {
            const player = Player.create({
                name: client.getName()
            });

            game.addPlayer(player);
            game.getNetwork().addClientPlayer(client, player);
        }

        for (const client of clients) {
            const state = {
                serverTime: game.getTime(),
                players: Array.from(game.getPlayers()).filter(player => {
                    return game.getNetwork().getPlayerByClient(client) !== player;
                }).map(player => player.toJSON()),
                ownPlayer: game.getNetwork().getPlayerByClient(client).toJSON()
            };

            client.emit('startGame', state);
        }

        log('game started');

        game.start();
    }

    function endGame () {
        if (game) {
            game.stop();
        }

        clients.clear();
    }

    function toJSON () {
        return {
            id,
            clients: Array.from(clients).map(client => {
                return {
                    id: client.getId(),
                    name: client.getName()
                };
            })
        };
    }

    join(owner);

    return Object.freeze({
        getId,
        getOwner,
        getSize,
        isGameStarted,
        send,
        emit,
        receiveClientInput,
        join,
        leave,
        startGame,
        endGame,
        toJSON
    });
}

module.exports = { create: Room };
