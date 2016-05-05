'use strict';

const GameClient = require('./game');
const Renderer = require('./view');
const debugView = require('./view/debug');
const DEBUG = true;
const clientConfig = require('./client-config');
const gameConfig = require('../lib/game-config');
const Player = require('../lib/Player');

const React = require('react');
const ReactDOM = require('react-dom');
const App = require('./containers/App');

ReactDOM.render(<App />, document.getElementById('app'))
