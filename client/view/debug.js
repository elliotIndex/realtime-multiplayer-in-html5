'use strict';

const dat = require('../../lib/dat-gui');

function debugView (game) {
    const gui = new dat.GUI();
    const playersettings = gui.addFolder('Your settings');

    playersettings.open();

    const othersettings = gui.addFolder('Methods');

    othersettings.add(game.options, 'naive_approach').listen();
    othersettings.add(game.options, 'client_smoothing').listen();
    othersettings.add(game.options, 'client_predict').listen();

    const debugsettings = gui.addFolder('Debug view');

    debugsettings.add(game.options, 'show_server_pos').listen();
    debugsettings.add(game.options, 'show_dest_pos').listen();
    debugsettings.add(game, 'local_time').listen();

    debugsettings.open();

    const consettings = gui.addFolder('Connection');

    consettings.add(game, 'netLatency').step(0.001).listen();
    consettings.add(game, 'netPing').step(0.001).listen();

    consettings.open();

    const netsettings = gui.addFolder('Networking');

    netsettings.add(game.options, 'net_offset').min(0.01).step(0.001).listen();
    netsettings.add(game, 'server_time').step(0.001).listen();
    netsettings.add(game, 'client_time').step(0.001).listen();

    netsettings.open();
}

module.exports = debugView;
