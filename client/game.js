'use strict';

const MainLoop = require('../lib/mainloop');
const Network = require('./network');
const InputHandler = require('./input');
const Player = require('../lib/Player');
const Vector = require('../lib/vector');
const fixedNumber = require('../lib/fixed-number');
const CollisionHandler = require('../lib/collision');
const processInput = require('../lib/physics/process-input');
const processNetworkUpdates = require('./network/process-updates');

function game_core (options) {
    // We create a player set, passing them
    // the game that is running them, as well
    this.players = {
        self: new Player(this),
        other: new Player(this)
    };

    // Debugging ghosts, to help visualise things
    this.ghosts = {
        // Our ghost position on the server
        server_pos_self: new Player(this),
        // The other players server position as we receive it
        server_pos_other: new Player(this),
        // The other players ghost destination position (the lerp)
        pos_other: new Player(this)
    };

    this.ghosts.server_pos_self.pos = Vector.copy(options.playerPositions[0]);
    this.ghosts.pos_other.pos = Vector.copy(options.playerPositions[1]);
    this.ghosts.server_pos_other.pos = Vector.copy(options.playerPositions[1]);

    // The speed at which the clients move.
    this.players.self.speed = options.playerSpeed;
    this.players.other.speed = options.playerSpeed;

    // A local timer for precision on client
    this.local_time = 0;

    // Create the default configuration settings
    this.input_seq = 0;          // When predicting client inputs, we store the last input as a sequence number
    this.net_latency = 0.001;    // the latency between the client and the server (ping/2)
    this.last_ping_time = 0.001; // The time we last sent a ping
    this.target_time = 0.01;     // the time where we want to be in the server timeline
    this.client_time = 0.01;     // Our local 'clock' based on server time - client interpolation(net_offset).
    this.server_time = 0.01;     // The time the server reported it was at, last we heard from it

    // A list of recent server updates we interpolate across
    // This is the buffer that is the driving factor for our networking
    this.server_updates = [];

    this.players.self.color = '#cc8822';
}

game_core.prototype.client_reset_positions = function() {
    const player_host = this.players.self.host ? this.players.self : this.players.other;
    const player_client = this.players.self.host ? this.players.other : this.players.self;

    // Host always spawns at the top left.
    player_host.pos = Vector.copy(this.options.playerPositions[0]);
    player_client.pos = Vector.copy(this.options.playerPositions[1]);

    // Make sure the local player physics is updated
    this.players.self.old_state.pos = Vector.copy(this.players.self.pos);
    this.players.self.pos = Vector.copy(this.players.self.pos);
    this.players.self.cur_state.pos = Vector.copy(this.players.self.pos);

    // Position all debug view items to their owners position
    this.ghosts.server_pos_self.pos = Vector.copy(this.players.self.pos);

    this.ghosts.server_pos_other.pos = Vector.copy(this.players.other.pos);
    this.ghosts.pos_other.pos = Vector.copy(this.players.other.pos);
};

class GameClient extends game_core {
    constructor (options) {
        super(options);
        this.options = Object.assign({}, options);
        this._renderer = null;
        this._network = Network().connect(options.serverUrl);
        this._inputHandler = InputHandler();
        this._collisionHandler = CollisionHandler(options.world);

        const updateLogic = (delta) => {
            this._updateInput();

            this.updatePhysics(delta);

            this._collisionHandler.process(this.players.self);

            this.local_time += delta / 1000;
        };

        const updateView = (interpolation) => {
            if (!this.options.naive_approach && this.server_updates.length > 0) {
                // Network player just gets drawn normally, with interpolation from
                // the server updates, smoothing out the positions from the past.
                // Note that if we don't have prediction enabled - this will also
                // update the actual local client position on screen as well.
                processNetworkUpdates(this, interpolation);
            }

            this._renderer.draw(this);
        };

        this._physicsLoop = MainLoop.create();
        this._physicsLoop.setSimulationTimestep(options.simulationTimestemp);
        this._physicsLoop.setUpdate(updateLogic).setDraw(updateView);

        this._timer = MainLoop.create().setSimulationTimestep(options.timerFrequency).setUpdate((delta) => {
            this.local_time += delta / 1000;
        });
    }

    updatePhysics (delta) {
        // Fetch the new direction from the input buffer,
        // and apply it to the state so we can smooth it in the visual state
        if (this.options.client_predict) {
            this.players.self.old_state.pos = Vector.copy(this.players.self.cur_state.pos);

            const nd = processInput(this.players.self, delta);

            this.players.self.cur_state.pos = Vector.add(this.players.self.old_state.pos, nd);
            this.players.self.state_time = this.local_time;

            // When we are doing client side prediction, we smooth out our position
            // across frames using local input states we have stored.

            // Make sure the visual position matches the states we have stored
            this.players.self.pos = this.players.self.cur_state.pos;
        }
    }

    _updateInput () {
        const input = this._inputHandler.getInput();

        if (input.length > 0) {
            // Update what sequence we are on now
            this.input_seq += 1;

            // Store the input state as a snapshot of what happened.
            this.players.self.inputs.push({
                inputs: input,
                time: fixedNumber(this.local_time, 3),
                seq: this.input_seq
            });

            // Send the packet of information to the server.
            // The input packets are labelled with an 'i' in front.
            let server_packet = 'i.';

            server_packet += input.join('-') + '.';
            server_packet += this.local_time.toFixed(3).replace('.', '-') + '.';
            server_packet += this.input_seq;

            this._network.send(server_packet);
        }
    }

    get netPing () {
        return this._network.netPing;
    }

    get netLatency () {
        return this._network.netLatency;
    }

    start (renderer) {
        this._timer.start();
        this._renderer = renderer;
        this._physicsLoop.start();

        this._network.listen(this);

        // Ping the server
        setInterval(() => {
            this._network.ping();
        }, this.options.pingTimeout || 1000);
    }

    stop () {
        this._physicsLoop.stop();
        this._timer.stop();
    }
}

module.exports = GameClient;
