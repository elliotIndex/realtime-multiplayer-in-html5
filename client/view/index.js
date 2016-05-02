'use strict';

const drawPlayer = require('./player');
const drawInfo = require('./info');

function renderer (ctx, options = {}) {
    function draw (game) {
        ctx.clearRect(0, 0, 720, 480);

        drawInfo(ctx, game);

        drawPlayer(ctx, game.players.self, {
            color: game.players.self.color,
            infoColor: game.players.self.info_color,
            stateText: 'YOU ' + game.players.self.state
        });

        drawPlayer(ctx, game.players.other, {
            color: game.players.other.color,
            info_color: game.players.other.info_color,
            stateText: game.players.other.state
        });

        if (options.show_dest_pos && !options.naive_approach) {
            drawPlayer(ctx, game.ghosts.pos_other, {
                stateText: 'dest_pos'
            });
        }

        if (options.show_server_pos && !options.naive_approach) {
            const ghostOptions = {
                stateText: 'server_pos',
                infoColor: 'rgba(255,255,255,0.2)'
            };

            drawPlayer(ctx, game.ghosts.server_pos_self, ghostOptions);

            drawPlayer(ctx, game.ghosts.server_pos_other, ghostOptions);
        }
    }

    return {
        draw
    };
}

module.exports = renderer;
