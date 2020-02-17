var app = require('express')();
var http = require('http').createServer(app);

var io = require('socket.io')(http);

const session = require('cookie-session')({
    name: 'interactive-chess-game',
    secret: 'dasdas0i-23mkjda0-123'
});

const Chess = require('./chess.js');
const ROOT = '/';
const CHAR = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PORT = process.env.PORT || 5000;
var ROOMS_STATE = {};
var USER_TO_ROOM = {};


app.get('/', function(req, res){
  session(req, res, () => {
    if(req.session.user_id == null || !USER_TO_ROOM.hasOwnProperty(req.session.user_id)){
      req.session.user_id = new_user_id();
      USER_TO_ROOM[req.session.user_id] = null;
    }
    else
      res.redirect("/game_page");
  })
  console.log("FROM /",   req.session.user_id);
  res.sendFile(__dirname + '/home.html');
});

app.get('/game_page', function(req, res){
  session(req, res, () => {
    if(req.session.user_id == null || !USER_TO_ROOM.hasOwnProperty(req.session.user_id))
      res.redirect("/");
  })
  res.sendFile(__dirname + '/index.html');
})


function random_id(){
  var length = Math.floor(Math.random()*3) + 5;
  var id = []
  for(var i = 0; i < length; i++){
    id.push(CHAR[Math.floor(Math.random()*CHAR.length)]);
  }
  return id.join('');
}
function new_user_id(){
  var id = random_id();
  while(USER_TO_ROOM.hasOwnProperty(id)){
    id = random_id();
  }
  return id;
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
  var new_game = new Chess();
  ROOMS_STATE[room] = {
    room_number: room,
    p1: null,
    p2: null,
    chess: new_game,
    pause: true
  }
  return room;
}
io.on('connection', function(socket){

  let cookieString = socket.request.headers.cookie;
  let req = {connection: {encrypted: false}, headers: {cookie: cookieString}}
  let res = {getHeader: () =>{}, setHeader: () => {}};
  session(req, res, () => {});


  console.log('a user connected with id: ' + socket.id);

  socket.on('create', function(){
    console.log("FROM CREATE", req.session, req.session.user_id);
    var user_id = req.session.user_id;

    console.log(USER_TO_ROOM)
    //should not enter here
    if(!user_id || !USER_TO_ROOM.hasOwnProperty(user_id)){
      console.log("Holly");
      io.to(socket.id).emit('join', get_response(false, "Something wrong happen, please refresh the page", null));
      return;
    }

    var new_room = create_new_room();

    ROOMS_STATE[new_room].p1 = user_id;
    USER_TO_ROOM[user_id] = new_room;
    console.log('create the room: ' + new_room);
    console.log(USER_TO_ROOM);
    socket.join(new_room);

    var response = get_response(true, null, {details: ROOMS_STATE[new_room]});
    io.to(socket.id).emit('join', '/game_page');

  })
  socket.on('join_home_page', function(room){
    console.log("FROM JOIN", req.session, req.session.user_id);
    console.log('some one want to join: ' + room);
    var user_id = req.session.user_id;
    if(!user_id || !USER_TO_ROOM.hasOwnProperty(user_id) || USER_TO_ROOM[user_id] != null){
      io.to(socket.id).emit('msg', get_response(false, "Something wrong happen, please refresh the page", null));
      return;
    }


    if(!ROOMS_STATE.hasOwnProperty(room) || ROOMS_STATE[room].p1 != null && ROOMS_STATE[room].p2 != null){
      io.to(socket.id).emit('msg', get_response(false, "Room does not exists or full, please enter a valid room ID", null));
      return;
    }

    if(ROOMS_STATE[room].p1 == null){
      ROOMS_STATE[room].p1 = user_id;
    }
    else{
      ROOMS_STATE[room].p2 = user_id;
    }
    USER_TO_ROOM[user_id] = room;

    io.to(socket.id).emit('join', "/game_page");

  })
  socket.on('join_game_page', function(){
    console.log("FROM JOIN game page", req.session.user_id);
    console.log(USER_TO_ROOM);
    var user_id = req.session.user_id;

    //should not enter here
    if(!user_id || !USER_TO_ROOM.hasOwnProperty(user_id) || USER_TO_ROOM[user_id] == null){
      io.to(socket.id).emit('join', get_response(false, "Something wrong happen, please refresh the page", null));
      return;
    }
    var room = USER_TO_ROOM[user_id];

    if(user_id != ROOMS_STATE[room].p1 && user_id != ROOMS_STATE[room].p2){
      io.to(socket.id).emit('render', get_response(true, null, {msg:"Something wrong happen, please rejoin the room"}));
      return;
    }
    socket.join(room);

    var msg = null;
    //if the room is full, ready to start
    if(ROOMS_STATE[room].p1 != null && ROOMS_STATE[room].p2 != null){
      ROOMS_STATE[room].pause = false;
      msg = "Ready to start!";
    }

    var response = get_response(true, null, {room: room, msg: msg, details: ROOMS_STATE[room]});

    socket.to(room).emit('render', response);
    io.to(socket.id).emit('render', response);

  })
  socket.on('move', function(pos){

    var user_id = req.session.user_id;

    //should not enter here
    if(!user_id || !USER_TO_ROOM.hasOwnProperty(user_id)){
      io.to(socket.id).emit('join', get_response(false, "Something wrong happen, please refresh the page", null));
      return;
    }
    //Make sure user has entered the chess room
    if(USER_TO_ROOM[user_id] == null){
      io.to(socket.id).emit('msg', get_response(true, null, {msg:"You did not enter any room, please create or join a room"}));
      return;
    }

    var room = USER_TO_ROOM[user_id];
    var game = ROOMS_STATE[room].chess;

    if(ROOMS_STATE[room].pause == true){
      io.to(socket.id).emit('render', get_response(true, null, {details: ROOMS_STATE[room], msg:"Please wait for your opponent to join!"}));
      return;
    }
    //another checking, this should not be true
    if(user_id != ROOMS_STATE[room].p1 && user_id != ROOMS_STATE[room].p2){
      io.to(socket.id).emit('render', get_response(true, null, {details: ROOMS_STATE[room], msg:"Something wrong happen, please rejoin the room"}));
      return;
    }

    //check for the turn
    var is_player1 = (user_id == ROOMS_STATE[room].p1)? true: false;
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
    // var user_id = req.session.user_id;
    // if(USER_TO_ROOM.hasOwnProperty(user_id)){
    //   var room = USER_TO_ROOM[user_id];
    //
    //   //remove user from room state
    //   if(room != null && ROOMS_STATE[room].p1 == user_id)
    //     ROOMS_STATE[room].p1 = null;
    //   else if(room != null && ROOMS_STATE[room].p2 == user_id)
    //     ROOMS_STATE[room].p2 = null;
    //
    //   //delete the mapping
    //   delete USER_TO_ROOM[user_id];
    // }

    console.log('user disconnected');
  })
});
http.listen(PORT, function(){
  console.log(`listening on *:${PORT}`);


});
