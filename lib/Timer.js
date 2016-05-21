'use strict';

function Timer ({ interval }) {
    const previous = Date.now();
    let intervalId = null;
    let time = 0;

    function start () {
        intervalId = setInterval(() => {
            const delta = Date.now() - previous;

            time += delta;
        }, interval);
    }

    function stop () {
        clearInterval(intervalId);
        time = 0;
    }

    function getTime () {
        return time;
    }

    function setTime (value) {
        time = value;
    }

    return Object.freeze({
        start,
        stop,
        getTime,
        setTime
    });
}

module.exports = { create: Timer };
