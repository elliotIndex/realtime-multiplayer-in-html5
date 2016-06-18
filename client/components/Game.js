'use strict';

const React = require('react');
const Renderer = require('../game/view/Renderer');

class Game extends React.Component {
    componentDidMount () {
        const game = this.props.gameClient;
        const canvas = this.refs.canvas;
        const ctx = canvas.getContext('2d');

        ctx.font = '11px "Helvetica"';

        const renderer = Renderer.create(ctx, game, this.props.gameClient.getOptions());

        game.setRenderer(renderer);
        game.start();
    }

    render () {
        return (
            <canvas
                ref="canvas"
                className="game"
                width={ this.props.width }
                height={ this.props.height }
            />
        );
    }
}

Game.propTypes = {
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    gameClient: React.PropTypes.object.isRequired
};

module.exports = Game;
