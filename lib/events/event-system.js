'use strict';

const uuid = require('node-uuid');

function EventSystem (onEventAdded) {
    const events = new Map();

    function addEvent (name, event, firedBy) {
        if (!event.id) {
            event.id = uuid.v4();
        }

        if (!events.has(event.id)) {
            event.name = name;
            event.firedBy = firedBy;
            events.set(event.id, event);
            event.dispatch();

            if (typeof onEventAdded === 'function') {
                onEventAdded(event);
            }

            return event;
        }
    }

    function update (delta) {
        for (const event of events.values()) {
            if (!event.isDone) {
                event.update(delta);
            }
        }
    }

    return {
        addEvent,
        update
    };
}

module.exports = EventSystem;
