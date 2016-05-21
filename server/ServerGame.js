'use strict';

const MainLoop = require('@arjanfrans/mainloop');
const GameNetwork = require('./Network');
const protectObject = require('../lib/protect-object');
const AbstractGame = require('../lib/AbstractGame');

function ServerGame ({ options }) {
    const game = AbstractGame.create({ options });
    const network = GameNetwork();
    const networkLoop = MainLoop.create({
        simulationTimestep: options.networkTimestep
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
            player.setPreviousState({
                position: player.getPosition()
            });

            player.update(delta);
        }
    }

    networkLoop.setUpdate(() => {
        network.sendUpdates(game.getState());

        game.clearEvents();
    });

    game.setUpdateHandler(onUpdate);

    return Object.freeze(Object.assign({}, game, {
        addPlayer,
        getNetwork,
        start,
        stop
    }));
}

module.exports = { create: protectObject(ServerGame) };
