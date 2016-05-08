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

    const gameServer = GameServer.create(config, clients);

    io.sockets.on('connection', function (socket) {
        socket.on('register', (data) => {
            const client = new Client(socket, data.name);

            clients.set(client.id, client);

            client.on('clientPing', (data) => {
                client.emit('serverPing', data);
            });

            client.emit('onConnected', {
                user: client.toJSON(),
                rooms: Array.from(gameServer.rooms.values()).map(room => {
                    return room.toJSON();
                })
            });

            client.on('joinRoom', (data) => {
                const room = gameServer.rooms.get(data.roomId);

                if (room && !client.currentRoom) {
                    room.join(client);

                    client.emit('onJoinedRoom', { room: room.toJSON() });
                }
            });

            client.on('leaveRoom', (data) => {
                const room = gameServer.rooms.get(data.roomId);

                if (room) {
                    room.leave(client);

                    if (room.size === 0) {
                        gameServer.endGame(room.id);
                    }

                    client.emit('onLeftRoom', { room: room.toJSON() });
                }
            });

            client.on('createRoom', () => {
                gameServer.createGame(client);
            });

            log('\t socket.io:: player ' + client.id + ' connected');

            client.on('message', (message) => {
                gameServer.onMessage(client, message);
            });

            client.on('disconnect', function () {
                log('\t socket.io:: client disconnected ' + client.id);

                if (client.currentRoom) {
                    if (client.currentRoom.size === 1) {
                        gameServer.endGame(client.currentRoom.id);
                    }

                    client.emit('onLeftRoom', { room: client.currentRoom.toJSON() });

                    client.currentRoom.leave(client);
                }

                clients.delete(client.id);
            });


            client.on('error', (err) => {
                log('Client error', err);
            });
        });
    });
}

start();
