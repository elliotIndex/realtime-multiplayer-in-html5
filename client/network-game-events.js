'use strict';

const Vector = require('../lib/vector');

function networkClientEvents (game, socket) {
    function onHostGame (data) {
        // The server sends the time when asking us to host, but it should be a new game.
        // so the value will be really small anyway (15 or 16ms)
        const serverTime = Number.parseFloat(data.replace('-', '.'));

        // Get an estimate of the current time on the server
        game.local_time = serverTime + game.net_latency;

        // Set the flag that we are hosting, this helps us position respawns correctly
        game.players.self.host = true;

        // Update debugging information to display state
        game.players.self.state = 'hosting.waiting for a player';
        game.players.self.info_color = '#cc0000';

        // Make sure we start in the correct place as the host.
        game.client_reset_positions();
    }

    function onJoinGame () {
        // We are not the host
        game.players.self.host = false;
        // Update the local state
        game.players.self.state = 'connected.joined.waiting';
        game.players.self.info_color = '#00bb00';

        // Make sure the positions match servers and other clients
        game.client_reset_positions();
    }

    function onColorChange (data) {
        game.players.other.color = data;
    }

    function onReadyGame (data) {
        const server_time = Number.parseFloat(data.replace('-', '.'));
        const player_host = game.players.self.host ? game.players.self : game.players.other;
        const player_client = game.players.self.host ? game.players.other : game.players.self;

        game.local_time = server_time + game.net_latency;

        console.log('server time is about ' + game.local_time);

        // Store their info colors for clarity. server is always blue
        player_host.info_color = '#2288cc';
        player_client.info_color = '#cc8822';

        // Update their information
        player_host.state = 'local_pos(hosting)';
        player_client.state = 'local_pos(joined)';

        // Make sure colors are synced up
        socket.send('c.' + game.players.self.color);
    }

    return {
        onHostGame,
        onJoinGame,
        onColorChange,
        onReadyGame
    };
}

function networkGameEvents (game, socket) {
    const clientEvents = networkClientEvents(game, socket);

    function onConnect () {
        game.players.self.state = 'connecting';
    }

    function onConnected (data) {
        // The server responded that we are now in a game,
        // this lets us store the information about ourselves and set the colors
        // to show we are now ready to be playing.
        game.players.self.id = data.id;
        game.players.self.info_color = '#cc0000';
        game.players.self.state = 'connected';
        game.players.self.online = true;
    }

    function onServerUpdate (data) {
        // Lets clarify the information we have locally. One of the players is 'hosting' and
        // the other is a joined in client, so we name these host and client for making sure
        // the positions we get from the server are mapped onto the correct local sprites
        const player_host = game.players.self.host ? game.players.self : game.players.other;
        const player_client = game.players.self.host ? game.players.other : game.players.self;

        // Store the server time (game is offset by the latency in the network, by the time we get it)
        game.server_time = data.t;
        // Update our local offset time from the last server update
        game.client_time = game.server_time - (game.options.net_offset / 1000);

        // One approach is to set the position directly as the server tells you.
        // This is a common mistake and causes somewhat playable results on a local LAN, for example,
        // but causes terrible lag when any ping/latency is introduced. The player can not deduce any
        // information to interpolate with so it misses positions, and packet loss destroys this approach
        // even more so. See 'the bouncing ball problem' on Wikipedia.
        if (game.options.naive_approach) {
            if (data.hp) {
                player_host.pos = Vector.copy(data.hp);
            }

            if (data.cp) {
                player_client.pos = Vector.copy(data.cp);
            }
        } else {
            // Cache the data from the server,
            // and then play the timeline
            // back to the player with a small delay (net_offset), allowing
            // interpolation between the points.
            game.server_updates.push(data);

            // we limit the buffer in seconds worth of updates
            // 60fps*buffer seconds = number of samples
            if (game.server_updates.length >= (60 * game.options.buffer_size)) {
                game.server_updates.splice(0, 1);
            }

            // Handle the latest positions from the server
            // and make sure to correct our local predictions, making the server have final say.
            game.client_process_net_prediction_correction();
        }
    }

    function onDisconnect () {
        // When we disconnect, we don't know if the other player is
        // connected or not, and since we aren't, everything goes to offline
        game.players.self.info_color = 'rgba(255,255,255,0.1)';
        game.players.self.state = 'not-connected';
        game.players.self.online = false;

        game.players.other.info_color = 'rgba(255,255,255,0.1)';
        game.players.other.state = 'not-connected';
    }

    function onMessage (message) {
        const commands = message.split('.');
        const command = commands[0];
        const subcommand = commands[1] || null;
        const commanddata = commands[2] || null;

        switch (command) {
            case 's': {
                switch (subcommand) {
                    case 'h': // host a game requested
                        clientEvents.onHostGame(commanddata);

                        break;
                    case 'j': // join a game requested
                        clientEvents.onJoinGame(commanddata);

                        break;
                    case 'r': // ready a game requested
                        clientEvents.onReadyGame(commanddata);

                        break;
                    case 'e': // end game requested
                        onDisconnect(commanddata);

                        break;
                    case 'c': // other player changed colors
                        clientEvents.onColorChange(commanddata);

                        break;
                }
                break;
            }
        }
    }

    return {
        onMessage,
        onConnect,
        onConnected,
        onDisconnect,
        onServerUpdate
    };
}

module.exports = networkGameEvents;
