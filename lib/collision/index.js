'use strict';

const fixedNumber = require('../../lib/fixed-number');

function collisionHandler (world) {
    function process (player) {
        const positionLimits = {
            xMin: player.size.hx,
            xMax: world.width - player.size.hx,
            yMin: player.size.hy,
            yMax: world.height - player.size.hy
        };

        // Left wall.
        if (player.pos.x <= positionLimits.xMin) {
            player.pos.x = positionLimits.xMin;
        }

        // Right wall
        if (player.pos.x >= positionLimits.xMax) {
            player.pos.x = positionLimits.xMax;
        }

        // Roof wall.
        if (player.pos.y <= positionLimits.yMin) {
            player.pos.y = positionLimits.yMin;
        }

        // Floor wall
        if (player.pos.y >= positionLimits.yMax) {
            player.pos.y = positionLimits.yMax;
        }

        // Fixed point helps be more deterministic
        player.pos.x = fixedNumber(player.pos.x, 4);
        player.pos.y = fixedNumber(player.pos.y, 4);
    }

    return {
        process
    };
}

module.exports = collisionHandler;
