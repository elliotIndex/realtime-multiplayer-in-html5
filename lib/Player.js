'use strict';

const gameConfig = require('./game-config');

class Player {
    constructor (id) {
        this.id = id;
        // Set up initial values for our state information
        this.pos = { x: 0, y: 0 };
        this.size = {
            x: gameConfig.playerSize.width,
            y: gameConfig.playerSize.height,
            hx: gameConfig.playerSize.width / 2,
            hy: gameConfig.playerSize.height / 2
        };
        this.state = 'not-connected';

        // These are used in moving us around later
        this.old_state = { pos: { x: 0, y: 0 } };
        this.cur_state = { pos: { x: 0, y: 0 } };

        // Our local history of inputs
        this.inputs = [];

        this.speed = 0;
    }

    get position () {
        return {
            x: this.pos.x,
            y: this.pos.y
        };
    }

    get width () {
        return this.size.x;
    }

    get height () {
        return this.size.y;
    }

    toJSON () {
        return {
            id: this.id,
            position: this.pos,
            lastInputSeq: this.last_input_seq
        };
    }
}

module.exports = Player;
