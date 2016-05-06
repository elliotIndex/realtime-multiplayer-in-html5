'use strict';

require('style!css!../css/index.css');

const React = require('react');
const ReactDOM = require('react-dom');
const App = require('./containers/App');

ReactDOM.render(<App />, document.getElementById('app'));
