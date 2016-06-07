'use strict';

const Timer = require('../lib/Timer');
const GameNetwork = require('./Network');
const AbstractGame = require('../lib/AbstractGame');

function ServerGame ({ options }) {
    const game = AbstractGame.create({ options });
    const network = GameNetwork();
    const networkLoop = Timer.create({
        interval: options.networkTimestep,
        onUpdate () {
            network.sendUpdates(game.getStateForPlayer);

            game.clearEvents();
        }
    });

    function getNetwork () {
        return network;
    }

    function addPlayer (player) {
        const { x, y } = options.playerPositions[0];

        player.setPosition(x, y);

        game.addPlayer(player);
    }

    function start () {
        networkLoop.start();

        game.start();
    }

    function stop () {
        networkLoop.stop();

        game.stop();
    }

    function onUpdate (delta) {
        for (const player of game.getPlayers()) {
            player.update(delta);
        }
    }

    game.setUpdateHandler(onUpdate);

    return Object.freeze(Object.assign({}, game, {
        addPlayer,
        getNetwork,
        start,
        stop
    }));
}

module.exports = { create: ServerGame };
