'use strict';

const uuid = require('node-uuid');
const GameNetwork = require('./network');
const Player = require('../lib/Player');

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

    send (message, excludeClients = []) {
        for (const client of this.clients) {
            if (!excludeClients.includes(client)) {
                client.send(message);
            }
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

        this.network.addClientPlayer(client, this.game.players.other);
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
            const player = new Player();

            this.game.addPlayer(player);
            this.network.addClientPlayer(client, player);

            if (client !== this.host) {
                client.send('s.j');
            }

            client.send('s.r.' + this.game.local_time.toString().replace('.', '-'));
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
