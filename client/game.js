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

class GameClient {
    constructor (options, socket) {
        this.options = options;
        this.players = new Map();
        this.serverGhosts = new Map();
        this.localGhosts = new Map();

        // A local timer for precision on client
        this.local_time = 0;

        // Create the default configuration settings
        this.input_seq = 0;          // When predicting client inputs, we store the last input as a sequence number
        this.net_latency = 0.001;    // the latency between the client and the server (ping/2)
        this.last_ping_time = 0.001; // The time we last sent a ping
        this.target_time = 0.01;     // the time where we want to be in the server timeline
        this.client_time = 0.01;     // Our local 'clock' based on server time - client interpolation(networkOffset).
        this.server_time = 0.01;     // The time the server reported it was at, last we heard from it

        // A list of recent server updates we interpolate across
        // This is the buffer that is the driving factor for our networking
        this.server_updates = [];

        this._renderer = null;
        this._network = Network(socket);
        this._inputHandler = InputHandler();
        this._collisionHandler = CollisionHandler(options.world);

        this.localPlayer = null;

        const updateLogic = (delta) => {
            this._updateInput();

            this.updatePhysics(delta);

            if (this.localPlayer) {
                this._collisionHandler.process(this.localPlayer);
            }

            this.local_time += delta / 1000;
        };

        const updateView = (interpolation) => {
            if (!this.options.naiveApproach && this.server_updates.length > 0) {
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

        this._network.listen(this);

        // Ping the server
        setInterval(() => {
            this._network.ping();
        }, this.options.pingTimeout || 1000);
    }


    updatePhysics (delta) {
        // Fetch the new direction from the input buffer,
        // and apply it to the state so we can smooth it in the visual state
        if (this.options.clientPrediction) {
            if (this.localPlayer) {
                const player = this.localPlayer;

                player.old_state.pos = Vector.copy(player.cur_state.pos);

                const newDir = processInput(player, delta);

                player.cur_state.pos = Vector.add(player.old_state.pos, newDir);

                // When we are doing client side prediction, we smooth out our position
                // across frames using local input states we have stored.
                // Make sure the visual position matches the states we have stored
                player.pos = player.cur_state.pos;
            }
        }
    }

    _updateInput () {
        const input = this._inputHandler.getInput();

        if (input.length > 0 && this.localPlayer) {
            // Update what sequence we are on now
            this.input_seq += 1;

            // Store the input state as a snapshot of what happened.
            this.localPlayer.inputs.push({
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

    setLocalPlayer (player) {
        this.localPlayer = player;
    }

    addPlayer (player) {
        player.speed = this.options.playerSpeed;

        this.players.set(player.id, player);

        player.old_state.pos = Vector.copy(player.pos);
        player.cur_state.pos = Vector.copy(player.pos);

        this.serverGhosts.set(player.id, {
            position: Vector.copy(player.pos),
            speed: player.speed
        });
        this.localGhosts.set(player.id, {
            position: Vector.copy(player.pos),
            speed: player.speed
        });
    }

    removePlayer (playerId) {
        this.players.delete(playerId);
        this.localGhosts.delete(playerId);
        this.serverGhosts.delete(playerId);
    }

    getPlayerById (id) {
        return this.players.get(id);
    }

    getGhosts (playerId) {
        return {
            server: this.serverGhosts.get(playerId),
            local: this.localGhosts.get(playerId)
        };
    }

    clearPlayers () {
        this.players.clear();
        this.serverGhosts.clear();
        this.localGhosts.clear();
    }

    start (renderer) {
        this._timer.start();
        this._renderer = renderer;
        this._physicsLoop.start();
    }

    stop () {
        this._physicsLoop.stop();
        this._timer.stop();
    }
}

module.exports = GameClient;
