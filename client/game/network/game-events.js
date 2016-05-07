'use strict';

const clientPrediction = require('./client-prediction');
const Player = require('../../../lib/Player');
const Vector = require('../../../lib/vector');

function networkGameEvents (game) {
    function onStartGame (data) {
        const serverTime = data.serverTime;

        game.local_time = serverTime + game.net_latency;

        console.log('server time is about ' + game.local_time);

        game.clearPlayers();

        for (const playerData of data.players) {
            const player = new Player(playerData.id);

            player.pos = Vector.copy(playerData.position);

            game.addPlayer(player);
        }

        const localPlayer = new Player(data.ownPlayer.id);

        localPlayer.pos = Vector.copy(data.ownPlayer.position);

        game.addPlayer(localPlayer);
        game.setLocalPlayer(localPlayer);
    }

    function onPlayerJoined (playerData) {
        const player = new Player(playerData.id);

        player.pos = Vector.copy(playerData.position);

        game.addPlayer(player);
    }

    function onPlayerLeft (playerId) {
        game.removePlayer(playerId);
        console.log('player left with id', playerId);
    }

    function onServerUpdate (data) {
        // Store the server time (game is offset by the latency in the network, by the time we get it)
        game.server_time = data.serverTime;

        // Update our local offset time from the last server update
        game.client_time = game.server_time - (game.options.networkOffset / 1000);

        // One approach is to set the position directly as the server tells you.
        // This is a common mistake and causes somewhat playable results on a local LAN, for example,
        // but causes terrible lag when any ping/latency is introduced. The player can not deduce any
        // information to interpolate with so it misses positions, and packet loss destroys this approach
        // even more so. See 'the bouncing ball problem' on Wikipedia.
        if (game.options.naiveApproach) {
            game.localPlayer.pos = Vector.copy(data.ownPlayer.position);

            for (const playerData of data.players) {
                const player = game.getPlayerById(playerData.id);

                player.pos = Vector.copy(playerData.position);
            }
        } else {
            // Cache the data from the server,
            // and then play the timeline
            // back to the player with a small delay (networkOffset), allowing
            // interpolation between the points.
            game.server_updates.push(data);

            // we limit the buffer in seconds worth of updates
            // 60fps*buffer seconds = number of samples
            if (game.server_updates.length >= (60 * game.options.networkBufferSize)) {
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
        for (const player of game.players.values()) {
            if (player !== game.localPlayer) {
                game.removePlayer(player.id);
            }
        }
    }

    return {
        onStartGame,
        onPlayerJoined,
        onPlayerLeft,
        onDisconnect,
        onServerUpdate
    };
}

module.exports = networkGameEvents;
