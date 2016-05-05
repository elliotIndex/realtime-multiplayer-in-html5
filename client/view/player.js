'use strict';

const COLOR = 'rgba(255,255,255,0.1)';
const INFO_COLOR = 'rgba(255,255,255,0.1)';

function draw (ctx, player, options = {}) {
    // Set the color for this player
    ctx.fillStyle = options.color || COLOR;

    // Draw a rectangle for us
    const x = player.position.x - (player.height / 2);
    const y = player.position.y - (player.height / 2);

    const width = player.width;
    const height = player.height;

    ctx.fillRect(x, y, width, height);

    // Draw a status update
    const infoColor = options.infoColor || INFO_COLOR;

    ctx.fillStyle = infoColor;

    const stateText = options.stateText || '';

    ctx.fillText(stateText, player.position.x + (width / 1.5), player.position.y + (height / 4));
}

module.exports = draw;
