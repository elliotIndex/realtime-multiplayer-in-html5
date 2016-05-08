'use strict';

const uuid = require('node-uuid');
const GameNetwork = require('./network');
const Player = require('../lib/Player');
const debug = require('debug');
const log = debug('game:server/Room');

class Room {
    constructor (host) {
        this.id = uuid.v1();
        this.host = host;
        this.clients = new Set();
        this.clients.add(host);

        host.currentRoom = this;

        this.game = null;

        this.network = GameNetwork();

        this.player_host = host;
        this.gameStarted = false;
    }

    setGame (game) {
        this.game = game;
        game.network = this.network;
        this.network.addClientPlayer(this.host, this.game.players.self);
    }

    send (message) {
        for (const client of this.clients) {
            client.send(message);
        }
    }

    emit (event, data) {
        for (const client of this.clients) {
            client.emit(event, data);
        }
    }

    receiveClientInput (...args) {
        if (this.network) {
            this.network.receiveClientInput(...args);
        }
    }

    join (client) {
        this.clients.add(client);
        client.currentRoom = this;

        if (this.gameStarted) {
            const player = new Player(uuid.v4(), client.name);

            this.game.addPlayer(player);
            this.network.addClientPlayer(client, player);

            const state = {
                serverTime: this.game.local_time,
                players: Array.from(this.game.players).filter(player => {
                    return this.network.getPlayerByClient(client) !== player;
                }).map(player => player.toJSON()),
                ownPlayer: this.network.getPlayerByClient(client).toJSON()
            };

            log('joining game');

            client.emit('startGame', state);

            for (const roomClient of this.clients) {
                if (roomClient !== client) {
                    roomClient.emit('playerJoined', player.toJSON());
                }
            }
        }
    }

    leave (client) {
        if (this.gameStarted) {
            const player = this.network.getPlayerByClient(client);

            for (const roomClient of this.clients) {
                if (roomClient !== client) {
                    roomClient.emit('playerLeft', player.id);
                }
            }

            this.game.removePlayer(player);
            this.network.removeClientPlayer(client);
        }

        this.clients.delete(client);
        client.currentRoom = null;
    }

    get size () {
        return this.clients.size;
    }

    startGame () {
        for (const client of this.clients) {
            const player = new Player(uuid.v4(), client.name);

            this.game.addPlayer(player);
            this.network.addClientPlayer(client, player);
        }

        for (const client of this.clients) {
            const state = {
                serverTime: this.game.local_time,
                players: Array.from(this.game.players).filter(player => {
                    return this.network.getPlayerByClient(client) !== player;
                }).map(player => player.toJSON()),
                ownPlayer: this.network.getPlayerByClient(client).toJSON()
            };

            log('starting game state', JSON.stringify(state, null, 4));

            client.emit('startGame', state);
        }


        this.gameStarted = true;
    }

    endGame () {
        if (this.game) {
            this.game.stop();
            this.game = null;
            this.network = null;
            this.gameStarted = false;
        }

        this.clients.clear();
    }

    toJSON () {
        return {
            id: this.id,
            size: this.size,
            users: Array.from(this.clients).map(client => {
                return {
                    id: client.id,
                    name: client.name
                };
            })
        };
    }
}

module.exports = Room;
