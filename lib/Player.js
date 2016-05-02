'use strict';

class Player {
    constructor (gameInstance, playerInstance) {
        this.game = gameInstance;
        this.instance = playerInstance;

        this.online = true;
        this.isLocalPlayer = false;

        // Set up initial values for our state information
        this.pos = { x:0, y:0 };
        this.size = { x:16, y:16, hx:8, hy:8 };
        this.state = 'not-connected';

        this.id = '';

        // These are used in moving us around later
        this.old_state = {pos:{x:0,y:0}};
        this.cur_state = {pos:{x:0,y:0}};
        this.state_time = new Date().getTime();

        // Our local history of inputs
        this.inputs = [];

        // The 'host' of a game gets created with a player instance since
        // the server already knows who they are. If the server starts a game
        // with only a host, the other player is set up in the 'else' below
        if(playerInstance) {
            this.pos = { x:20, y:20 };
        } else {
            this.pos = { x:500, y:200 };
        }
    }
}

module.exports = Player;
