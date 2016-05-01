'use strict';

const drawPlayer = require('./player');
const drawInfo = require('./info');

function renderer (ctx, options = {}) {
    function draw (game) {
        ctx.clearRect(0, 0, 720, 480);

        drawInfo(ctx, game);

        drawPlayer(ctx, game.players.self);
        drawPlayer(ctx, game.players.other);

        if (options.show_dest_pos && !options.naive_approach) {
            drawPlayer(ctx, game.ghosts.pos_other);
        }

        if (options.show_server_pos && !options.naive_approach) {
            drawPlayer(ctx, game.ghosts.server_pos_self);
            drawPlayer(ctx, game.ghosts.server_pos_other);
        }
    }

    return {
        draw
    };
}

module.exports = renderer;
