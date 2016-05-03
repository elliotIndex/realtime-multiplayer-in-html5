'use strict';

function draw (ctx, game) {
    // We don't want this to be too distracting
    ctx.fillStyle = 'rgba(255,255,255,0.3)';

    // Draw some information for the host
    if (game.players.self.host) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('You are the host', 10 , 465);
    }

    // Reset the style back to full white.
    ctx.fillStyle = 'rgba(255,255,255,1)';
}

module.exports = draw;
