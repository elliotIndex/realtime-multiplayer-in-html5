'use strict';

const MainLoop = require('../lib/mainloop');
const SocketClient = require('socket.io-client');
const Network = require('./network');
const SERVER_URL = 'http://localhost:4004';
const Player = require('../lib/Player');
const Vector = require('../lib/vector');
const fixedNumber = require('../lib/fixed-number');

const PHYSICS_FPS = 66;

function game_core (options){
    this.options = Object.assign({}, options);

    // Used in collision etc.
    this.world = {
        width: 720,
        height: 480
    };

    // We create a player set, passing them
    // the game that is running them, as well
    this.players = {
        self: new Player(this),
        other: new Player(this)
    };

    // Debugging ghosts, to help visualise things
    this.ghosts = {
        // Our ghost position on the server
        server_pos_self: new Player(this),
        //The other players server position as we receive it
        server_pos_other: new Player(this),
        //The other players ghost destination position (the lerp)
        pos_other: new Player(this)
    };

    this.ghosts.pos_other.state = 'dest_pos';

    this.ghosts.pos_other.info_color = 'rgba(255,255,255,0.1)';

    this.ghosts.server_pos_self.info_color = 'rgba(255,255,255,0.2)';
    this.ghosts.server_pos_other.info_color = 'rgba(255,255,255,0.2)';

    this.ghosts.server_pos_self.state = 'server_pos';
    this.ghosts.server_pos_other.state = 'server_pos';

    this.ghosts.server_pos_self.pos = { x: 20, y: 20 };
    this.ghosts.pos_other.pos = { x: 500, y: 200 };
    this.ghosts.server_pos_other.pos = { x: 500, y: 200 };

    // The speed at which the clients move.
    this.playerspeed = 120;

    // A local timer for precision on client
    this.local_time = PHYSICS_FPS / 1000 / 1000;

    // Create a keyboard handler
    this.keyboard = new THREEx.KeyboardState();

    // Create the default configuration settings
    this.client_create_configuration();

    // A list of recent server updates we interpolate across
    // This is the buffer that is the driving factor for our networking
    this.server_updates = [];

    // Set their colors from the storage or locally
    this.color = localStorage.getItem('color') || '#cc8822';

    localStorage.setItem('color', this.color);

    this.players.self.color = this.color;
}

game_core.prototype.check_collision = function( item ) {
    // Left wall.
    if (item.pos.x <= item.pos_limits.x_min) {
        item.pos.x = item.pos_limits.x_min;
    }

    // Right wall
    if (item.pos.x >= item.pos_limits.x_max) {
        item.pos.x = item.pos_limits.x_max;
    }

    // Roof wall.
    if (item.pos.y <= item.pos_limits.y_min) {
        item.pos.y = item.pos_limits.y_min;
    }

    // Floor wall
    if (item.pos.y >= item.pos_limits.y_max) {
        item.pos.y = item.pos_limits.y_max;
    }

    // Fixed point helps be more deterministic
    item.pos.x = fixedNumber(item.pos.x, 4);
    item.pos.y = fixedNumber(item.pos.y, 4);
};

game_core.prototype.process_input = function(player, delta) {
    // It's possible to have recieved multiple inputs by now,
    // so we process each one
    let x_dir = 0;
    let y_dir = 0;
    let ic = player.inputs.length;

    if(ic) {
        for(let j = 0; j < ic; ++j) {
            //don't process ones we already have simulated locally
            if(player.inputs[j].seq <= player.last_input_seq) continue;

            let input = player.inputs[j].inputs;
            let c = input.length;
            for(let i = 0; i < c; ++i) {
                let key = input[i];
                if(key == 'l') {
                    x_dir -= 1;
                }
                if(key == 'r') {
                    x_dir += 1;
                }
                if(key == 'd') {
                    y_dir += 1;
                }
                if(key == 'u') {
                    y_dir -= 1;
                }
            } //for all input values

        } //for each input command
    } //if we have inputs

    // we have a direction vector now, so apply the same physics as the client
    const resulting_vector = this.physics_movement_vector_from_direction(x_dir, y_dir, delta);

    if (player.inputs.length) {
        // we can now clear the array since these have been processed

        player.last_input_time = player.inputs[ic-1].time;
        player.last_input_seq = player.inputs[ic-1].seq;
    }

    //give it back
    return resulting_vector;

};

