'use strict';

const TimedEvent = require('./timed-event');

function parse (eventSystem, eventData) {
    const player = eventData.firedBy;

    if (eventData.name === 'reload') {
        if (!player.isReloading()) {
            eventSystem.dispatch('reload', TimedEvent(500, () => {
                player.setReloading(true);
            }, () => {
                player.setReloading(false);
            }), player);
        }
    }
}

module.exports = parse;
