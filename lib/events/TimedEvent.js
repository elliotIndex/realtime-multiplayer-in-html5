'use strict';

const uuid = require('node-uuid');

function TimedEvent ({ id, firedBy, name, duration, onDispatch, onDone }) {
    id = id || uuid.v4();

    let isDispatched = false;
    let done = false;
    let time = 0;

    function reset () {
        time = 0;
        done = false;
        isDispatched = false;
    }

    function update (delta) {
        if (time >= duration && !done) {
            done = true;

            onDone();
        } else if (!done) {
            time += delta;
        }
    }

    function dispatch (...args) {
        if (!isDispatched) {
            onDispatch(...args);
        }
    }

    function getId () {
        return id;
    }

    function getFiredBy () {
        return firedBy;
    }

    function getName () {
        return name;
    }

    function setName (value) {
        name = value;
    }

    function isDone () {
        return done;
    }

    return Object.freeze({
        getId,
        getFiredBy,
        getName,
        isDone,
        setName,
        update,
        dispatch,
        reset
    });
}

module.exports = { create: TimedEvent };
