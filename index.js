var app = require('express')();
var http = require('http').createServer(app);

var io = require('socket.io')(http);

const session = require('cookie-session')({
    name: 'interactive-chess-game',
    secret: 'dasdas0i-23mkjda0-123'
});

const RequestHandler = require('./requestHandler.js');
const PORT = process.env.PORT || 5000;

var request_handler = new RequestHandler();



app.get('/', function(req, res){
  session(req, res, () => {
    var user_id = req.session.user_id;
    if(!request_handler.authenticate_user(user_id).success){
      req.session.user_id = request_handler.create_new_user();
      res.sendFile(__dirname + '/home.html');

    }
    else
      res.redirect("game_page");
  })


});

app.get("/game_page", function(req, res){
  session(req, res, () => {
    var user_id = req.session.user_id;
    if(!request_handler.authenticate_user(user_id).success)
      res.redirect("/");
    else
      res.sendFile(__dirname + '/index.html');
  })

})

function get_response(success, error, data){
  return {
      success: success,
      error: error,
      data: data
    }
}

io.on('connection', function(socket){

  var cookieString = socket.request.headers.cookie;
  var req = {connection: {encrypted: false}, headers: {cookie: cookieString}}
  var res = {getHeader: () =>{}, setHeader: () => {}};
  session(req, res, () => {});


  console.log('a user connected with id: ' + socket.id);

  socket.on('create', function(){
    var user_id = req.session.user_id;
    console.log(user_id + "wants to create new room");
    var create_room_result = request_handler.create_room(user_id);

    if(!create_room_result.success){
      io.to(socket.id).emit('msg', get_response(false, create_room_result.msg, null));
      return;
    }

    var new_room = request_handler.get_user_room(user_id);

    socket.join(new_room);

    io.to(socket.id).emit('join', "/game_page");

  })
  socket.on('join_home_page', function(room_id){
    var user_id = req.session.user_id;
    console.log( user_id + ' wants to join: ' + room_id);

    var join_room_result = request_handler.join_room(user_id, room_id);
    if(!join_room_result.success){
      io.to(socket.id).emit('msg', get_response(false, join_room_result.msg, null));
      return;
    }

    io.to(socket.id).emit('join', "game_page");

  })
  socket.on('join_game_page', function(){
    var user_id = req.session.user_id;
    console.log(user_id + "wants to join the game page");
    var room = request_handler.get_user_room(user_id);

    if(room == null){
      io.to(socket.id).emit('msg', get_response(false, "Something wrong happened, please refresh the page", null));
      return;
    }

    var join_room_result = request_handler.join_room(user_id, room.room_number);
    if(!join_room_result.success){
      io.to(socket.id).emit('msg', get_response(false, "Something wrong happened, please refresh the page", null));
      return;
    }
    socket.join(room);


    var response = get_response(true, null, {room: room, msg: join_room_result.msg, details: room});

    socket.to(room).emit('render', response);
    io.to(socket.id).emit('render', response);

  })
  socket.on('move', function(move_string){

    var user_id = req.session.user_id;
    var is_player1 = request_handler.is_player1(user_id);
    var move_result = request_handler.make_move(move_string, user_id);
    var room = request_handler.get_user_room(user_id);

    if(!move_result.success){
      io.to(socket.id).emit('render', get_response(true, null, {details: room, is_p1: is_player1, msg: move_result.msg}));
      return;
    }

    //success move

    var response_for_sender = get_response(true, null, {details: room, is_p1: is_player1, msg: move_result.msg});
    var response_for_opponent = get_response(true, null, {details: room, is_p1: !is_player1, msg: "Your opponent just made a move"});

    io.to(socket.id).emit('render', response_for_sender);
    socket.to(room).emit('render', response_for_opponent);

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
