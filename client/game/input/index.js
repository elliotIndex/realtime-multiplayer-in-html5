'use strict';

const KeyboardState = require('./utils/keyboard');

function inputHandler () {
    const keyboard = new KeyboardState();

    function getInput () {
        const inputs = [];

        if (keyboard.pressed('A') || keyboard.pressed('left')) {
            inputs.push('l');
        }

        if (keyboard.pressed('D') || keyboard.pressed('right')) {
            inputs.push('r');
        }

        if (keyboard.pressed('S') || keyboard.pressed('down')) {
            inputs.push('d');
        }

        if (keyboard.pressed('W') || keyboard.pressed('up')) {
            inputs.push('u');
        }

        if (keyboard.pressed('space')) {
            inputs.push('f');
        }

        if (keyboard.pressed('R')) {
            inputs.push('re');
        }

        return inputs;
    }

    return {
        getInput
    };
}

module.exports = inputHandler;
