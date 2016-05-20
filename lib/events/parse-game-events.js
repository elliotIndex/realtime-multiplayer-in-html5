'use strict';

const TimedEvent = require('./TimedEvent');

function parse (dispatch, eventData) {
    const player = eventData.firedBy;

    if (eventData.name === 'reload') {
        if (!player.isReloading()) {
            dispatch(TimedEvent.create({
                id: eventData.id,
                name: 'reload',
                firedBy: player,
                duration: 500,
                onDispatch: () => {
                    player.setReloading(true);
                },
                onDone: () => {
                    player.setReloading(false);
                }
            }), player);
        }
    }
}

module.exports = parse;
