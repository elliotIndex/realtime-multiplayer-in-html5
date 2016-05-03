'use strict';

const Vector = require('../../lib/vector');
const fixedNumber = require('../../lib/fixed-number');

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
        if (current_time > point.t && current_time < next_point.t) {
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

    if (target && previous) {
        game.target_time = target.t;

        const difference = game.target_time - current_time;
        const max_difference = fixedNumber(target.t - previous.t, 3);
        let timePoint = fixedNumber(difference / max_difference, 3);

        // Because we use the same target and previous in extreme cases
        // It is possible to get incorrect values due to division by 0 difference and such.
        if (Number.isNaN(timePoint) || Math.abs(timePoint) === Number.POSITIVE_INFINITY) {
            timePoint = 0;
        }

        // The most recent server update
        const latest_server_data = game.server_updates[game.server_updates.length - 1];

        // These are the exact server positions from this tick, but only for the ghost
        const other_server_pos = game.players.self.host ? latest_server_data.cp : latest_server_data.hp;

        // The other players positions in this timeline, behind us and in front of us
        const other_target_pos = game.players.self.host ? target.cp : target.hp;
        const other_past_pos = game.players.self.host ? previous.cp : previous.hp;

        // update the dest block, this is a simple lerp
        // to the target from the previous point in the server_updates buffer
        game.ghosts.server_pos_other.pos = Vector.copy(other_server_pos);
        game.ghosts.pos_other.pos = Vector.lerp(other_past_pos, other_target_pos, timePoint);

        if (game.options.client_smoothing) {
            game.players.other.pos = Vector.lerp(game.players.other.pos, game.ghosts.pos_other.pos, interpolation);
        } else {
            game.players.other.pos = Vector.copy(game.ghosts.pos_other.pos);
        }

        // Now, if not predicting client movement , we will maintain the local player position
        // using the same method, smoothing the players information from the past.
        if (!game.options.client_predict && !game.options.naive_approach) {
            // These are the exact server positions from this tick, but only for the ghost
            const my_server_pos = game.players.self.host ? latest_server_data.hp : latest_server_data.cp;

            // The other players positions in this timeline, behind us and in front of us
            const my_target_pos = game.players.self.host ? target.hp : target.cp;
            const my_past_pos = game.players.self.host ? previous.hp : previous.cp;

            // Snap the ghost to the new server position
            game.ghosts.server_pos_self.pos = Vector.copy(my_server_pos);
            const local_target = Vector.lerp(my_past_pos, my_target_pos, timePoint);

            // Smoothly follow the destination position
            if (game.options.client_smoothing) {
                game.players.self.pos = Vector.lerp(game.players.self.pos, local_target, interpolation);
            } else {
                game.players.self.pos = Vector.copy(local_target);
            }
        }
    }
}

module.exports = processNetworkUpdates;
