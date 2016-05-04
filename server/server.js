'use strict';

const GameCore = require('./game');
const Room = require('./Room');

const debug = require('debug');
const log = debug('game:server/server');

function create (config) {
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
        } else if (message_type === 'p') {
            client.send('s.p.' + message_parts[1]);
        } else if (message_type === 'c') {    // Client changed their color!
            for (const roomClient of client.currentRoom.clients) {
                if (roomClient !== client) {
                    roomClient.send('s.c.' + message_parts[1]);
                }
            }
        }
    }

    function createGame (client) {
        const room = new Room(client);

        rooms.set(room.id, room);

        room.setGame(new GameCore(config));

        // Start updating the game loop on the server
        room.game.start();

        // tell the eplayer that they are now the host
        // s=server message, h=you are hosting
        client.send('s.h.' + room.game.local_time.toString().replace('.', '-'));
        log('server host at  ' + room.game.local_time);

        log('player ' + client.id + ' created a room with id ' + room.id);
    }

    function findGame (client) {
        log('looking for a game. We have : ' + rooms.size);

        // so there are rooms active,
        // lets see if one needs another player
        if (rooms.size > 0) {
            let joined_a_game = false;

            // Check the list of rooms for an open game
            for (const room of rooms.values()) {
                // If the room is a player short
                if (room.size < 2) {
                    // someone wants us to join!
                    joined_a_game = true;

                    // increase the player count and store
                    // the player as the client of this game
                    room.join(client);

                    // start running the game on the server
                    startGame(room);
                }
            }

            // if we didn't join a game, we must create one
            if (!joined_a_game) {
                createGame(client);
            }
        } else {
            // no rooms? create one!
            createGame(client);
        }
    }

    // we are requesting to kill a game in progress.
    function endGame (roomId, client) {
        const room = rooms.get(roomId);

        if (room) {
            // stop the game updates immediate
            room.endGame();

            // if the game has two players, the one is leaving
            if (room.size > 1) {
                // send the players the message the game is ending
                if (client === room.host) {
                    // the host left. Other players try to join another game
                    for (const otherClient of room.clients) {
                        if (client !== otherClient) {
                            otherClient.send('s.e');

                            // now look for/create a new game.
                            findGame(otherClient);
                        }
                    }
                } else if (room.host) {
                    // Host is leaving, let all other players leave too
                    for (const client of room.clients) {
                        client.send('s.e');

                        room.host.send('s.e');

                        // now look for/create a new game.
                        findGame(client);
                    }
                }
            }

            rooms.delete(roomId);

            log('game removed. there are now ' + rooms.size + ' rooms');
        } else {
            log('that game was not found!');
        }
    }

    return {
        findGame,
        onMessage,
        startGame,
        endGame,
        createGame,
        onInput
    };
}

module.exports = { create };
