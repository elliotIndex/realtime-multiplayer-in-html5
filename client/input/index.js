'use strict';

function inputHandler (game) {
    const keyboard = new THREEx.KeyboardState();

    function getInput () {
        // This takes input from the client and keeps a record,
        // It also sends the input information to the server immediately
        // as it is pressed. It also tags each input with a sequence number.
        let x_dir = 0;
        let y_dir = 0;
        const input = [];

        game.client_has_input = false;

        if (keyboard.pressed('A') || keyboard.pressed('left')) {
            x_dir = -1;
            input.push('l');
        }

        if (keyboard.pressed('D') ||
            keyboard.pressed('right')) {

            x_dir = 1;
            input.push('r');
        }

        if (keyboard.pressed('S') ||
            keyboard.pressed('down')) {

            y_dir = 1;
            input.push('d');
        }

        if (keyboard.pressed('W') ||
            keyboard.pressed('up')) {

            y_dir = -1;
            input.push('u');
        }

        if (input.length) {
            // Update what sequence we are on now
            game.input_seq += 1;

            // Store the input state as a snapshot of what happened.
            game.players.self.inputs.push({
                inputs: input,
                time: fixedNumber(game.local_time, 3),
                seq: game.input_seq
            });

            // Send the packet of information to the server.
            // The input packets are labelled with an 'i' in front.
            let server_packet = 'i.';

            server_packet += input.join('-') + '.';
            server_packet += game.local_time.toFixed(3).replace('.', '-') + '.';
            server_packet += game.input_seq;

            game.socket.send(server_packet);
        }

        return input;
    }
}

module.exports = inputHandler;
