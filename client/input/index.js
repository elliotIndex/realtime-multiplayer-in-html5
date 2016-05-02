'use strict';

function inputHandler () {
    const keyboard = new THREEx.KeyboardState();

    function getInput () {
        // This takes input from the client and keeps a record,
        // It also sends the input information to the server immediately
        // as it is pressed. It also tags each input with a sequence number.
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