game_core.prototype.physics_movement_vector_from_direction = function(x, y, delta) {
    return {
        x: fixedNumber(x * (this.playerspeed * (delta / 1000)), 3),
        y: fixedNumber(y * (this.playerspeed * (delta / 1000)), 3)
    };
};

game_core.prototype.client_handle_input = function (delta){
    // This takes input from the client and keeps a record,
    // It also sends the input information to the server immediately
    // as it is pressed. It also tags each input with a sequence number.
    let x_dir = 0;
    let y_dir = 0;
    const input = [];

    this.client_has_input = false;

    if (this.keyboard.pressed('A') || this.keyboard.pressed('left')) {
        x_dir = -1;
        input.push('l');
    }

    if (this.keyboard.pressed('D') ||
       this.keyboard.pressed('right')) {

        x_dir = 1;
        input.push('r');
    }

    if (this.keyboard.pressed('S') ||
       this.keyboard.pressed('down')) {

        y_dir = 1;
        input.push('d');
    }

    if (this.keyboard.pressed('W') ||
       this.keyboard.pressed('up')) {

        y_dir = -1;
        input.push('u');
    }

    if (input.length) {
        // Update what sequence we are on now
        this.input_seq += 1;

        // Store the input state as a snapshot of what happened.
        this.players.self.inputs.push({
            inputs: input,
            time: fixedNumber(this.local_time, 3),
            seq: this.input_seq
        });

        // Send the packet of information to the server.
        // The input packets are labelled with an 'i' in front.
        let server_packet = 'i.';

        server_packet += input.join('-') + '.';
        server_packet += this.local_time.toFixed(3).replace('.', '-') + '.';
        server_packet += this.input_seq;

        this.socket.send(server_packet);

        // Return the direction if needed
        return this.physics_movement_vector_from_direction(x_dir, y_dir, delta);
    } else {
        return { x: 0, y: 0 };
    }
};

