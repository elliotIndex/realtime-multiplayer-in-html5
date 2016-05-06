'use strict';

const React = require('react');

class RoomList extends React.Component {
    render () {
        return (
            <div>
                { this.props.currentRoomId ? (
                        <button
                            onClick={ this.props.onRoomLeaveClick.bind(this, this.props.currentRoomId) }
                        >
                            Leave room
                        </button>
                    ) : (
                        <div>
                            <ul>
                                { this.props.rooms.map((room, index) => {
                                    return (
                                        <li key={ index }>
                                        <a onClick={ this.props.onRoomClick.bind(this, room) } >
                                        { room.id }
                                        </a>
                                        </li>
                                    );
                                }) }
                            </ul>
                            <button
                                onClick={ this.props.onRoomCreateClick }
                            >
                                Create room
                            </button>
                        </div>
                    )
                }
            </div>
        );
    }
}

RoomList.propTypes = {
    rooms: React.PropTypes.array.isRequired,
    onRoomClick: React.PropTypes.func.isRequired,
    onRoomCreateClick: React.PropTypes.func.isRequired,
    onRoomLeaveClick: React.PropTypes.func.isRequired,
    currentRoomId: React.PropTypes.string
};

module.exports = RoomList;
