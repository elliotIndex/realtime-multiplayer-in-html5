'use strict';

const dat = require('../../../lib/dat-gui');

function debugView (game) {
    const gui = new dat.GUI();

    const debugsettings = gui.addFolder('Debug view');

    debugsettings.add(game, 'local_time').listen();

    debugsettings.open();

    const consettings = gui.addFolder('Connection');

    consettings.add(game, 'netLatency').step(0.001).listen();
    consettings.add(game, 'netPing').step(0.001).listen();

    consettings.open();

    const netsettings = gui.addFolder('Networking');

    netsettings.add(game, 'server_time').step(0.001).listen();
    netsettings.add(game, 'client_time').step(0.001).listen();

    netsettings.open();
}

module.exports = debugView;
