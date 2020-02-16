var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
//var session = require('client-sessions');

const Chess = require('./chess.js');
const ROOT = '/';
const CHAR = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PORT = process.env.PORT || 5000;
//
// app.use(session({
//     cookieName: 'session',
//     secret: 'asdfasdf23423',
//     duration: 30 * 60 * 1000,
//     activeDuration: 5 * 60 * 1000,
// }));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
app.get('/game_page', function(req, res){
  res.sendFile(__dirname + '/index.html');
})
var ROOMS_STATE = {};
var USER_TO_ROOM = {};
function random_id(){
  var length = Math.floor(Math.random()*3) + 5;
  var id = []
  for(var i = 0; i < length; i++){
    id.push(CHAR[Math.floor(Math.random()*CHAR.length)]);
  }
  return id.join('');
}
function new_room_number(){
  var id = random_id();
  while(ROOMS_STATE.hasOwnProperty(id)){
    id = random_id();
  }
  return id;
}
function get_rooms(){
  return io.nsps[ROOT].adapter.rooms
}
function get_response(success, error, data){
  return {
      success: success,
      error: error,
      data: data
    }
}
function create_new_room(){
  room = new_room_number();
  console.log(room);
  var new_game = new Chess();
  console.log(new_game);
  ROOMS_STATE[room] = {
    room_number: room,
    p1: null,
    p2: null,
    chess: new_game,
    pause: true
  }
  return room;
}
function is_valid_to_join(room){
  var rooms = get_rooms();
  if(!rooms[room] || rooms[room].length == 2)
    return false;
  return true;
}
io.on('connection', function(socket){
  console.log('a user connected with id: ' + socket.id);

  socket.on('create', function(){
    new_room = create_new_room();

    ROOMS_STATE[new_room].p1 = socket.id;
    USER_TO_ROOM[socket.id] = new_room;
    console.log('create the room: ' + new_room);
    socket.join(new_room);

    var response = get_response(true, null, {details: ROOMS_STATE[new_room]});


    io.to(socket.id).emit('join', '/game_page');

    io.to(socket.id).emit('render', response);
  })
  socket.on('join', function(room){
    console.log('some one want to join: ' + room);
    if(!is_valid_to_join(room)){
      io.to(socket.id).emit('join', get_response(false, "Room does not exist or full, please create new room", null));
      return;
    }
    var join_room = room;
    ROOMS_STATE[join_room].p2 = socket.id;
    ROOMS_STATE[join_room].pause = false;

    USER_TO_ROOM[socket.id] = join_room;
    socket.join(join_room);

    console.log('join the room: ' + join_room);

    var response = get_response(true, null, {room: join_room, details: ROOMS_STATE[join_room]});

    io.to(socket.id).emit('join', response);

    socket.to(join_room).emit('render', response);
    io.to(socket.id).emit('render', response);


  })
  socket.on('move', function(pos){
    //Make sure user has entered the chess room
    if(!USER_TO_ROOM.hasOwnProperty(socket.id)){
      io.to(socket.id).emit('msg', get_response(true, null, {msg:"You did not enter any room, please create or join a room"}));
      return;
    }

    var room = USER_TO_ROOM[socket.id];
    var game = ROOMS_STATE[room].chess;

    if(ROOMS_STATE[room].pause == true){
      io.to(socket.id).emit('render', get_response(true, null, {details: ROOMS_STATE[room], msg:"Please wait for your opponent to join!"}));
      return;
    }
    //another checking, this should not be true
    if(socket.id != ROOMS_STATE[room].p1 && socket.id != ROOMS_STATE[room].p2){
      io.to(socket.id).emit('render', get_response(true, null, {details: ROOMS_STATE[room], msg:"Something wrong happen, please rejoin the room"}));
      return;
    }

    //check for the turn
    var is_player1 = (socket.id == ROOMS_STATE[room].p1)? true: false;
    if(is_player1 != game.p1_turn){
      io.to(socket.id).emit('render', get_response(true, null, {details: ROOMS_STATE[room], msg:"This is your opponent turn, please wait!"}));
      return;
    }

    //parse move
    var move = pos.split(',');
    var row1 = parseInt(move[0]), col1 = parseInt(move[1]), row2 = parseInt(move[2]), col2 = parseInt(move[3]);
    if(isNaN(row1) || isNaN(col1) || isNaN(row2) || isNaN(col2)){
      io.to(socket.id).emit('render', get_response(true, null, {details: ROOMS_STATE[room], is_p1: is_player1, msg:"Move: Invalid Position"}));
      return;
    }

    //make move
    var move_result = game.move(row1, col1, row2, col2);
    console.log(move_result);

    //response
    var response_for_sender = get_response(true, null, {details: ROOMS_STATE[room], is_p1: is_player1, msg: move_result[1]});
    var response_for_opponent = get_response(true, null, {details: ROOMS_STATE[room], is_p1: !is_player1, msg: "Your opponent just made a move"});

    io.to(socket.id).emit('render', response_for_sender);

    if(move_result[0] == true){
      socket.to(room).emit('render', response_for_opponent);
    }


  });
  socket.on('disconnect', function(){
    if(USER_TO_ROOM.hasOwnProperty(socket.id)){
      var room = USER_TO_ROOM[socket.id];
      //remove user from room state
      if(ROOMS_STATE[room].p1 == socket.id)
        ROOMS_STATE[room].p1 = null;
      else if(ROOMS_STATE[room].p2 == socket.id)
        ROOMS_STATE[room].p2 = null;

      //delete the mapping
      delete USER_TO_ROOM[socket.id];
    }

    console.log('user disconnected');
  })
});
http.listen(PORT, function(){
  console.log(`listening on *:${PORT}`);


});
