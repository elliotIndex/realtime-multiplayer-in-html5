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
            const client = Client.create({
                name: data.name,
                socket
            });

            clients.set(client.getId(), client);

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

                if (room && !client.isInRoom()) {
                    room.join(client);
                    client.setCurrentRoom(room);

                    client.emit('onJoinedRoom', { room: room.toJSON() });

                    log('client joined room');
                }
            });

            client.on('leaveRoom', (data) => {
                const room = gameServer.rooms.get(data.roomId);

                if (room) {
                    room.leave(client);
                    client.setCurrentRoom(null);

                    if (room.size === 0) {
                        gameServer.endGame(room.id);
                    }

                    client.emit('onLeftRoom', { room: room.toJSON() });
                }
            });

            client.on('createRoom', () => {
                gameServer.createGame(client);
            });

            log('\t socket.io:: player ' + client.getId() + ' connected');

            client.on('message', (message) => {
                gameServer.onMessage(client, message);
            });

            client.on('disconnect', function () {
                log('\t socket.io:: client disconnected ' + client.getId());

                const room = client.getCurrentRoom();

                if (room) {
                    if (room.size === 1) {
                        gameServer.endGame(room.id);
                    }

                    client.emit('onLeftRoom', { room: room.toJSON() });

                    room.leave(client);
                    client.setCurrentRoom(null);
                }

                clients.delete(client.getId());
            });


            client.on('error', (err) => {
                log('Client error', err);
            });
        });
    });
}

start();
