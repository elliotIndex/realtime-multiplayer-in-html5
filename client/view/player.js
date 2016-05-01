'use strict';

function draw (ctx, player) {
    // Set the color for this player
    ctx.fillStyle = player.color;

    // Draw a rectangle for us
    const x = player.pos.x - player.size.hx;
    const y = player.pos.y - player.size.hy;
    const width = player.size.x;
    const height = player.size.y;

    ctx.fillRect(x, y, width, height);

    // Draw a status update
    ctx.fillStyle = player.info_color;
    ctx.fillText(player.state, player.pos.x + 10, player.pos.y + 4);
}

module.exports = draw;
