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
    }

    leave (client) {
        this.network.removeClientPlayer(client);
        this.clients.delete(client);
        client.currentRoom = null;
    }

    get size () {
        return this.clients.size;
    }

    startGame () {
        for (const client of this.clients) {
            const player = new Player(uuid.v4());

            this.game.addPlayer(player);
            this.network.addClientPlayer(client, player);

            if (client !== this.host) {
                client.send('s.j');
            }
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
    }
}

module.exports = Room;
