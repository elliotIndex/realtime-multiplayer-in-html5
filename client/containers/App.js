'use strict';

const React = require('react');
const Game = require('../components/Game');
const clientConfig = require('./../client-config');
const gameConfig = require('../../lib/game-config');

const config = Object.assign({}, gameConfig, clientConfig);

class App extends React.Component {
    render () {
        return (
            <Game
                width={ config.world.width }
                height={ config.world.height }
                gameConfig={ config }
            />
        );
    }
}

module.exports = App;
