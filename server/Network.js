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

    function sendUpdates (state) {
        for (const player of state.players) {
            if (playerClients.has(player)) {
                const playerState = Object.assign({}, state, {
                    ownPlayer: player.toJSON(),
                    players: state.players.filter((p) => p !== player),
                    bullets: state.bullets.filter((bullet) => {
                        return bullet.firedBy !== player;
                    }).map((bullet) => {
                        return Object.assign({}, bullet, {
                            firedBy: bullet.firedBy.getId()
                        });
                    }),
                    events: state.events.filter((event) => {
                        return event.getFiredBy() !== player;
                    }).map((event) => {
                        return {
                            id: event.getId(),
                            name: event.getName(),
                            firedBy: event.getFiredBy().getId()
                        };
                    })
                });

                playerClients.get(player).emit('onServerUpdate', playerState);
            }
        }
    }

    function receiveClientInput (client, input, inputTime, inputSeq) {
        const player = clientPlayers.get(client);

        player.pushInput({
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
