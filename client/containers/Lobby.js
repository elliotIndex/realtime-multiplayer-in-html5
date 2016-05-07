'use strict';

const React = require('react');
const SocketClient = require('socket.io-client');
const RoomList = require('../components/RoomList');
const Game = require('../components/Game');
const GameClient = require('../game/GameClient');

class Lobby extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            socket: null,
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
                <button
                    onClick={ this.onLogout.bind(this) }
                >
                    Logout
                </button>
                <RoomList
                    rooms={ this.state.rooms }
                    onRoomClick={ this.onJoinRoom.bind(this) }
                    onRoomCreateClick={ this.onCreateRoom.bind(this) }
                    onRoomLeaveClick={ this.onLeaveRoom.bind(this) }
                    currentRoomId={ this.state.currentRoomId }
                />
                { this.state.socket && this.state.currentRoomId ? (
                        <Game
                            width={ this.props.gameSettings.world.width }
                            height={ this.props.gameSettings.world.height }
                            gameClient={ this.state.gameClient }
                        />
                    ) : null
                }
            </div>
        );
    }
}

Lobby.propTypes = {
    serverUrl: React.PropTypes.string.isRequired,
    onLobbyError: React.PropTypes.func.isRequired,
    logoutHandler: React.PropTypes.func.isRequired,
    gameSettings: React.PropTypes.object.isRequired,
};

module.exports = Lobby;
