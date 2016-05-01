'use strict';

const MainLoop = require('./server/mainloop');
const SocketClient = require('socket.io-client');
const SERVER_URL = 'http://localhost:4004';
const Player = require('./Player');
const Vector = require('./lib/vector');
const fixedNumber = require('./lib/fixed-number');

const PHYSICS_FPS = 66;
const DEBUG = true;

const game_core = function(game_instance){
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

    this.ghosts.server_pos_self.pos = { x:20, y:20 };
    this.ghosts.pos_other.pos = { x:500, y:200 };
    this.ghosts.server_pos_other.pos = { x:500, y:200 };

    //The speed at which the clients move.
    this.playerspeed = 120;

    //A local timer for precision on client
    this.local_time = PHYSICS_FPS / 1000 / 1000;

    //Create a keyboard handler
    this.keyboard = new THREEx.KeyboardState();

    //Create the default configuration settings
    this.client_create_configuration();

    //A list of recent server updates we interpolate across
    //This is the buffer that is the driving factor for our networking
    this.server_updates = [];

    //Connect to the socket.io server!
    this.client_connect_to_server();

    //We start pinging the server to determine latency
    this.client_create_ping_timer();

    //Set their colors from the storage or locally
    this.color = localStorage.getItem('color') || '#cc8822' ;
    localStorage.setItem('color', this.color);
    this.players.self.color = this.color;

    if (DEBUG) {
        this.client_create_debug_gui();
    }
};

