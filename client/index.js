'use strict';

const GameClient = require('./game');
const Renderer = require('./view');

window.onload = function(){
    //Create our game client instance.
    const game = new GameClient();

    const canvas = {};

    //Fetch the viewport
    canvas.viewport = document.getElementById('viewport');

    //Adjust their size
    canvas.viewport.width = game.world.width;
    canvas.viewport.height = game.world.height;

    //Fetch the rendering contexts
    canvas.ctx = canvas.viewport.getContext('2d');

    //Set the draw style for the font
    canvas.ctx.font = '11px "Helvetica"';

    //Finally, start the loop
    game.start(canvas);
};