game_core.prototype.client_process_net_prediction_correction = function (delta) {
    // No updates
    if (this.server_updates.length === 0) {
        return;
    }

    // The most recent server update
    const latest_server_data = this.server_updates[this.server_updates.length - 1];

    // Our latest server position
    const my_server_pos = this.players.self.host ? latest_server_data.hp : latest_server_data.cp;

    // Update the debug server position block
    this.ghosts.server_pos_self.pos = Vector.copy(my_server_pos);

    // here we handle our local input prediction ,
    // by correcting it with the server and reconciling its differences
    const my_last_input_on_server = this.players.self.host ? latest_server_data.his : latest_server_data.cis;

    if (my_last_input_on_server) {
        // The last input sequence index in my local input list
        let lastinputseq_index = -1;

        // Find this input in the list, and store the index
        for (let i = 0; i < this.players.self.inputs.length; ++i) {
            if (this.players.self.inputs[i].seq === my_last_input_on_server) {
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

            this.players.self.inputs.splice(0, number_to_clear);
            // The player is now located at the new server position, authoritive server
            this.players.self.cur_state.pos = Vector.copy(my_server_pos);
            this.players.self.last_input_seq = lastinputseq_index;

            // Now we reapply all the inputs that we have locally that
            // the server hasn't yet confirmed. This will 'keep' our position the same,
            // but also confirm the server position at the same time.
            this.client_update_physics(delta);
            this.client_update_local_position();
        }
    }
};

game_core.prototype.client_process_net_updates = function(interpolation) {
    // No updates
    if (!this.server_updates.length) {
        return;
    }

    // First : Find the position in the updates, on the timeline
    // We call this current_time, then we find the past_pos and the target_pos using this,
    // searching throught the server_updates array for current_time in between 2 other times.
    // Then :  other player position = lerp ( past_pos, target_pos, current_time );

    // Find the position in the timeline of updates we stored.
    const current_time = this.client_time;
    const count = this.server_updates.length - 1;
    let target = null;
    let previous = null;

    // We look from the 'oldest' updates, since the newest ones
    // are at the end (list.length-1 for example). This will be expensive
    // only when our time is not found on the timeline, since it will run all
    // samples. Usually this iterates very little before breaking out with a target.
    for (let i = 0; i < count; ++i) {
        const point = this.server_updates[i];
        const next_point = this.server_updates[i + 1];

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
        target = this.server_updates[0];
        previous = this.server_updates[0];
    }

    // Now that we have a target and a previous destination,
    // We can interpolate between then based on 'how far in between' we are.
    // This is simple percentage maths, value/target = [0,1] range of numbers.
    // lerp requires the 0,1 value to lerp to? thats the one.

    if (target && previous) {
        this.target_time = target.t;

        const difference = this.target_time - current_time;
        const max_difference = fixedNumber(target.t - previous.t, 3);
        let time_point = fixedNumber(difference / max_difference, 3);

        // Because we use the same target and previous in extreme cases
        // It is possible to get incorrect values due to division by 0 difference
        // and such. This is a safe guard and should probably not be here. lol.
        if (Number.isNaN(time_point)) {
            time_point = 0;
        }

        if (time_point === Number.NEGATIVE_INFINITY) {
            time_point = 0;
        }

        if (time_point === Number.POSITIVE_INFINITY) {
            time_point = 0;
        }

        // The most recent server update
        const latest_server_data = this.server_updates[this.server_updates.length - 1];

        // These are the exact server positions from this tick, but only for the ghost
        const other_server_pos = this.players.self.host ? latest_server_data.cp : latest_server_data.hp;

        // The other players positions in this timeline, behind us and in front of us
        const other_target_pos = this.players.self.host ? target.cp : target.hp;
        const other_past_pos = this.players.self.host ? previous.cp : previous.hp;

        // update the dest block, this is a simple lerp
        // to the target from the previous point in the server_updates buffer
        this.ghosts.server_pos_other.pos = Vector.copy(other_server_pos);
        this.ghosts.pos_other.pos = Vector.lerp(other_past_pos, other_target_pos, time_point);

        if (this.options.client_smoothing) {
            this.players.other.pos = Vector.lerp(this.players.other.pos, this.ghosts.pos_other.pos, interpolation);
        } else {
            this.players.other.pos = Vector.copy(this.ghosts.pos_other.pos);
        }

        // Now, if not predicting client movement , we will maintain the local player position
        // using the same method, smoothing the players information from the past.
        if (!this.options.client_predict && !this.options.naive_approach) {
            // These are the exact server positions from this tick, but only for the ghost
            const my_server_pos = this.players.self.host ? latest_server_data.hp : latest_server_data.cp;

            // The other players positions in this timeline, behind us and in front of us
            const my_target_pos = this.players.self.host ? target.hp : target.cp;
            const my_past_pos = this.players.self.host ? previous.hp : previous.cp;

            // Snap the ghost to the new server position
            this.ghosts.server_pos_self.pos = Vector.copy(my_server_pos);
            const local_target = Vector.lerp(my_past_pos, my_target_pos, time_point);

            // Smoothly follow the destination position
            if (this.options.client_smoothing) {
                this.players.self.pos = Vector.lerp(this.players.self.pos, local_target, interpolation);
            } else {
                this.players.self.pos = Vector.copy(local_target);
            }
        }
    }
};

game_core.prototype.client_onserverupdate_recieved = function (data) {
    //Lets clarify the information we have locally. One of the players is 'hosting' and
    //the other is a joined in client, so we name these host and client for making sure
    //the positions we get from the server are mapped onto the correct local sprites
    let player_host = this.players.self.host ?  this.players.self : this.players.other;
    let player_client = this.players.self.host ?  this.players.other : this.players.self;
    let this_player = this.players.self;

    //Store the server time (this is offset by the latency in the network, by the time we get it)
    this.server_time = data.t;
    //Update our local offset time from the last server update
    this.client_time = this.server_time - (this.options.net_offset / 1000);

    //One approach is to set the position directly as the server tells you.
    //This is a common mistake and causes somewhat playable results on a local LAN, for example,
    //but causes terrible lag when any ping/latency is introduced. The player can not deduce any
    //information to interpolate with so it misses positions, and packet loss destroys this approach
    //even more so. See 'the bouncing ball problem' on Wikipedia.
    if(this.options.naive_approach) {
        if(data.hp) {
            player_host.pos = Vector.copy(data.hp);
        }

        if(data.cp) {
            player_client.pos = Vector.copy(data.cp);
        }
    } else {
        //Cache the data from the server,
        //and then play the timeline
        //back to the player with a small delay (net_offset), allowing
        //interpolation between the points.
        this.server_updates.push(data);

        //we limit the buffer in seconds worth of updates
        //60fps*buffer seconds = number of samples
        if (this.server_updates.length >= ( 60 * this.options.buffer_size )) {
            this.server_updates.splice(0, 1);
        }

        //We can see when the last tick we know of happened.
        //If client_time gets behind this due to latency, a snap occurs
        //to the last tick. Unavoidable, and a reallly bad connection here.
        //If that happens it might be best to drop the game after a period of time.
        this.oldest_tick = this.server_updates[0].t;

        // Handle the latest positions from the server
        // and make sure to correct our local predictions, making the server have final say.
        this.client_process_net_prediction_correction(1000 / PHYSICS_FPS);
    }
};

game_core.prototype.client_update_local_position = function (){
    if(this.options.client_predict) {
        //Then store the states for clarity,
        let old_state = this.players.self.old_state.pos;
        let current_state = this.players.self.cur_state.pos;

        //Make sure the visual position matches the states we have stored
        this.players.self.pos = current_state;

        //We handle collision on client if predicting.
        this.check_collision(this.players.self);
    }
};

game_core.prototype.client_update_physics = function(delta) {
    // Fetch the new direction from the input buffer,
    // and apply it to the state so we can smooth it in the visual state

    if (this.options.client_predict) {
        this.players.self.old_state.pos = Vector.copy(this.players.self.cur_state.pos);
        let nd = this.process_input(this.players.self, delta);
        this.players.self.cur_state.pos = Vector.add(this.players.self.old_state.pos, nd);
        this.players.self.state_time = this.local_time;
    }
};

game_core.prototype.client_update = function(interpolation) {
    // Network player just gets drawn normally, with interpolation from
    // the server updates, smoothing out the positions from the past.
    // Note that if we don't have prediction enabled - this will also
    // update the actual local client position on screen as well.
    if (!this.options.naive_approach) {
        this.client_process_net_updates(interpolation);
    }
};

game_core.prototype.client_create_configuration = function() {
    this.input_seq = 0;          // When predicting client inputs, we store the last input as a sequence number
    this.net_latency = 0.001;    // the latency between the client and the server (ping/2)
    this.last_ping_time = 0.001; // The time we last sent a ping
    this.target_time = 0.01;     // the time where we want to be in the server timeline
    this.oldest_tick = 0.01;     // the last time tick we have available in the buffer
    this.client_time = 0.01;     // Our local 'clock' based on server time - client interpolation(net_offset).
    this.server_time = 0.01;     // The time the server reported it was at, last we heard from it
};

game_core.prototype.client_reset_positions = function() {

    let player_host = this.players.self.host ?  this.players.self : this.players.other;
    let player_client = this.players.self.host ?  this.players.other : this.players.self;

    //Host always spawns at the top left.
    player_host.pos = { x:20,y:20 };
    player_client.pos = { x:500, y:200 };

    //Make sure the local player physics is updated
    this.players.self.old_state.pos = Vector.copy(this.players.self.pos);
    this.players.self.pos = Vector.copy(this.players.self.pos);
    this.players.self.cur_state.pos = Vector.copy(this.players.self.pos);

    //Position all debug view items to their owners position
    this.ghosts.server_pos_self.pos = Vector.copy(this.players.self.pos);

    this.ghosts.server_pos_other.pos = Vector.copy(this.players.other.pos);
    this.ghosts.pos_other.pos = Vector.copy(this.players.other.pos);
};

game_core.prototype.client_onreadygame = function(data) {
    const server_time = Number.parseFloat(data.replace('-', '.'));
    const player_host = this.players.self.host ? this.players.self : this.players.other;
    const player_client = this.players.self.host ? this.players.other : this.players.self;

    this.local_time = server_time + this.net_latency;

    console.log('server time is about ' + this.local_time);

    // Store their info colors for clarity. server is always blue
    player_host.info_color = '#2288cc';
    player_client.info_color = '#cc8822';

    // Update their information
    player_host.state = 'local_pos(hosting)';
    player_client.state = 'local_pos(joined)';

    this.players.self.state = 'YOU ' + this.players.self.state;

    // Make sure colors are synced up
    this.socket.send('c.' + this.players.self.color);
};

game_core.prototype.client_onjoingame = function(data) {
    // We are not the host
    this.players.self.host = false;
    // Update the local state
    this.players.self.state = 'connected.joined.waiting';
    this.players.self.info_color = '#00bb00';

    // Make sure the positions match servers and other clients
    this.client_reset_positions();
};

game_core.prototype.client_onhostgame = function(data) {
    // The server sends the time when asking us to host, but it should be a new game.
    // so the value will be really small anyway (15 or 16ms)
    const server_time = parseFloat(data.replace('-','.'));

    // Get an estimate of the current time on the server
    this.local_time = server_time + this.net_latency;

    // Set the flag that we are hosting, this helps us position respawns correctly
    this.players.self.host = true;

    // Update debugging information to display state
    this.players.self.state = 'hosting.waiting for a player';
    this.players.self.info_color = '#cc0000';

    // Make sure we start in the correct place as the host.
    this.client_reset_positions();
};

game_core.prototype.client_onconnected = function(data) {
    // The server responded that we are now in a game,
    // this lets us store the information about ourselves and set the colors
    // to show we are now ready to be playing.
    this.players.self.id = data.id;
    this.players.self.info_color = '#cc0000';
    this.players.self.state = 'connected';
    this.players.self.online = true;
};

game_core.prototype.client_on_otherclientcolorchange = function(data) {
    this.players.other.color = data;
};

game_core.prototype.client_ondisconnect = function(data) {
    // When we disconnect, we don't know if the other player is
    // connected or not, and since we aren't, everything goes to offline
    this.players.self.info_color = 'rgba(255,255,255,0.1)';
    this.players.self.state = 'not-connected';
    this.players.self.online = false;

    this.players.other.info_color = 'rgba(255,255,255,0.1)';
    this.players.other.state = 'not-connected';
};

class GameClient extends game_core {
    constructor (config) {
        super(config);
        this._renderer = null;
        this._network = Network().connect(SERVER_URL);

        const updateView = (interpolation) => {
            this.client_update(interpolation);
            this._renderer.draw(this);
        };

        this._physicsLoop = MainLoop.create().setSimulationTimestep(1000 / PHYSICS_FPS).setUpdate((delta) => {
            this.client_handle_input(delta);

            // When we are doing client side prediction, we smooth out our position
            // across frames using local input states we have stored.
            this.client_update_local_position(delta);

            this.client_update_physics(delta);
            this.local_time += delta / 1000;
        }).setDraw(updateView);
    }

    get netPing () {
        return this._network.netPing;
    }

    get netLatency () {
        return this._network.netLatency;
    }

    start (renderer) {
        this._renderer = renderer;
        this._physicsLoop.start();
        this.socket = this._network.listen(this);

        // Ping the server
        setInterval(() => {
            this._network.ping();
        }, this.options.pingTimeout || 1000);
    }

    stop () {
        this._physicsLoop.stop();
    }
}

module.exports = GameClient;
