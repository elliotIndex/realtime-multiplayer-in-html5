'use strict';

function TimedEvent (duration, onDispatch, onDone) {
    let isDispatched = false;
    let isDone = false;
    let time = 0;

    function reset () {
        time = 0;
        isDone = false;
        isDispatched = false;
    }

    function update (delta) {
        if (time >= duration && !isDone) {
            isDone = true;

            onDone();
        } else if (!isDone) {
            time += delta;
        }
    }

    function dispatch (...args) {
        if (!isDispatched) {
            onDispatch(...args);
        }
    }

    return {
        update,
        dispatch,
        reset
    };
}

module.exports = TimedEvent;
