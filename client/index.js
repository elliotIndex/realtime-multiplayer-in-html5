'use strict';

require('!style!css!sass!../scss/primer.scss');
require('!style!css!sass!../scss/game.scss');

const React = require('react');
const ReactDOM = require('react-dom');
const App = require('./containers/App');

ReactDOM.render(<App />, document.getElementById('app'));
