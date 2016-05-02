'use strict';

const COLOR = 'rgba(255,255,255,0.1)';
const INFO_COLOR = 'rgba(255,255,255,0.1)';

function draw (ctx, player, options = {}) {
    // Set the color for this player
    ctx.fillStyle = options.color || COLOR;

    // Draw a rectangle for us
    const x = player.pos.x - player.size.hx;
    const y = player.pos.y - player.size.hy;
    const width = player.size.x;
    const height = player.size.y;

    ctx.fillRect(x, y, width, height);

    // Draw a status update
    const infoColor = options.infoColor || INFO_COLOR;

    ctx.fillStyle = infoColor;

    const stateText = options.stateText || '';

    ctx.fillText(stateText, player.pos.x + 10, player.pos.y + 4);
}

module.exports = draw;
