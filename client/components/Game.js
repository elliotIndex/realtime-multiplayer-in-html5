'use strict';

const React = require('react');
const GameClient = require('../game');
const Renderer = require('../view');
const debugView = require('../view/debug');
const Player = require('../../lib/Player');
const DEBUG = true;

class Game extends React.Component {
    componentDidMount () {
        const canvas = this.refs.canvas;
        const ctx = canvas.getContext('2d');

        ctx.font = '11px "Helvetica"';

        const game = new GameClient(Object.assign({
            socket: this.props.socket
        }, this.props.gameConfig));
        const renderer = Renderer(ctx, game.options);

        if (DEBUG) {
            debugView(game);
        }

        const localPlayer = new Player('local');

        game.addPlayer(localPlayer);
        game.setLocalPlayer(localPlayer);

        game.start(renderer);
    }

    render () {
        return (
            <canvas
                ref="canvas"
                className="game"
                width={ this.props.width }
                height={ this.props.height }
            >
            </canvas>
        );
    }
}

Game.propTypes = {
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    gameConfig: React.PropTypes.object,
    socket: React.PropTypes.object.isRequired
};

module.exports = Game;
