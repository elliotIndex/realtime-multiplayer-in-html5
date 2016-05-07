'use strict';

const React = require('react');
const Renderer = require('../game/view');

class Game extends React.Component {
    componentDidMount () {
        const canvas = this.refs.canvas;
        const ctx = canvas.getContext('2d');

        ctx.font = '11px "Helvetica"';

        const renderer = Renderer(ctx, this.props.gameClient.options);

        this.props.gameClient.start(renderer);
    }

    render () {
        return (
            <div>
                <canvas
                    ref="canvas"
                    className="game"
                    width={ this.props.width }
                    height={ this.props.height }
                >
                </canvas>
            </div>
        );
    }
}

Game.propTypes = {
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    gameClient: React.PropTypes.object.isRequired
};

module.exports = Game;
