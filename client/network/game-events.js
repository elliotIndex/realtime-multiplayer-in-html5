'use strict';

const clientPrediction = require('./client-prediction');
const Player = require('../../lib/Player');
const Vector = require('../../lib/vector');

function networkClientEvents (game, socket) {
    function onHostGame (data) {
        // The server sends the time when asking us to host, but it should be a new game.
        // so the value will be really small anyway (15 or 16ms)
        const serverTime = Number.parseFloat(data.replace('-', '.'));

        // Get an estimate of the current time on the server
        game.local_time = serverTime + game.net_latency;

        // Set the flag that we are hosting, this helps us position respawns correctly
        game.localPlayer.host = true;

        // Update debugging information to display state
        game.localPlayer.state = 'hosting.waiting for a player';
        game.localPlayer.info_color = '#cc0000';
    }

    function onJoinGame () {
        // We are not the host
        game.localPlayer.host = false;
        // Update the local state
        game.localPlayer.state = 'connected.joined.waiting';
        game.localPlayer.info_color = '#00bb00';
    }

    function onColorChange (data) {
        const split = data.split('_');
        const color = split[0];
        const playerId = split[1];

        const player = game.getPlayerById(playerId);

        if (player) {
            player.color = color;
        }
    }

    return {
        onHostGame,
        onJoinGame,
        onColorChange
    };
}

function networkGameEvents (game, socket) {
    const clientEvents = networkClientEvents(game, socket);

    function onConnect () {
        game.localPlayer.state = 'connecting';
    }

    function onStartGame (data) {
        const serverTime = data.serverTime;

        game.local_time = serverTime + game.net_latency;

        console.log('server time is about ' + game.local_time);

        game.clearPlayers(); // FIXME hacky

        for (const playerData of data.players) {
            const player = new Player(playerData.id);

            player.pos = Vector.copy(playerData.position);

            player.info_color = '#cc8822';
            player.state = 'local_pos(joined)';

            game.addPlayer(player);
        }

        const localPlayer = new Player(data.ownPlayer.id);

        localPlayer.color = '#cc8822';
        localPlayer.info_color = '#2288cc';
        localPlayer.state = 'local_pos(hosting)'; // FIXME label not correct
        localPlayer.pos = Vector.copy(data.ownPlayer.position);

        game.addPlayer(localPlayer);
        game.setLocalPlayer(localPlayer);

        // Make sure colors are synced up
        socket.send('c.' + game.localPlayer.color);
    }

    function onConnected (data) {
        // The server responded that we are now in a game,
        // this lets us store the information about ourselves and set the colors
        // to show we are now ready to be playing.
        game.localPlayer.id = data.id;
        game.localPlayer.info_color = '#cc0000';
        game.localPlayer.state = 'connected';
        game.localPlayer.online = true;
    }

    function onServerUpdate (data) {
        // Store the server time (game is offset by the latency in the network, by the time we get it)
        game.server_time = data.serverTime;

        // Update our local offset time from the last server update
        game.client_time = game.server_time - (game.options.net_offset / 1000);

        // One approach is to set the position directly as the server tells you.
        // This is a common mistake and causes somewhat playable results on a local LAN, for example,
        // but causes terrible lag when any ping/latency is introduced. The player can not deduce any
        // information to interpolate with so it misses positions, and packet loss destroys this approach
        // even more so. See 'the bouncing ball problem' on Wikipedia.
        if (game.options.naive_approach) {
            game.localPlayer.pos = Vector.copy(data.ownPlayer.position);

            for (const playerData of data.players) {
                const player = game.getPlayerById(playerData.id);

                player.pos = Vector.copy(playerData.position);
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
            if (game.server_updates.length > 0) {
                clientPrediction(game);

                const delta = game.options.simulationTimestemp;

                // Now we reapply all the inputs that we have locally that
                // the server hasn't yet confirmed. This will 'keep' our position the same,
                // but also confirm the server position at the same time.
                game.updatePhysics(delta);
            }
        }
    }

    function onDisconnect () {
        // When we disconnect, we don't know if the other player is
        // connected or not, and since we aren't, everything goes to offline
        game.localPlayer.info_color = 'rgba(255,255,255,0.1)';
        game.localPlayer.state = 'not-connected';
        game.localPlayer.online = false;

        for (const player of game.players.values()) {
            if (player !== game.localPlayer) {
                game.removePlayer(player.id);
            }
        }
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
        onStartGame,
        onMessage,
        onConnect,
        onConnected,
        onDisconnect,
        onServerUpdate
    };
}

module.exports = networkGameEvents;
