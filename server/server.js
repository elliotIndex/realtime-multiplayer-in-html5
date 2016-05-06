'use strict';

const GameCore = require('./game');
const Room = require('./Room');

const debug = require('debug');
const log = debug('game:server/server');

function create (config, clients) {
    const rooms = new Map();

    function startGame (room) {
        room.startGame();
    }

    function onInput (client, parts) {
        // The input commands come in like u-l,
        // so we split them up into separate commands,
        // and then update the players
        const input_commands = parts[1].split('-');
        const input_time = parts[2].replace('-', '.');
        const input_seq = parts[3];

        // the client should be in a game, so
        // we can tell that game to handle the input
        if (client && client.currentRoom && client.currentRoom.gameStarted) {
            client.currentRoom.receiveClientInput(client, input_commands, input_time, input_seq);
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
        const room = new Room(client);

        rooms.set(room.id, room);

        room.setGame(new GameCore(config));

        // room.join(client);

        client.emit('onJoinedRoom', { room: room.toJSON() });

        // Start updating the game loop on the server
        room.game.start();

        log('server host at  ' + room.game.local_time);

        log('player ' + client.id + ' created a room with id ' + room.id);

        startGame(room);

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

            log('game removed. there are now ' + rooms.size + ' rooms');
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

module.exports = { create };
