'use strict';

const React = require('react');
const Login = require('../components/Login');
const Lobby = require('./Lobby');

class App extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            loggedIn: false,
            serverUrl: null
        };
    }

    onLogin (values) {
        this.setState({
            loggedIn: true,
            serverUrl: values.server
        });
    }

    render () {
        return (
            <div>
                <Login
                    submitHandler={ this.onLogin.bind(this) }
                />

                { this.state.loggedIn ? (
                        <Lobby
                            serverUrl={ this.state.serverUrl }
                        />
                    ) : null
                }
            </div>
        );
    }
}

module.exports = App;
