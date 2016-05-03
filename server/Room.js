'use strict';

const uuid = require('node-uuid');

class Room {
    constructor (host) {
        this.id = uuid.v1();
        this.host = host;
        this.clients = new Set();
        this.clients.add(host);

        host.currentRoom = this;

        this.game = null;

        this.player_host = host;
    }

    send (message, excludeClients = []) {
        for (const client of this.clients) {
            if (!excludeClients.includes(client)) {
                client.send(message);
            }
        }
    }

    join (client) {
        this.clients.add(client);
        client.currentRoom = this;

        this.player_client = client;
        this.game.players.other.instance = client;
    }

    leave (client) {
        this.clients.delete(client);
        client.currentRoom = null;
    }

    get size () {
        return this.clients.size;
    }

    startGame () {
        // right so a game has 2 players and wants to begin
        // the host already knows they are hosting,
        // tell the other client they are joining a game
        // s=server message, j=you are joining, send them the host id
        this.player_client.send('s.j.' + this.player_host.id);
        this.player_client.game = this.game;

        // now we tell both that the this.game is ready to start
        // clients will reset their positions in this case.
        this.player_client.send('s.r.' + this.game.local_time.toString().replace('.', '-'));
        this.player_host.send('s.r.' + this.game.local_time.toString().replace('.', '-'));

        // set this flag, so that the update loop can run it.
        this.game.active = true;
    }

    endGame () {
        if (this.game) {
            this.game.stop();
            this.game = null;
        }
    }
}

module.exports = Room;
