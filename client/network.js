'use strict';

const SocketClient = require('socket.io-client');
const NetworkGameEvents = require('./network-game-events');

function network () {
    let socket = null;
    let previousPing = 0.001;
    let netPing = 0.001;
    let netLatency = 0.001;

    function receivePing (message) {
        const commands = message.split('.');
        const pingData = commands[2];

        netPing = new Date().getTime() - Number.parseFloat(pingData);
        netLatency = netPing / 2;
    }

    function ping () {
        previousPing = new Date().getTime();
        socket.send('p.' + previousPing);
    }

    function listen (game) {
        const gameEvents = NetworkGameEvents(game, socket);

        socket.on('connect', gameEvents.onConnect);

        socket.on('disconnect', gameEvents.onDisconnect);

        // Sent each tick of the server simulation. This is our authoritive update
        socket.on('onserverupdate', gameEvents.onServerUpdate);

        // Handle when we connect to the server, showing state and storing id's.
        socket.on('onconnected', gameEvents.onConnected);

        // On error we just show that we are not connected for now. Can print the data.
        socket.on('error', gameEvents.onDisconnect);

        // On message from the server, we parse the commands and send it to the handlers
        socket.on('message', (message) => {
            if (message.substring(0, 3) === 's.p') {
                receivePing(message);
            } else {
                gameEvents.onMessage(message);
            }
        });

        return socket;
    }

    function connect (serverUrl) {
        socket = new SocketClient(serverUrl);

        return {
            listen,
            ping,

            get netPing () {
                return netPing;
            },

            get netLatency () {
                return netLatency;
            },

            send (data) {
                socket.send(data);
            }
        };
    }

    return {
        connect
    };
}

module.exports = network;
