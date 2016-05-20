'use strict';

const uuid = require('node-uuid');
const protectObject = require('../protect-object');

function EventSystem ({ onDispatch } = {}) {
    const events = new Map();

    function dispatch (name, event, firedBy) {
        if (!event.id) {
            event.id = uuid.v4();
        }

        if (!events.has(event.id)) {
            event.name = name;
            event.firedBy = firedBy;
            events.set(event.id, event);
            event.dispatch();

            if (typeof onDispatch === 'function') {
                onDispatch(event);
            }
        }
    }

    function update (delta) {
        for (const event of events.values()) {
            if (!event.isDone) {
                event.update(delta);
            }
        }
    }

    return Object.freeze({
        dispatch,
        update
    });
}

module.exports = { create: protectObject(EventSystem) };
