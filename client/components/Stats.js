'use strict';

const React = require('react');

class Stats extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            serverTime: 0,
            clientTime: 0,
            localTime: 0,
            networkLatency: 0,
            networkPing: 0
        };
    }

    componentWillMount () {
        const game = this.props.game;

        game.addAfterViewLoopHook('stats', () => {
            this.setState({
                serverTime: game.server_time.toFixed(3),
                clientTime: game.client_time.toFixed(3),
                localTime: game.local_time.toFixed(3),
                networkLatency: game._network.netLatency,
                networkPing: game._network.netPing
            });
        });
    }

    componentWillUnmount () {
        this.props.game.removeAfterViewLoopHook('stats');
    }

    render () {
        return (
            <div>
                <ul className="horizontal-list square-font">
                    <li>Server time: { this.state.serverTime }</li>
                    <li>Client time: { this.state.clientTime }</li>
                    <li>Local time: { this.state.localTime }</li>
                    <li>Network latency: { this.state.networkLatency }</li>
                    <li>Network ping: { this.state.networkPing }</li>
                </ul>
            </div>
        );
    }
}

Stats.propTypes = {
    game: React.PropTypes.object.isRequired
};

module.exports = Stats;
