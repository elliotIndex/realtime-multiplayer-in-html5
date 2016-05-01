'use strict';

function debugView (game) {
    const gui = new dat.GUI();
    const playersettings = gui.addFolder('Your settings');

    game.colorcontrol = playersettings.addColor(game, 'color');

    // We want to know when we change our color so we can tell
    // the server to tell the other clients for us
    game.colorcontrol.onChange((value) => {
        game.players.self.color = value;
        localStorage.setItem('color', value);
        game.socket.send('c.' + value);
    });

    playersettings.open();

    const othersettings = gui.addFolder('Methods');

    othersettings.add(game, 'naive_approach').listen();
    othersettings.add(game, 'client_smoothing').listen();
    othersettings.add(game, 'client_smooth').listen();
    othersettings.add(game, 'client_predict').listen();

    const debugsettings = gui.addFolder('Debug view');

    debugsettings.add(game, 'show_help').listen();
    debugsettings.add(game, 'show_server_pos').listen();
    debugsettings.add(game, 'show_dest_pos').listen();
    debugsettings.add(game, 'local_time').listen();

    debugsettings.open();

    const consettings = gui.addFolder('Connection');

    consettings.add(game, 'net_latency').step(0.001).listen();
    consettings.add(game, 'net_ping').step(0.001).listen();

    // When adding fake lag, we need to tell the server about it.
    const lag_control = consettings.add(game, 'fake_lag').step(0.001).listen();

    lag_control.onChange((value) => {
        game.socket.send('l.' + value);
    });

    consettings.open();

    const netsettings = gui.addFolder('Networking');

    netsettings.add(game, 'net_offset').min(0.01).step(0.001).listen();
    netsettings.add(game, 'server_time').step(0.001).listen();
    netsettings.add(game, 'client_time').step(0.001).listen();

    netsettings.open();
}

module.exports = debugView;
