'use strict';

const KeyboardState = require('../../lib/keyboard');

function inputHandler () {
    const keyboard = new KeyboardState();

    function getInput () {
        const input = [];

        if (keyboard.pressed('A') || keyboard.pressed('left')) {
            input.push('l');
        }

        if (keyboard.pressed('D') || keyboard.pressed('right')) {
            input.push('r');
        }

        if (keyboard.pressed('S') || keyboard.pressed('down')) {
            input.push('d');
        }

        if (keyboard.pressed('W') || keyboard.pressed('up')) {
            input.push('u');
        }

        return input;
    }

    return {
        getInput
    };
}

module.exports = inputHandler;
