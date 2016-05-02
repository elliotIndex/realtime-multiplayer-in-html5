'use strict';

const SocketServer = require('socket.io');
const GameServer = require('./server');

const serverConfig = require('./server-config');
const gameConfig = require('../lib/game-config');

const express = require('express');
const uuid = require('node-uuid');
const http = require('http');
const app = express();


function start () {
    const config = Object.assign({}, gameConfig, serverConfig);
    const server = http.createServer(app);

    server.listen(config.port);

    const io = new SocketServer();

    io.listen(server);

    console.log('\t :: Express :: Listening on port ' + config.port);

    // Enter the game server code. The game server handles
    // client connections looking for a game, creating games,
    // leaving games, joining games and ending games when they leave.
    const game_server = GameServer.create(config);

    // Socket.io will call this function when a client connects,
    // So we can send that client looking for a game to play,
    // as well as give that client a unique ID to use so we can
    // maintain the list if players.
    io.sockets.on('connection', function (client) {
        client.userid = uuid();

        // tell the player they connected, giving them their id
        client.emit('onconnected', { id: client.userid });

        // now we can find them a game to play with someone.
        // if no game exists with someone waiting, they create one and wait.
        game_server.findGame(client);

        // Useful to know when someone connects
        console.log('\t socket.io:: player ' + client.userid + ' connected');

        // Now we want to handle some of the messages that clients will send.
        // They send messages here, and we send them to the game_server to handle.
        client.on('message', (message) => {
            game_server.onMessage(client, message);
        });

        // When this client disconnects, we want to tell the game server
        // about that as well, so it can remove them from the game they are
        // in, and make sure the other player knows that they left and so on.
        client.on('disconnect', function () {
            // Useful to know when soomeone disconnects
            console.log('\t socket.io:: client disconnected ' + client.userid + ' ' + client.game_id);

            // If the client was in a game, set by game_server.findGame,
            // we can tell the game server to update that game state.
            if (client.game && client.game.id) {
                // player leaving a game should destroy that game
                game_server.endGame(client.game.id, client.userid);
            }
        });
    });
}

start();
