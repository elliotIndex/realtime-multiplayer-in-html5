'use strict';

function draw (ctx, game) {
    // We don't want this to be too distracting
    ctx.fillStyle = 'rgba(255,255,255,0.3)';

    // They can hide the help with the debug GUI
    if (game.options.show_help) {
        ctx.fillText('net_offset : local offset of others players and their server updates. Players are net_offset "in the past" so we can smoothly draw them interpolated.', 10 , 30);
        ctx.fillText('server_time : last known game time on server', 10 , 70);
        ctx.fillText('client_time : delayed game time on client for other players only (includes the net_offset)', 10 , 90);
        ctx.fillText('net_latency : Time from you to the server. ', 10 , 130);
        ctx.fillText('net_ping : Time from you to the server and back. ', 10 , 150);
        ctx.fillText('fake_lag : Add fake ping/lag for testing, applies only to your inputs (watch server_pos block!). ', 10 , 170);
        ctx.fillText('client_smoothing/client_smooth : When updating players information from the server, it can smooth them out.', 10 , 210);
        ctx.fillText(' This only applies to other clients when prediction is enabled, and applies to local player with no prediction.', 170 , 230);
    }

    // Draw some information for the host
    if (game.players.self.host) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('You are the host', 10 , 465);
    }

    // Reset the style back to full white.
    ctx.fillStyle = 'rgba(255,255,255,1)';
}

module.exports = draw;
