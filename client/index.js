'use strict';

const GameClient = require('./game');
const Renderer = require('./view');
const debugView = require('./view/debug');
const DEBUG = true;
const clientConfig = require('./client-config');
const gameConfig = require('../lib/game-config');
const Player = require('../lib/Player');

window.onload = function () {
    // Create our game client instance.
    const game = new GameClient(Object.assign({}, gameConfig, clientConfig));

    const canvas = {};

    // Fetch the viewport
    canvas.viewport = document.getElementById('viewport');

    // Adjust their size
    canvas.viewport.width = gameConfig.world.width;
    canvas.viewport.height = gameConfig.world.height;

    // Fetch the rendering contexts
    canvas.ctx = canvas.viewport.getContext('2d');

    // Set the draw style for the font
    canvas.ctx.font = '11px "Helvetica"';

    const renderer = Renderer(canvas.ctx, game.options);

    if (DEBUG) {
        debugView(game);
    }

    // Finally, start the loop

    const localPlayer = new Player('local');

    game.addPlayer(localPlayer);
    game.setLocalPlayer(localPlayer);

    game.start(renderer);
};
