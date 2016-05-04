'use strict';

function network () {
    const playerClients = new Map();
    const clientPlayers = new Map();

    function addClientPlayer (client, player) {
        playerClients.set(player, client);
        clientPlayers.set(client, player);
    }

    function removeClientPlayer (client) {
        const player = clientPlayers.get(client);

        clientPlayers.delete(client);
        playerClients.delete(player);
    }

    function sendUpdates (game) {
        // Make a snapshot of the current state, for updating the clients
        const players = Array.from(game.players.values());

        if (players.length > 1) {
            const state = {
                hp: players[0].pos,               // 'host position', the game creators position
                cp: players[1].pos,              // 'client position', the person that joined, their position
                his: players[0].last_input_seq,    // 'host input sequence', the last input we processed for the host
                cis: players[1].last_input_seq,   // 'client input sequence', the last input we processed for the client
                t: game.local_time                      // our current local time on the server
            };

            // Send the snapshot to the 'host' player
            for (const player of game.players) {
                if (playerClients.has(player)) {
                    playerClients.get(player).emit('onserverupdate', state);
                }
            }
        }
    }

    function receiveClientInput (client, input, inputTime, inputSeq) {
        const player = clientPlayers.get(client);

        // Store the input on the player instance for processing in the physics loop
        player.inputs.push({
            inputs: input,
            time: inputTime,
            seq: inputSeq
        });
    }

    return {
        addClientPlayer,
        removeClientPlayer,
        sendUpdates,
        receiveClientInput
    };
}

module.exports = network;
