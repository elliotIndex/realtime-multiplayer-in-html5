'use strict';

const React = require('react');
const Login = require('../components/Login');
const Lobby = require('./Lobby');

class App extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            loggedIn: false,
            serverUrl: null,
            lobbyError: null
        };
    }

    onLogin (values) {
        this.setState({
            loggedIn: true,
            serverUrl: values.server,
            lobbyError: null
        });
    }

    onLobbyError (error) {
        this.setState({
            loggedIn: false,
            lobbyError: error
        });
    }

    onLogout () {
        this.setState({
            serverUrl: null,
            loggedIn: false,
            lobbyError: null
        });
    }

    render () {
        return (
            <div>
                { this.state.loggedIn && !this.state.lobbyError ? (
                        <Lobby
                            serverUrl={ this.state.serverUrl }
                            logoutHandler={ this.onLogout.bind(this) }
                            onLobbyError={ this.onLobbyError.bind(this) }
                        />
                    ) : (
                        <Login
                            submitHandler={ this.onLogin.bind(this) }
                        />
                    )
                }

                { this.state.lobbyError ? (
                    <div>
                        { this.state.lobbyError }
                    </div>
                    ) : null
                }
            </div>
        );
    }
}

module.exports = App;
