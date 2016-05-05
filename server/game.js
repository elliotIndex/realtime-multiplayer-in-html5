'use strict';

const MainLoop = require('../lib/mainloop');
const Vector = require('../lib/vector');
const CollisionHandler = require('../lib/collision');
const processInput = require('../lib/physics/process-input');

class GameCore {
    constructor (options) {
        this.options = options;
        this.network = null;

        this.local_time = 0;

        this._collisionHandler = CollisionHandler(options.world);

        this.players = new Set();

        const updateNetwork = () => {
            if (this.network) {
                this.network.sendUpdates(this);
            }
        };

        this._physicsLoop = MainLoop.create().setSimulationTimestep(options.simulationTimestemp);
        this._physicsLoop.setUpdate((delta) => {
            this.updatePhysics(delta);
        });

        this._networkLoop = MainLoop.create().setSimulationTimestep(options.networkTimestep).setUpdate(updateNetwork);

        this._timer = MainLoop.create().setSimulationTimestep(options.timerFrequency).setUpdate((delta) => {
            this.local_time += delta / 1000;
        });
    }

    addPlayer (player) {
        player.pos = Vector.copy(this.options.playerPositions[0]);

        player.speed = this.options.playerSpeed;

        this.players.add(player);
    }

    removePlayer (player) {
        this.players.remove(player);
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

    updatePhysics (delta) {
        for (const player of this.players) {
            player.old_state.pos = Vector.copy(player.pos);

            const newDir = processInput(player, delta);

            player.pos = Vector.add(player.old_state.pos, newDir);

            player.inputs = [];

            this._collisionHandler.process(player);
        }
    }
}

module.exports = GameCore;
