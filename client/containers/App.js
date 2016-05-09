'use strict';

const React = require('react');
const Login = require('../components/Login');
const Settings = require('../components/Settings');
const Lobby = require('./Lobby');

const clientConfig = require('./../client-config');
const gameConfig = require('../../lib/game-config');

class App extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            loggedIn: false,
            serverUrl: null,
            name: null,
            lobbyError: null,
            gameSettings: Object.assign({}, gameConfig, clientConfig)
        };
    }

    onLogin (values) {
        this.setState({
            loggedIn: true,
            serverUrl: values.server,
            name: values.name,
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

    onSettingsChange (settings) {
        Object.assign(this.state.gameSettings, settings);
    }

    render () {
        return (
            <div className="container mt-5 mb-5">
                { this.state.lobbyError ? (
                    <div className="flash flash-error mb-5">
                        { this.state.lobbyError }
                    </div>
                    ) : null
                }

                { this.state.loggedIn && !this.state.lobbyError ? (
                        <Lobby
                            gameSettings={ this.state.gameSettings }
                            serverUrl={ this.state.serverUrl }
                            name={ this.state.name }
                            logoutHandler={ this.onLogout.bind(this) }
                            onLobbyError={ this.onLobbyError.bind(this) }
                        />
                    ) : (
                        <Login
                            submitHandler={ this.onLogin.bind(this) }
                        />
                    )
                }

                <div className="columns">
                    <div className="single-column">
                        { this.state.loggedIn || true ? (
                                <Settings
                                    settingsChangeHandler={ this.onSettingsChange.bind(this) }
                                    defaultSettings={ clientConfig }
                                />
                            ) : null
                        }
                    </div>
                </div>
            </div>
        );
    }
}

module.exports = App;
