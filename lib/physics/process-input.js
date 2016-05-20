'use strict';

const parseGameEvent = require('../events/parse-game-events');

function processInput (player, { bulletSystem, eventSystem }, delta) {
    let xDir = 0;
    let yDir = 0;
    const playerInputs = player.getInputs();
    const ic = playerInputs.length;

    if (ic) {
        for (let j = 0; j < ic; ++j) {
            // don't process ones we already have simulated locally
            if (playerInputs[j].seq > player.getLastInputSeq()) {
                const input = playerInputs[j].inputs;
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
                        // bulletSystem.fireBullet(player);
                    }
                    if (key === 're') {
                        // if (!player.isReloading()) {
                        //     parseGameEvent(eventSystem, {
                        //         firedBy: player,
                        //         name: 'reload'
                        //     });
                        // }
                    }
                }
            }
        }
    }

    // we have a direction vector now, so apply the same physics as the client
    const speed = player.getSpeed();
    const resultingVector = {
        x: xDir * (speed * (delta / 1000)),
        y: yDir * (speed * (delta / 1000))
    };

    if (playerInputs.length > 0) {
        player.setLastInputSeq(playerInputs[ic - 1].seq);
    }

    return resultingVector;
}

module.exports = processInput;
