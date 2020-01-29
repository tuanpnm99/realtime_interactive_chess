var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const Chess = require('./chess.js');
const ROOT = '/';
const CHAR = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
var ROOM_IDS = {};

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
  while(ROOM_IDS.hasOwnProperty(id)){
    id = random_id();
  }
  return id;
}
function get_rooms(io){
  return io.nsps[ROOT].adapter.rooms
}
function get_response(success, error, data){
  return {
      success: success,
      error: error,
      data: data
    }
}
function create_new_room(player1_id){
  room = new_room_number();
  var new_game = new Chess();
  ROOM_IDS[room] = {
    p1: player1_id,
    p2: null,
    chess: new_game
  }
  return room;
}
io.on('connection', function(socket){
  console.log('a user connected with id: ' + socket.id);

  socket.on('join', function(room){
    console.log('some one want to join: ' + room);
    var rooms = get_rooms(io);
    if(room != 'CREATE' && (!rooms[room] || rooms[room].length == 2)){
      io.to(socket.id).emit('join', get_response(false, "Room does not exist or full, please create new room", null));
      return;
    }
    var join_room = room;
    if(room == 'CREATE'){
      join_room = create_new_room(socket.id);
    }
    else{
      ROOM_IDS[join_room].p2 = socket.id;
    }
    socket.join(join_room);
    console.log('join the room: ' + join_room);
    var response = get_response(true, null, {room: join_room, details: ROOM_IDS[join_room]});
    io.to(socket.id).emit('join', response);
    socket.to(join_room).emit('render', response);
    io.to(socket.id).emit('render', response);
  })
  socket.on('move', function(pos){
    //Make sure user has entered the chess room
    var rooms = Object.keys(socket.rooms);
    if(rooms.length != 2){
        io.to(socket.id).emit('msg', get_response(true, null, {msg:"You entered more than 1 room"}));
        return;
    };

    var chess_room = rooms[0];
    if(chess_room == socket.id) chess_room = rooms[1];

    console.log('Move from: ' + socket.id + " " + pos);
    console.log("Room number: " + chess_room);
    var game = ROOM_IDS[chess_room].chess;
    var move = pos.split(',');
    var row1 = parseInt(move[0]), col1 = parseInt(move[1]), row2 = parseInt(move[2]), col2 = parseInt(move[3]);

    if(isNaN(row1) || isNaN(col1) || isNaN(row2) || isNaN(col2)){
      io.to(socket.id).emit('msg', get_response(true, null, {msg:"Move: Invalid Position"}));
      return;
    }

    var move_result = game.move(row1, col1, row2, col2);
    console.log(move_result);
    var response = get_response(true, null, {details: ROOM_IDS[chess_room]});
    socket.to(chess_room).emit('render', response);
    io.to(socket.id).emit('render', response);

  });
  socket.on('get_avail_move', function(pos){
    var rooms = Object.keys(socket.rooms);
    if(rooms.length != 2){
        io.to(socket.id).emit('msg', get_response(true, null, {msg:"You entered more than 1 room"}));
        return;
    };
    var chess_room = rooms[0];
    if(chess_room == socket.id) chess_room = rooms[1];

    var game = ROOM_IDS[chess_room].chess;

    var pos = pos.split(',');
    var row = pos[0], col = pos[1];
    if(isNaN(row) || isNaN(col)){
      io.to(socket.id).emit('msg', get_response(true, null, {msg: "Get Availabile moves: Invalid Position "}));
      return;
    }
    var avail_moves = game.available_moves(row, col);
    io.to(socket.id).emit('get_avail_move', get_response(true, null, {moves: avail_moves}));


  })
  socket.on('disconnect', function(){
    console.log('user disconnected');
  })
});
http.listen(3000, function(){
  console.log('listening on *:3000');


});
