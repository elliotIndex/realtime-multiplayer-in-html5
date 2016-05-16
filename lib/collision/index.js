'use strict';

const fixedNumber = require('../../lib/fixed-number');

function collisionHandler (world) {

    function process (player) {
        const positionLimits = {
            xMin: player.width / 2,
            xMax: world.width - (player.width / 2),
            yMin: player.height / 2,
            yMax: world.height - (player.height / 2)
        };

        // Left wall.
        if (player.x <= positionLimits.xMin) {
            player.x = positionLimits.xMin;
        }

        // Right wall
        if (player.x >= positionLimits.xMax) {
            player.x = positionLimits.xMax;
        }

        // Roof wall.
        if (player.y <= positionLimits.yMin) {
            player.y = positionLimits.yMin;
        }

        // Floor wall
        if (player.y >= positionLimits.yMax) {
            player.y = positionLimits.yMax;
        }

        // Fixed point helps be more deterministic
        player.x = fixedNumber(player.x, 4);
        player.y = fixedNumber(player.y, 4);
    }

    return {
        process
    };
}

module.exports = collisionHandler;
