'use strict';

const Player = require('../../lib/Player');

function ClientPlayer ({ id, name, x = 0, y = 0, width = 16, height = 16, speed = 50 }) {
    return Player.create({
        id,
        name,
        x,
        y,
        width,
        height,
        speed
    });
}

module.exports = { create: ClientPlayer };
