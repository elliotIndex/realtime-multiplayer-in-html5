'use strict';

const Vector = require('../../../lib/vector');
const fixedNumber = require('../../../lib/fixed-number');

function processNetworkUpdates (game, interpolation) {
    // No updates
    if (game.server_updates.length === 0) {
        return;
    }

    // First : Find the position in the updates, on the timeline
    // We call this current_time, then we find the past_pos and the target_pos using this,
    // searching throught the server_updates array for current_time in between 2 other times.
    // Then :  other player position = lerp ( past_pos, target_pos, current_time );

    // Find the position in the timeline of updates we stored.
    const current_time = game.client_time;
    const count = game.server_updates.length - 1;
    let target = null;
    let previous = null;

    // We look from the 'oldest' updates, since the newest ones
    // are at the end (list.length-1 for example). This will be expensive
    // only when our time is not found on the timeline, since it will run all
    // samples. Usually this iterates very little before breaking out with a target.
    for (let i = 0; i < count; ++i) {
        const point = game.server_updates[i];
        const next_point = game.server_updates[i + 1];

        // Compare our point in time with the server times we have
        if (current_time > point.serverTime && current_time < next_point.serverTime) {
            target = next_point;
            previous = point;
            break;
        }
    }

    // With no target we store the last known
    // server position and move to that instead
    if (!target) {
        target = game.server_updates[0];
        previous = game.server_updates[0];
    }

    // Now that we have a target and a previous destination,
    // We can interpolate between then based on 'how far in between' we are.
    // This is simple percentage maths, value/target = [0,1] range of numbers.
    // lerp requires the 0,1 value to lerp to? thats the one.

    if (!target || !previous) {
        return;
    }

    game.target_time = target.serverTime;

    const difference = game.target_time - current_time;
    const max_difference = fixedNumber(target.serverTime - previous.serverTime, 3);
    let timePoint = fixedNumber(difference / max_difference, 3);

    // Because we use the same target and previous in extreme cases
    // It is possible to get incorrect values due to division by 0 difference and such.
    if (Number.isNaN(timePoint) || Math.abs(timePoint) === Number.POSITIVE_INFINITY) {
        timePoint = 0;
    }

    // The most recent server update
    const latest_server_data = game.server_updates[game.server_updates.length - 1];

    for (let i = 0; i < latest_server_data.players.length; i++) {
        const playerData = latest_server_data.players[i];

        // These are the exact server positions from this tick, but only for the ghost
        const other_server_pos = playerData.position;

        // The other players positions in this timeline, behind us and in front of us
        if (!target.players[i] || !previous.players[i]) {
            continue;
        }

        const other_target_pos = target.players[i].position;
        const other_past_pos = previous.players[i].position;

        const ghosts = game.getGhosts(playerData.id);
        const player = game.getPlayerById(playerData.id);

        if (!player) {
            continue;
        }

        // update the dest block, this is a simple lerp
        // to the target from the previous point in the server_updates buffer
        ghosts.server.position = Vector.copy(other_server_pos);
        ghosts.local.position = Vector.lerp(other_past_pos, other_target_pos, timePoint);

        if (game.options.clientSmoothing) {
            player.pos = Vector.lerp(player.pos, ghosts.local.position, interpolation);
        } else {
            player.pos = Vector.copy(ghosts.local.position);
        }

        for (const bullet of target.bullets) {
            const player = game.getPlayerById(bullet.firedBy);

            game.bulletSystem.addBullet(player, Object.assign({}, bullet, {
                x: player.position.x,
                y: player.position.y
            }));
        }
    }

    // Now, if not predicting client movement , we will maintain the local player position
    // using the same method, smoothing the players information from the past.
    if (!game.options.clientPrediction && !game.options.naiveApproach) {
        // These are the exact server positions from this tick, but only for the ghost
        const localPlayer = game.getPlayerById(latest_server_data.ownPlayer.id);

        const my_server_pos = latest_server_data.ownPlayer.position;

        // The other players positions in this timeline, behind us and in front of us
        const my_target_pos = target.ownPlayer.position;
        const my_past_pos = previous.ownPlayer.position;

        const ghosts = game.getGhosts(localPlayer.id);

        // Snap the ghost to the new server position
        ghosts.server.position = Vector.copy(my_server_pos);

        const local_target = Vector.lerp(my_past_pos, my_target_pos, timePoint);

        // Smoothly follow the destination position
        if (game.options.clientSmoothing) {
            localPlayer.pos = Vector.lerp(localPlayer.pos, local_target, interpolation);
        } else {
            localPlayer.pos = Vector.copy(local_target);
        }

        for (const bullet of latest_server_data.bullets) {
            const player = game.getPlayerById(bullet.firedBy);

            game.bulletSystem.addBullet(player, Object.assign({}, bullet, {
                x: player.position.x,
                y: player.position.y
            }));
        }
    }
}

module.exports = processNetworkUpdates;
