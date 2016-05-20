'use strict';

const uuid = require('node-uuid');

function Player ({ id, name, x = 0, y = 0, width = 16, height = 16, speed = 50 }) {
    const position = { x, y };
    const previousState = {
        position: { x, y }
    };

    let reloading = false;
    let inputs = [];
    let lastInputSeq = 0;

    function getLastInputSeq () {
        return lastInputSeq;
    }

    function setLastInputSeq (value) {
        lastInputSeq = value;
    }

    function getId () {
        return id;
    }

    function getName () {
        return name;
    }

    function setPosition (x, y) {
        position.x = x;
        position.y = y;
    }

    function getPosition () {
        return Object.assign({}, position);
    }

    function setSpeed (newSpeed) {
        speed = newSpeed;
    }

    function pushInput (input) {
        inputs.push(input);
    }

    function getInputs () {
        return inputs;
    }

    function getSpeed () {
        return speed;
    }

    function getWidth () {
        return width;
    }

    function getHeight () {
        return height;
    }

    function clearInputs (numberToClear) {
        if (typeof numberToClear === 'undefined') {
            inputs = [];
        } else {
            inputs.splice(0, numberToClear);
        }
    }

    function setReloading (value) {
        reloading = value;
    }

    function isReloading () {
        return reloading;
    }

    function setPreviousState (state) {
        Object.assign(previousState, state);
    }

    function getPreviousState () {
        return Object.assign({}, previousState);
    }

    function toJSON () {
        return {
            id,
            name,
            lastInputSeq,
            position: Object.assign({}, position),
        };
    }

    return Object.freeze({
        getId,
        getName,
        getPosition,
        getSpeed,
        pushInput,
        getInputs,
        getWidth,
        getHeight,
        setLastInputSeq,
        getLastInputSeq,
        getPreviousState,
        setPosition,
        setSpeed,
        setReloading,
        isReloading,
        setPreviousState,
        clearInputs,
        toJSON
    });
}

module.exports = { create: Player };
