'use strict';

const SocketClient = require('socket.io-client');


function network () {
    let socket = null;
    let previousPing = 0.001;
    let netPing = 0.001;
    let netLatency = 0.001;

    function receivePing (data) {
        netPing = new Date().getTime() - Number.parseFloat(data)
        netLatency = netPing / 2;
    }

    function parseMessage (game, message) {
        const commands = message.split('.');
        const command = commands[0];
        const subcommand = commands[1] || null;
        const commanddata = commands[2] || null;

        switch (command) {
            case 's': {
                switch (subcommand) {
                    case 'h': // host a game requested
                        game.client_onhostgame(commanddata);

                        break;
                    case 'j': // join a game requested
                        game.client_onjoingame(commanddata);

                        break;
                    case 'r': // ready a game requested
                        game.client_onreadygame(commanddata);

                        break;
                    case 'e': // end game requested
                        game.client_ondisconnect(commanddata);

                        break;
                    case 'p': // server ping
                        receivePing(commanddata);

                        break;
                    case 'c': // other player changed colors
                        game.client_on_otherclientcolorchange(commanddata);

                        break;
                }
                break;
            }
        }
    }

    function ping () {
        previousPing = new Date().getTime();
        socket.send('p.' + previousPing);
    }

    function listen (game) {
        socket.on('connect', () => {
            game.players.self.state = 'connecting';
        });

        socket.on('disconnect', game.client_ondisconnect.bind(game));

        // Sent each tick of the server simulation. This is our authoritive update
        socket.on('onserverupdate', game.client_onserverupdate_recieved.bind(game));
        // Handle when we connect to the server, showing state and storing id's.
        socket.on('onconnected', game.client_onconnected.bind(game));

        // On error we just show that we are not connected for now. Can print the data.
        socket.on('error', game.client_ondisconnect.bind(game));

        // On message from the server, we parse the commands and send it to the handlers
        socket.on('message', (message) => {
            parseMessage(game, message);
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
            }
        };
    }

    return {
        connect
    };
}

module.exports = network;
