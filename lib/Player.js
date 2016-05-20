'use strict';

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

    function getLatestInputs () {
        return inputs.filter(input => {
            return input.seq > lastInputSeq;
        });
    }

    function processInputs (delta, onBullet, onEvent) {
        if (inputs.length === 0) {
            return;
        }

        const movement = {
            x: 0,
            y: 0
        };

        for (let j = 0; j < inputs.length; j++) {
            // Don't process ones we already have simulated locally
            if (inputs[j].seq > lastInputSeq) {
                const input = inputs[j].inputs;
                const c = input.length;

                for (let i = 0; i < c; ++i) {
                    const key = input[i];

                    if (key === 'l') {
                        movement.x -= 1;
                    }
                    if (key === 'r') {
                        movement.x += 1;
                    }
                    if (key === 'd') {
                        movement.y += 1;
                    }
                    if (key === 'u') {
                        movement.y -= 1;
                    }
                    if (key === 'f') {
                        onBullet();
                    }
                    if (key === 're') {
                        onEvent('reload');
                    }
                }
            }
        }

        position.x += movement.x * (speed * (delta / 1000));
        position.y += movement.y * (speed * (delta / 1000));

        lastInputSeq = inputs[inputs.length - 1].seq;
    }

    function update (delta, onBullet, onEvent) {
        processInputs(delta, onBullet, onEvent);
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
        getLatestInputs,
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
        update,
        toJSON
    });
}

module.exports = { create: Player };
