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
                serverTime: game.local_time
            };

            // Send the snapshot to the 'host' player
            for (const player of game.players) {
                if (playerClients.has(player)) {
                    state.ownPlayer = player.toJSON();
                    state.players = Array.from(game.players.values()).filter(p => {
                        return p !== player;
                    });

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
        getPlayerByClient (client) {
            return clientPlayers.get(client);
        },
        getClientByPlayer (player) {
            return playerClients.get(player);
        },
        addClientPlayer,
        removeClientPlayer,
        sendUpdates,
        receiveClientInput
    };
}

module.exports = network;
