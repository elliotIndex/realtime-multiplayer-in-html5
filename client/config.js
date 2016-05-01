'use strict';

module.exports = {
    show_help: false,        // Whether or not to draw the help text
    naive_approach: false,   // Whether or not to use the naive approach
    show_server_pos: false,  // Whether or not to show the server position
    show_dest_pos: false,    // Whether or not to show the interpolation goal
    client_predict: true,    // Whether or not the client is predicting input
    client_smoothing: true,  // Whether or not the client side prediction tries to smooth things out
    client_smooth: 25,       // amount of smoothing to apply to client update dest

    net_offset: 100,         // 100 ms latency between server and client interpolation for other clients
    buffer_size: 2,          // The size of the server history to keep for rewinding/interpolating.

    pingTimeout: 1000 // How often to ping the server.
};
