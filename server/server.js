'use strict';

const ServerGame = require('./ServerGame');
const Room = require('./Room');

const debug = require('debug');
const log = debug('game:server/server');

function Lobby (config, clients) {
    const rooms = new Map();

    function startGame (room) {
        room.startGame();
    }

    function onInput (client, parts) {
        const input_commands = parts[1].split('-');
        const input_time = parts[2].replace('-', '.');
        const input_seq = parts[3];

        const room = client.getCurrentRoom();

        if (room && room.isGameStarted()) {
            room.receiveClientInput(client, input_commands, input_time, input_seq);
        } else {
            log('no room to receive input');
        }
    }

    function onMessage (client, message) {
        const message_parts = message.split('.');
        // The first is always the type of message
        const message_type = message_parts[0];

        if (message_type === 'i') {
            // Input handler will forward this
            onInput(client, message_parts);
        }
    }

    function createGame (client) {
        const room = Room.create({
            owner: client,
            game: ServerGame.create({ options: config })
        });

        rooms.set(room.getId(), room);
        client.setCurrentRoom(room);

        client.emit('onJoinedRoom', { room: room.toJSON() });

        startGame(room);

        log('player ' + client.getId() + ' created a room with id ' + room.getId());

        for (const lobbyClient of clients.values()) {
            lobbyClient.emit('roomCreated', { room: room.toJSON() });
        }
    }

    // we are requesting to kill a game in progress.
    function endGame (roomId) {
        const room = rooms.get(roomId);

        if (room) {
            // stop the game updates immediate
            room.endGame();

            for (const lobbyClient of clients.values()) {
                lobbyClient.emit('roomDeleted', { roomId });
                lobbyClient.send('s.e');
            }

            rooms.delete(roomId);

            log('game removed. there are now ' + rooms.getSize() + ' rooms');
        } else {
            log('that game was not found!');
        }
    }

    return {
        onMessage,
        startGame,
        endGame,
        createGame,
        onInput,
        rooms
    };
}

module.exports = { create: Lobby };
