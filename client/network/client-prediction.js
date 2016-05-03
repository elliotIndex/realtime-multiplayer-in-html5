'use strict';

const Vector = require('../../lib/vector');

function clientPrediction (game) {
    // The most recent server update
    const latest_server_data = game.server_updates[game.server_updates.length - 1];

    // Our latest server position
    const my_server_pos = game.players.self.host ? latest_server_data.hp : latest_server_data.cp;

    // Update the debug server position block
    game.ghosts.server_pos_self.pos = Vector.copy(my_server_pos);

    // here we handle our local input prediction ,
    // by correcting it with the server and reconciling its differences
    const my_last_input_on_server = game.players.self.host ? latest_server_data.his : latest_server_data.cis;

    if (my_last_input_on_server) {
        // The last input sequence index in my local input list
        let lastinputseq_index = -1;

        // Find this input in the list, and store the index
        for (let i = 0; i < game.players.self.inputs.length; ++i) {
            if (game.players.self.inputs[i].seq === my_last_input_on_server) {
                lastinputseq_index = i;
                break;
            }
        }

        // Now we can crop the list of any updates we have already processed
        if (lastinputseq_index !== -1) {
            // so we have now gotten an acknowledgement from the server that our inputs here have been accepted
            // and that we can predict from this known position instead

            // remove the rest of the inputs we have confirmed on the server
            const number_to_clear = Math.abs(lastinputseq_index - (-1));

            game.players.self.inputs.splice(0, number_to_clear);
            // The player is now located at the new server position, authoritive server
            game.players.self.cur_state.pos = Vector.copy(my_server_pos);
            game.players.self.last_input_seq = lastinputseq_index;
        }
    }
}

module.exports = clientPrediction;
