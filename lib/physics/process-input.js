'use strict';

const fixedNumber = require('../fixed-number');

function processInput (player, bulletSystem, delta) {
    let xDir = 0;
    let yDir = 0;
    const ic = player.inputs.length;

    if (ic) {
        for (let j = 0; j < ic; ++j) {
            // don't process ones we already have simulated locally
            if (player.inputs[j].seq > player.last_input_seq) {
                const input = player.inputs[j].inputs;
                const c = input.length;

                for (let i = 0; i < c; ++i) {
                    const key = input[i];

                    if (key === 'l') {
                        xDir -= 1;
                    }
                    if (key === 'r') {
                        xDir += 1;
                    }
                    if (key === 'd') {
                        yDir += 1;
                    }
                    if (key === 'u') {
                        yDir -= 1;
                    }
                    if (key === 'f') {
                        bulletSystem.fireBullet(player);
                    }
                }
            }
        }
    }

    // we have a direction vector now, so apply the same physics as the client
    const resultingVector = {
        x: fixedNumber(xDir * (player.speed * (delta / 1000)), 3),
        y: fixedNumber(yDir * (player.speed * (delta / 1000)), 3)
    };

    if (player.inputs.length > 0) {
        // we can now clear the array since these have been processed
        player.last_input_time = player.inputs[ic - 1].time;
        player.last_input_seq = player.inputs[ic - 1].seq;
    }

    return resultingVector;
}

module.exports = processInput;
