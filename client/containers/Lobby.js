'use strict';

const React = require('react');
const SocketClient = require('socket.io-client');
const RoomList = require('../components/RoomList');
const Game = require('../components/Game');
const GameClient = require('../game/GameClient');
const Stats = require('../components/Stats');

class Lobby extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            socket: null,
            user: null,
            rooms: [],
            currentRoomId: null,
            gameClient: null
        };
    }

    componentWillMount () {
        const socket = new SocketClient(this.props.serverUrl);

        socket.on('connect_error', () => {
            this.props.onLobbyError('Error connecting to server.');
            socket.close();
        });

        socket.on('connect', () => {
            socket.on('onConnected', (data) => {
                const gameClient = new GameClient(this.props.gameSettings, socket);

                this.setState({
                    user: data.user,
                    socket: socket,
                    rooms: data.rooms,
                    gameClient: gameClient
                });
            });

            socket.on('roomCreated', (data) => {
                this.setState({
                    rooms: this.state.rooms.filter(room => room.id !== data.room.id).concat(data.room)
                });
            });

            socket.on('roomDeleted', (data) => {
                this.setState({
                    rooms: this.state.rooms.filter(room => room.id !== data.roomId)
                });
            });

            socket.on('onJoinedRoom', (data) => {
                this.setState({
                    currentRoomId: data.room.id
                });
            });

            socket.on('onLeftRoom', () => {
                this.setState({
                    currentRoomId: null
                });
            });

            socket.emit('register', {
                name: this.props.name
            });
        });
    }

    onJoinRoom (room) {
        if (this.state.socket) {
            this.state.socket.emit('joinRoom', { roomId: room.id });
        }
    }

    onLeaveRoom (roomId) {
        if (this.state.socket) {
            this.state.socket.emit('leaveRoom', { roomId: roomId });
        }
    }

    onCreateRoom () {
        if (this.state.socket) {
            this.state.socket.emit('createRoom');
        }
    }

    onLogout () {
        if (this.state.socket) {
            if (this.state.currentRoomId) {
                this.onLeaveRoom(this.state.currentRoomId);
            }

            this.state.socket.close();
        }

        this.props.logoutHandler();
    }

    render () {
        return (
            <div>
                <div className="grid">
                    <div className="col-2-12">
                        <button
                            onClick={ this.onLogout.bind(this) }
                        >
                            Logout
                        </button>

                        { this.state.user ? this.state.user.name : null }

                        <RoomList
                            rooms={ this.state.rooms }
                            onRoomClick={ this.onJoinRoom.bind(this) }
                            onRoomCreateClick={ this.onCreateRoom.bind(this) }
                            onRoomLeaveClick={ this.onLeaveRoom.bind(this) }
                            currentRoomId={ this.state.currentRoomId }
                        />
                    </div>
                    <div className="col-10-12">
                        { this.state.gameClient && this.state.currentRoomId ? (
                                <div>
                                    <Game
                                        width={ this.props.gameSettings.world.width }
                                        height={ this.props.gameSettings.world.height }
                                        gameClient={ this.state.gameClient }
                                    />
                                    <Stats
                                        game={ this.state.gameClient }
                                    />
                                </div>
                            ) : null
                        }
                    </div>
                </div>
            </div>
        );
    }
}

Lobby.propTypes = {
    serverUrl: React.PropTypes.string.isRequired,
    name: React.PropTypes.string.isRequired,
    onLobbyError: React.PropTypes.func.isRequired,
    logoutHandler: React.PropTypes.func.isRequired,
    gameSettings: React.PropTypes.object.isRequired,
};

module.exports = Lobby;
