'use strict';

const TimedEvent = require('./timed-event');

function parse (game, eventData) {
    const player = eventData.firedBy;

    if (eventData.name === 'reload') {
        if (!player.isReloading) {
            game.eventSystem.addEvent('reload', TimedEvent(500, () => {
                player.isReloading = true;
            }, () => {
                player.isReloading = false;
            }), player);
        }
    }
}

module.exports = parse;
