'use strict';

const MainLoop = require('../lib/mainloop');
const Player = require('../lib/Player');
const Vector = require('../lib/vector');
const CollisionHandler = require('../lib/collision');
const processInput = require('../lib/physics/process-input');

function game_core (game_instance) {
    // Store the instance, if any
    this.instance = game_instance;

    // A local timer for precision on server
    this.local_time = 0;
}

// Simulates the world state
game_core.prototype.server_update_physics = function (delta) {
    // Handle player one
    this.players.self.old_state.pos = Vector.copy(this.players.self.pos);

    const new_dir = processInput(this.players.self, delta);

    this.players.self.pos = Vector.add(this.players.self.old_state.pos, new_dir);

    // Handle player two
    this.players.other.old_state.pos = Vector.copy(this.players.other.pos);

    const other_new_dir = processInput(this.players.other, delta);

    this.players.other.pos = Vector.add(this.players.other.old_state.pos, other_new_dir);

    this.players.self.inputs = []; // we have cleared the input buffer, so remove this
    this.players.other.inputs = []; // we have cleared the input buffer, so remove this
};

class GameCore extends game_core {
    constructor (gameInstance, options) {
        super(gameInstance, options);
        this.options = options;

        this._collisionHandler = CollisionHandler(options.world);

        // We create a player set, passing them
        // the game that is running them, as well
        this.players = {
            self: new Player(this, this.instance.player_host),
            other: new Player(this, this.instance.player_client)
        };

        this.players.self.pos = Vector.copy(options.playerPositions[0]);
        this.players.other.pos = Vector.copy(options.playerPositions[1]);

        this.players.self.speed = options.playerSpeed;
        this.players.other.speed = options.playerSpeed;

        const updateNetwork = () => {
            this.sendUpdates();
        };

        this._physicsLoop = MainLoop.create().setSimulationTimestep(options.simulationTimestemp).setUpdate((delta) => {
            this.server_update_physics(delta);

            // Keep the physics position in the world
            this._collisionHandler.process(this.players.self);
            this._collisionHandler.process(this.players.other);
        });

        this._networkLoop = MainLoop.create().setSimulationTimestep(options.networkTimestep).setUpdate(updateNetwork);

        this._timer = MainLoop.create().setSimulationTimestep(options.timerFrequency).setUpdate((delta) => {
            this.local_time += delta / 1000;
        });
    }

    /**
     * Send updates to clients.
     */
    sendUpdates () {
        // Make a snapshot of the current state, for updating the clients
        const state = {
            hp: this.players.self.pos,               // 'host position', the game creators position
            cp: this.players.other.pos,              // 'client position', the person that joined, their position
            his: this.players.self.last_input_seq,    // 'host input sequence', the last input we processed for the host
            cis: this.players.other.last_input_seq,   // 'client input sequence', the last input we processed for the client
            t: this.local_time                      // our current local time on the server
        };

        // Send the snapshot to the 'host' player
        if (this.players.self.instance) {
            this.players.self.instance.emit('onserverupdate', state);
        }

        // Send the snapshot to the 'client' player
        if (this.players.other.instance) {
            this.players.other.instance.emit('onserverupdate', state);
        }
    }

    /**
     * Receive input from clients.
     */
    receiveClientInput (client, input, inputTime, inputSeq) {
        // Fetch which client this refers to out of the two
        const clientPlayer = client.userid === this.players.self.instance.userid ? this.players.self : this.players.other;

        // Store the input on the player instance for processing in the physics loop
        clientPlayer.inputs.push({
            inputs: input,
            time: inputTime,
            seq: inputSeq
        });
    }

    start () {
        this._timer.start();
        this._physicsLoop.start();
        this._networkLoop.start();
    }

    stop () {
        this._physicsLoop.stop();
        this._networkLoop.stop();
        this._timer.stop();
    }
}

module.exports = GameCore;
