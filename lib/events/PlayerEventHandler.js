'use strict';

const TimedEvent = require('./TimedEvent');

function PlayerEventHandler ({ eventSystem }) {
    function onEvent (eventData, player) {
        const { id, name } = eventData;

        if (name === 'reload' && !player.isReloading()) {
            eventSystem.dispatch(TimedEvent.create({
                id,
                name,
                firedBy: player,
                duration: 500,
                onDispatch: () => {
                    player.setReloading(true);
                },
                onDone: () => {
                    player.setReloading(false);
                }
            }));
        }
    }

    return Object.freeze({
        onEvent
    });
}

module.exports = { create: PlayerEventHandler };
