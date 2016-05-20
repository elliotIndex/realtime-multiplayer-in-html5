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

    function sendUpdates ({ players, bulletsFired, eventsFired, time }) {
        for (const player of players.values()) {
            if (playerClients.has(player)) {
                const state = {
                    serverTime: time,
                    ownPlayer: player.toJSON(),
                    players: Array.from(players.values()).filter(p => {
                        return p !== player;
                    }),
                    bullets: bulletsFired.filter((bullet) => {
                        return bullet.firedBy !== player;
                    }).map((bullet) => {
                        return Object.assign({}, bullet, {
                            firedBy: bullet.firedBy.getId()
                        });
                    }),
                    events: eventsFired.filter((event) => {
                        return event.getFiredBy() !== player;
                    }).map((event) => {
                        return {
                            id: event.getId(),
                            name: event.getName(),
                            firedBy: event.getFiredBy().getId()
                        };
                    })
                };

                playerClients.get(player).emit('onServerUpdate', state);
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
