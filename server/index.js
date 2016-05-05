'use strict';

const SocketServer = require('socket.io');
const GameServer = require('./server');

const serverConfig = require('./server-config');
const gameConfig = require('../lib/game-config');

const http = require('http');
const Client = require('./Client');
const debug = require('debug');
const log = debug('game:server/index');

function start () {
    const config = Object.assign({}, gameConfig, serverConfig);
    const server = http.createServer();
    const clients = new Map();

    server.listen(config.port);

    const io = SocketServer(server);

    log('Listening on port ' + config.port);

    // Enter the game server code. The game server handles
    // client connections looking for a game, creating games,
    // leaving games, joining games and ending games when they leave.
    const gameServer = GameServer.create(config);

    io.sockets.on('connection', function (socket) {
        const client = new Client(socket);

        clients.set(client.id, client);

        client.on('clientPing', (data) => {
            client.emit('serverPing', data);
        });

        // tell the player they connected, giving them their id
        client.emit('onconnected', { id: client.id });

        // now we can find them a game to play with someone.
        // if no game exists with someone waiting, they create one and wait.
        gameServer.findGame(client);

        // Useful to know when someone connects
        log('\t socket.io:: player ' + client.id + ' connected');

        // Now we want to handle some of the messages that clients will send.
        // They send messages here, and we send them to the gameServer to handle.
        client.on('message', (message) => {
            gameServer.onMessage(client, message);
        });

        // When this client disconnects, we want to tell the game server
        // about that as well, so it can remove them from the game they are
        // in, and make sure the other player knows that they left and so on.
        client.on('disconnect', function () {
            // Useful to know when soomeone disconnects
            log('\t socket.io:: client disconnected ' + client.id);

            // If the client was in a game, set by gameServer.findGame,
            // we can tell the game server to update that game state.
            if (client.currentRoom && client.currentRoom.size === 1) {
                // player leaving a game should destroy that game
                gameServer.endGame(client.currentRoom.id, client);
            } else if (client.currentRoom) {
                client.currentRoom.leave(client);
            }

            clients.delete(client.id);
        });


        client.on('error', (err) => {
            log('Client error', err);
        });
    });
}

start();