game_core.prototype.check_collision = function( item ) {
    // Left wall.
    if (item.pos.x <= item.pos_limits.x_min) {
        item.pos.x = item.pos_limits.x_min;
    }

    // Right wall
    if (item.pos.x >= item.pos_limits.x_max ) {
        item.pos.x = item.pos_limits.x_max;
    }

    // Roof wall.
    if (item.pos.y <= item.pos_limits.y_min) {
        item.pos.y = item.pos_limits.y_min;
    }

    // Floor wall
    if (item.pos.y >= item.pos_limits.y_max ) {
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
        for(var j = 0; j < ic; ++j) {
            //don't process ones we already have simulated locally
            if(player.inputs[j].seq <= player.last_input_seq) continue;

            var input = player.inputs[j].inputs;
            var c = input.length;
            for(var i = 0; i < c; ++i) {
                var key = input[i];
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

game_core.prototype.update_physics = function (delta) {
    this.client_update_physics(delta);
};

game_core.prototype.client_handle_input = function (delta){
    // This takes input from the client and keeps a record,
    // It also sends the input information to the server immediately
    // as it is pressed. It also tags each input with a sequence number.
    let x_dir = 0;
    let y_dir = 0;
    const input = [];

    this.client_has_input = false;

    if(this.keyboard.pressed('A') || this.keyboard.pressed('left')) {
        x_dir = -1;
        input.push('l');
    }

    if( this.keyboard.pressed('D') ||
       this.keyboard.pressed('right')) {

        x_dir = 1;
        input.push('r');

    } //right

    if( this.keyboard.pressed('S') ||
       this.keyboard.pressed('down')) {

        y_dir = 1;
        input.push('d');

    } //down

    if( this.keyboard.pressed('W') ||
       this.keyboard.pressed('up')) {

        y_dir = -1;
        input.push('u');

    } //up

    if(input.length) {

        //Update what sequence we are on now
        this.input_seq += 1;

        //Store the input state as a snapshot of what happened.
        this.players.self.inputs.push({
            inputs : input,
            time : fixedNumber(this.local_time, 3),
            seq : this.input_seq
        });

        //Send the packet of information to the server.
        //The input packets are labelled with an 'i' in front.
        var server_packet = 'i.';
        server_packet += input.join('-') + '.';
        server_packet += this.local_time.toFixed(3).replace('.','-') + '.';
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

    //The most recent server update
    var latest_server_data = this.server_updates[this.server_updates.length-1];

    //Our latest server position
    var my_server_pos = this.players.self.host ? latest_server_data.hp : latest_server_data.cp;

    //Update the debug server position block
    this.ghosts.server_pos_self.pos = Vector.copy(my_server_pos);

    //here we handle our local input prediction ,
    //by correcting it with the server and reconciling its differences

    var my_last_input_on_server = this.players.self.host ? latest_server_data.his : latest_server_data.cis;
    if(my_last_input_on_server) {
        //The last input sequence index in my local input list
        var lastinputseq_index = -1;
        //Find this input in the list, and store the index
        for(var i = 0; i < this.players.self.inputs.length; ++i) {
            if(this.players.self.inputs[i].seq == my_last_input_on_server) {
                lastinputseq_index = i;
                break;
            }
        }

        //Now we can crop the list of any updates we have already processed
        if(lastinputseq_index != -1) {
            //so we have now gotten an acknowledgement from the server that our inputs here have been accepted
            //and that we can predict from this known position instead

            //remove the rest of the inputs we have confirmed on the server
            var number_to_clear = Math.abs(lastinputseq_index - (-1));
            this.players.self.inputs.splice(0, number_to_clear);
            //The player is now located at the new server position, authoritive server
            this.players.self.cur_state.pos = Vector.copy(my_server_pos);
            this.players.self.last_input_seq = lastinputseq_index;
            //Now we reapply all the inputs that we have locally that
            //the server hasn't yet confirmed. This will 'keep' our position the same,
            //but also confirm the server position at the same time.
            this.client_update_physics(delta);
            this.client_update_local_position();

        } // if(lastinputseq_index != -1)
    } //if my_last_input_on_server
};

game_core.prototype.client_process_net_updates = function(interpolation) {
    // No updates
    if (!this.server_updates.length) {
        return;
    }

    //First : Find the position in the updates, on the timeline
    //We call this current_time, then we find the past_pos and the target_pos using this,
    //searching throught the server_updates array for current_time in between 2 other times.
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

    //Now that we have a target and a previous destination,
    //We can interpolate between then based on 'how far in between' we are.
    //This is simple percentage maths, value/target = [0,1] range of numbers.
    //lerp requires the 0,1 value to lerp to? thats the one.

    if(target && previous) {

        this.target_time = target.t;

        var difference = this.target_time - current_time;
        var max_difference = fixedNumber(target.t - previous.t, 3);
        var time_point = fixedNumber(difference/max_difference, 3);

        //Because we use the same target and previous in extreme cases
        //It is possible to get incorrect values due to division by 0 difference
        //and such. This is a safe guard and should probably not be here. lol.
        if( isNaN(time_point) ) time_point = 0;
        if(time_point == -Infinity) time_point = 0;
        if(time_point == Infinity) time_point = 0;

        //The most recent server update
        var latest_server_data = this.server_updates[ this.server_updates.length-1 ];

        //These are the exact server positions from this tick, but only for the ghost
        var other_server_pos = this.players.self.host ? latest_server_data.cp : latest_server_data.hp;

        //The other players positions in this timeline, behind us and in front of us
        var other_target_pos = this.players.self.host ? target.cp : target.hp;
        var other_past_pos = this.players.self.host ? previous.cp : previous.hp;

        //update the dest block, this is a simple lerp
        //to the target from the previous point in the server_updates buffer
        this.ghosts.server_pos_other.pos = Vector.copy(other_server_pos);
        this.ghosts.pos_other.pos = Vector.lerp(other_past_pos, other_target_pos, time_point);

        if (this.client_smoothing) {
            this.players.other.pos = Vector.lerp(this.players.other.pos, this.ghosts.pos_other.pos, interpolation);
        } else {
            this.players.other.pos = Vector.copy(this.ghosts.pos_other.pos);
        }

        //Now, if not predicting client movement , we will maintain the local player position
        //using the same method, smoothing the players information from the past.
        if(!this.client_predict && !this.naive_approach) {

            //These are the exact server positions from this tick, but only for the ghost
            var my_server_pos = this.players.self.host ? latest_server_data.hp : latest_server_data.cp;

            //The other players positions in this timeline, behind us and in front of us
            var my_target_pos = this.players.self.host ? target.hp : target.cp;
            var my_past_pos = this.players.self.host ? previous.hp : previous.cp;

            //Snap the ghost to the new server position
            this.ghosts.server_pos_self.pos = Vector.copy(my_server_pos);
            var local_target = Vector.lerp(my_past_pos, my_target_pos, time_point);

            //Smoothly follow the destination position
            if (this.client_smoothing) {
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
    var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;
    var this_player = this.players.self;

    //Store the server time (this is offset by the latency in the network, by the time we get it)
    this.server_time = data.t;
    //Update our local offset time from the last server update
    this.client_time = this.server_time - (this.net_offset/1000);

    //One approach is to set the position directly as the server tells you.
    //This is a common mistake and causes somewhat playable results on a local LAN, for example,
    //but causes terrible lag when any ping/latency is introduced. The player can not deduce any
    //information to interpolate with so it misses positions, and packet loss destroys this approach
    //even more so. See 'the bouncing ball problem' on Wikipedia.
    if(this.naive_approach) {
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
        if(this.server_updates.length >= ( 60*this.buffer_size )) {
            this.server_updates.splice(0,1);
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
    if(this.client_predict) {
        //Then store the states for clarity,
        var old_state = this.players.self.old_state.pos;
        var current_state = this.players.self.cur_state.pos;

        //Make sure the visual position matches the states we have stored
        this.players.self.pos = current_state;

        //We handle collision on client if predicting.
        this.check_collision(this.players.self);
    }
};

game_core.prototype.client_update_physics = function(delta) {
    //Fetch the new direction from the input buffer,
    //and apply it to the state so we can smooth it in the visual state

    if(this.client_predict) {
        this.players.self.old_state.pos = Vector.copy(this.players.self.cur_state.pos);
        var nd = this.process_input(this.players.self, delta);
        this.players.self.cur_state.pos = Vector.add(this.players.self.old_state.pos, nd);
        this.players.self.state_time = this.local_time;
    }
};

game_core.prototype.client_update = function(renderer, interpolation) {
    //Clear the screen area
    renderer.ctx.clearRect(0,0,720,480);

    //draw help/information if required
    this.client_draw_info(renderer);

    //Network player just gets drawn normally, with interpolation from
    //the server updates, smoothing out the positions from the past.
    //Note that if we don't have prediction enabled - this will also
    //update the actual local client position on screen as well.
    if( !this.naive_approach ) {
        this.client_process_net_updates(interpolation);
    }

    //Now they should have updated, we can draw the entity
    this.players.other.draw(renderer);

    //When we are doing client side prediction, we smooth out our position
    //across frames using local input states we have stored.
    this.client_update_local_position();

    //And then we finally draw
    this.players.self.draw(renderer);

    //and these
    if(this.show_dest_pos && !this.naive_approach) {
        this.ghosts.pos_other.draw(renderer);
    }

    //and lastly draw these
    if(this.show_server_pos && !this.naive_approach) {
        this.ghosts.server_pos_self.draw(renderer);
        this.ghosts.server_pos_other.draw(renderer);
    }

    //Work out the fps average
    this.client_refresh_fps();

}; //game_core.update_client

game_core.prototype.client_create_ping_timer = function() {

    //Set a ping timer to 1 second, to maintain the ping/latency between
    //client and server and calculated roughly how our connection is doing

    setInterval(function(){
        this.last_ping_time = new Date().getTime() - this.fake_lag;
        this.socket.send('p.' + (this.last_ping_time) );
    }.bind(this), 1000);

}; //game_core.client_create_ping_timer


game_core.prototype.client_create_configuration = function() {
    this.show_help = false;             //Whether or not to draw the help text
    this.naive_approach = false;        //Whether or not to use the naive approach
    this.show_server_pos = false;       //Whether or not to show the server position
    this.show_dest_pos = false;         //Whether or not to show the interpolation goal
    this.client_predict = true;         //Whether or not the client is predicting input
    this.input_seq = 0;                 //When predicting client inputs, we store the last input as a sequence number
    this.client_smoothing = true;       //Whether or not the client side prediction tries to smooth things out
    this.client_smooth = 25;            //amount of smoothing to apply to client update dest

    this.net_latency = 0.001;           //the latency between the client and the server (ping/2)
    this.net_ping = 0.001;              //The round trip time from here to the server,and back
    this.last_ping_time = 0.001;        //The time we last sent a ping
    this.fake_lag = 0;                //If we are simulating lag, this applies only to the input client (not others)
    this.fake_lag_time = 0;

    this.net_offset = 100;              //100 ms latency between server and client interpolation for other clients
    this.buffer_size = 2;               //The size of the server history to keep for rewinding/interpolating.
    this.target_time = 0.01;            //the time where we want to be in the server timeline
    this.oldest_tick = 0.01;            //the last time tick we have available in the buffer

    this.client_time = 0.01;            //Our local 'clock' based on server time - client interpolation(net_offset).
    this.server_time = 0.01;            //The time the server reported it was at, last we heard from it

    this.dt = 0.016;                    //The time that the last frame took to run
    this.fps = 0;                       //The current instantaneous fps (1/this.dt)
    this.fps_avg_count = 0;             //The number of samples we have taken for fps_avg
    this.fps_avg = 0;                   //The current average fps displayed in the debug UI
    this.fps_avg_acc = 0;               //The accumulation of the last avgcount fps samples

    this.lit = 0;
    this.llt = new Date().getTime();
};

game_core.prototype.client_create_debug_gui = function() {
    this.gui = new dat.GUI();

    var _playersettings = this.gui.addFolder('Your settings');

    this.colorcontrol = _playersettings.addColor(this, 'color');

    //We want to know when we change our color so we can tell
    //the server to tell the other clients for us
    this.colorcontrol.onChange(function(value) {
        this.players.self.color = value;
        localStorage.setItem('color', value);
        this.socket.send('c.' + value);
    }.bind(this));

    _playersettings.open();

    var _othersettings = this.gui.addFolder('Methods');

    _othersettings.add(this, 'naive_approach').listen();
    _othersettings.add(this, 'client_smoothing').listen();
    _othersettings.add(this, 'client_smooth').listen();
    _othersettings.add(this, 'client_predict').listen();

    var _debugsettings = this.gui.addFolder('Debug view');

    _debugsettings.add(this, 'show_help').listen();
    _debugsettings.add(this, 'fps_avg').listen();
    _debugsettings.add(this, 'show_server_pos').listen();
    _debugsettings.add(this, 'show_dest_pos').listen();
    _debugsettings.add(this, 'local_time').listen();

    _debugsettings.open();

    var _consettings = this.gui.addFolder('Connection');
    _consettings.add(this, 'net_latency').step(0.001).listen();
    _consettings.add(this, 'net_ping').step(0.001).listen();

    //When adding fake lag, we need to tell the server about it.
    var lag_control = _consettings.add(this, 'fake_lag').step(0.001).listen();
    lag_control.onChange(function(value){
        this.socket.send('l.' + value);
    }.bind(this));

    _consettings.open();

    var _netsettings = this.gui.addFolder('Networking');

    _netsettings.add(this, 'net_offset').min(0.01).step(0.001).listen();
    _netsettings.add(this, 'server_time').step(0.001).listen();
    _netsettings.add(this, 'client_time').step(0.001).listen();
    //_netsettings.add(this, 'oldest_tick').step(0.001).listen();

    _netsettings.open();

}; //game_core.client_create_debug_gui

game_core.prototype.client_reset_positions = function() {

    var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;

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

}; //game_core.client_reset_positions

game_core.prototype.client_onreadygame = function(data) {
    var server_time = parseFloat(data.replace('-','.'));
    var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;

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

game_core.prototype.client_onping = function(data) {
    this.net_ping = new Date().getTime() - parseFloat( data );
    this.net_latency = this.net_ping/2;
};

game_core.prototype.client_onnetmessage = function(data) {

    var commands = data.split('.');
    var command = commands[0];
    var subcommand = commands[1] || null;
    var commanddata = commands[2] || null;

    switch(command) {
        case 's': {
            switch(subcommand) {
                case 'h': //host a game requested
                    this.client_onhostgame(commanddata); break;

                case 'j': //join a game requested
                    this.client_onjoingame(commanddata); break;

                case 'r': //ready a game requested
                    this.client_onreadygame(commanddata); break;

                case 'e': //end game requested
                    this.client_ondisconnect(commanddata); break;

                case 'p': //server ping
                    this.client_onping(commanddata); break;

                case 'c': //other player changed colors
                    this.client_on_otherclientcolorchange(commanddata); break;
            }
            break;
        }
    }
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

game_core.prototype.client_connect_to_server = function() {

    //Store a local reference to our connection to the server
    this.socket = SocketClient(SERVER_URL);

    //When we connect, we are not 'connected' until we have a server id
    //and are placed in a game by the server. The server sends us a message for that.
    this.socket.on('connect', function(){
        this.players.self.state = 'connecting';
    }.bind(this));

    //Sent when we are disconnected (network, server down, etc)
    this.socket.on('disconnect', this.client_ondisconnect.bind(this));
    //Sent each tick of the server simulation. This is our authoritive update
    this.socket.on('onserverupdate', this.client_onserverupdate_recieved.bind(this));
    //Handle when we connect to the server, showing state and storing id's.
    this.socket.on('onconnected', this.client_onconnected.bind(this));
    //On error we just show that we are not connected for now. Can print the data.
    this.socket.on('error', this.client_ondisconnect.bind(this));
    //On message from the server, we parse the commands and send it to the handlers
    this.socket.on('message', this.client_onnetmessage.bind(this));
};


game_core.prototype.client_refresh_fps = function() {

    //We store the fps for 10 frames, by adding it to this accumulator
    this.fps = 1/this.dt;
    this.fps_avg_acc += this.fps;
    this.fps_avg_count++;

    //When we reach 10 frames we work out the average fps
    if(this.fps_avg_count >= 10) {

        this.fps_avg = this.fps_avg_acc / 10;
        this.fps_avg_count = 1;
        this.fps_avg_acc = this.fps;

    } //reached 10 frames
};


game_core.prototype.client_draw_info = function(renderer) {

    // We don't want this to be too distracting
    renderer.ctx.fillStyle = 'rgba(255,255,255,0.3)';

    // They can hide the help with the debug GUI
    if(this.show_help) {
        renderer.ctx.fillText('net_offset : local offset of others players and their server updates. Players are net_offset "in the past" so we can smoothly draw them interpolated.', 10 , 30);
        renderer.ctx.fillText('server_time : last known game time on server', 10 , 70);
        renderer.ctx.fillText('client_time : delayed game time on client for other players only (includes the net_offset)', 10 , 90);
        renderer.ctx.fillText('net_latency : Time from you to the server. ', 10 , 130);
        renderer.ctx.fillText('net_ping : Time from you to the server and back. ', 10 , 150);
        renderer.ctx.fillText('fake_lag : Add fake ping/lag for testing, applies only to your inputs (watch server_pos block!). ', 10 , 170);
        renderer.ctx.fillText('client_smoothing/client_smooth : When updating players information from the server, it can smooth them out.', 10 , 210);
        renderer.ctx.fillText(' This only applies to other clients when prediction is enabled, and applies to local player with no prediction.', 170 , 230);

    } //if this.show_help

    //Draw some information for the host
    if(this.players.self.host) {
        renderer.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        renderer.ctx.fillText('You are the host', 10 , 465);
    }


    //Reset the style back to full white.
    renderer.ctx.fillStyle = 'rgba(255,255,255,1)';
};

class GameClient extends game_core {
    constructor (renderer) {
        super();
        this._renderer = null;

        const updateView = (interpolation) => {
            this.client_update(this._renderer, interpolation);
        }

        this._physicsLoop = MainLoop.create().setSimulationTimestep(1000 / PHYSICS_FPS).setUpdate((delta) => {
            this.client_handle_input(delta);
            this.update_physics(delta);
            this.local_time += delta / 1000;
        }).setDraw(updateView);
    }

    start (renderer) {
        this._renderer = renderer;
        this._physicsLoop.start();
    }

    stop () {
        this._physicsLoop.stop();
    }
}

module.exports = GameClient;
