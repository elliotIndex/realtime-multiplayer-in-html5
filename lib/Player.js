'use strict';

const gameConfig = require('./game-config');

class Player {
    constructor (gameInstance, playerInstance) {
        this.game = gameInstance;
        this.instance = playerInstance;

        // Set up initial values for our state information
        this.pos = { x: 0, y: 0 };
        this.size = {
            x: gameConfig.playerSize.width,
            y: gameConfig.playerSize.height,
            hx: gameConfig.playerSize.width / 2,
            hy: gameConfig.playerSize.height / 2
        };
        this.state = 'not-connected';

        this.id = '';

        // These are used in moving us around later
        this.old_state = {pos:{x:0,y:0}};
        this.cur_state = {pos:{x:0,y:0}};
        this.state_time = new Date().getTime();

        // Our local history of inputs
        this.inputs = [];

        this.speed = 0;
    }
}

module.exports = Player;
