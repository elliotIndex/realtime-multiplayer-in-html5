'use strict';

const uuid = require('node-uuid');

class Client {
    constructor (socket) {
        this.id = uuid.v1();
        this.socket = socket;
        this.currentRoom = null;
    }

    emit (event, data) {
        this.socket.emit(event, data);
    }

    on (event, listener) {
        this.socket.on(event, listener);
    }

    send (message) {
        this.socket.send(message);
    }

    toJSON () {
        return {
            id: this.id,
            currentRoom: this.currentRoom ? this.currentRoom.toJSON() : null
        };
    }
}

module.exports = Client;
