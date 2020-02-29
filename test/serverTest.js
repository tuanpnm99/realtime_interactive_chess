const assert = require('chai').assert;
const {Chess, Piece, Pos, ChessRules} = require('../chess.js');
const RequestHandler = require('../requestHandler.js');


describe('Individual Components Unit Test', function(){

  var request_handler = new RequestHandler();
  var room_manager = request_handler.ROOM_MANAGER;
  var game_manager = request_handler.GAME_MANAGER;

  //TEST SET UP
  var created_user = null;
  var created_user2 = null;
  var created_user3 = null;
  var room = null;
  var room2 = null;

  describe('Room Manager Test', function(){

    it('Create new user1, user2, user3', function(){
      created_user = room_manager.create_new_user();
      assert.isNotNull(created_user);

      created_user2 = room_manager.create_new_user();
      assert.isNotNull(created_user2);

      created_user3 = room_manager.create_new_user();
      assert.isNotNull(created_user3);
    });

    it('Authenticate unregistered user_id', function(){
      var auth_result = room_manager.authenticate_user('dasdsadsad');
      assert.deepEqual(auth_result, { success: false, msg: "Failed to authenticate the user"});
    });

    it('Authenticate null user_id', function(){
      var auth_result = room_manager.authenticate_user(null);
      assert.deepEqual(auth_result, { success: false, msg: "Failed to authenticate the user"});
    });

    it('Authenticate created users', function(){
      var auth_result = room_manager.authenticate_user(created_user);
      assert.deepEqual(auth_result, { success: true, msg: "Success!"});

      auth_result = room_manager.authenticate_user(created_user2);
      assert.deepEqual(auth_result, { success: true, msg: "Success!"});

      auth_result = room_manager.authenticate_user(created_user3);
      assert.deepEqual(auth_result, { success: true, msg: "Success!"});


    });

    it('User1 creates a room', function(){
      var join_room_result = room_manager.create_room(created_user);
      assert.deepEqual(join_room_result, { success: true, msg: "Success!"});
    });

    it('User1 gets room, game should in the pause position', function(){
      room = room_manager.get_user_room(created_user);
      assert.isNotNull(room);
      assert.isNotNull(room.room_number);
      assert.isNotNull(room.chess);
      assert.equal(room.pause, true );
      assert.equal(room.p1, created_user);
    });
    it('User1 creates rejoins the created room', function(){
      var join_room_result = room_manager.join_room(created_user, room.room_number);
      assert.deepEqual(join_room_result, {success: true, msg: "Success to join!"});
    });

    it('User2 joins room with user1, game should be ready to start', function(){
      var join_room_result = room_manager.join_room(created_user2, room.room_number);
      assert.deepEqual(join_room_result, {success: true, msg: "Ready to start the game!"});
      var join_room = room_manager.get_user_room(created_user2);
      assert.equal(join_room, room);
      assert.isNotNull(room.chess);
      assert.equal(room.pause, false);
      assert.equal(room.p1, created_user)
      assert.equal(room.p2, created_user2);
    });
    it('User3 joins the room with user1 and user2, this should be invalid', function(){
      var join_room_result = room_manager.join_room(created_user3, room.room_number);
      assert.deepEqual(join_room_result, {success: false, msg: "The room is full or does not exist! Please try a different room ID"});
    });
    it('User3 creates a new room, should be different than then room1', function(){
      var join_room_result = room_manager.create_room(created_user3);
      assert.deepEqual(join_room_result, { success: true, msg: "Success!"});

      room2 = room_manager.get_user_room(created_user3);
      assert.notDeepEqual(room2, room);
      assert.isNotNull(room2);
      assert.isNotNull(room2.room_number);
      assert.isNotNull(room2.chess);
      assert.equal(room2.pause, true );
      assert.equal(room2.p1, created_user3);

    });
    it('User1 and user2 creates another room after creating a room', function(){
      var create_room_result = room_manager.create_room(created_user);
      assert.deepEqual(create_room_result, {success: false, msg:  "You have already join a room"});

      create_room_result = room_manager.create_room(created_user2);
      assert.deepEqual(create_room_result, {success: false, msg:  "You have already join a room"});

    });

    it('User1 and User 2 joins another room after creating a room', function(){
      var join_room_result = room_manager.join_room(created_user, "dads");
      assert.deepEqual(join_room_result, { success: false, msg: "You have already join a different room"});

      join_room_result = room_manager.join_room(created_user2, "dads");
      assert.deepEqual(join_room_result, { success: false, msg: "You have already join a different room"});

      join_room_result = room_manager.join_room(created_user, room2.room_number);
      assert.deepEqual(join_room_result, { success: false, msg: "You have already join a different room"});

      join_room_result = room_manager.join_room(created_user2, room2.room_number);
      assert.deepEqual(join_room_result, { success: false, msg: "You have already join a different room"});

    });
    it('Unanthenticated user creates room', function(){
      var create_room_result = room_manager.create_room("some unauthenticated user");
      assert.deepEqual(create_room_result, { success: false, msg: "Failed to authenticate the user"});
    });
    it('Unanthenticated gets room', function(){
      var room_result = room_manager.get_user_room("some unauthenticated user");
      assert.isNull(room_result);
    });

    it('Unanthenticated user joins an invalid room', function(){
      var join_room_result = room_manager.join_room("some unauthenticated user", "some invalid room");
      assert.deepEqual(join_room_result, { success: false, msg: "Failed to authenticate the user"});

      join_room_result = room_manager.join_room(null, "some invalid room");
      assert.deepEqual(join_room_result, { success: false, msg: "Failed to authenticate the user"});

    });

    it('Unanthenticated user joins a valid room', function(){
      var join_room_result = room_manager.join_room("some unauthenticated user", room.room_number);
      assert.deepEqual(join_room_result, { success: false, msg: "Failed to authenticate the user"});

      join_room_result = room_manager.join_room(null, room.room_number);
      assert.deepEqual(join_room_result, { success: false, msg: "Failed to authenticate the user"});
    });
  });

    describe('Game Manager Test', function(){
      it("User1 makes a valid move in their turn", function(){
        var move_result = game_manager.make_move("1,3,3,3", created_user, room);
        assert.deepEqual(move_result,  {success: true, msg: "Success move!"});
      });

      it("User1 makes a valid move, but not in their turn", function(){
        var move_result = game_manager.make_move("1,4,3,4", created_user, room);
        assert.deepEqual(move_result,  {success: false, msg: "This is your opponent turn, please wait!"});
      });

      it("User2 makes a invalid move, in their turn", function(){
        var move_result = game_manager.make_move("1,???,3,4", created_user2, room);
        assert.deepEqual(move_result,  {success: false, msg: "Invalid move format!"});

        move_result = game_manager.make_move("1,???,3,4", created_user2, room);
        assert.deepEqual(move_result,  {success: false, msg: "Invalid move format!"});

        move_result = game_manager.make_move(null, created_user2, room);
        assert.deepEqual(move_result,  {success: false, msg: "Invalid move format!"});

      });

      it("User2 makes a valid move, in their turn", function(){
        var move_result = game_manager.make_move("6,0,4,0", created_user2, room);
        assert.deepEqual(move_result,  {success: true, msg: "Success move!"});
      });
      it("User1 makes a move in an invalid room", function(){
        var move_result = game_manager.make_move("1,3,3,3", created_user, room2);
        assert.deepEqual(move_result,  {success: false, msg: "Something wrong happened, please refresh the page!"});

        move_result = game_manager.make_move("1,3,3,3", created_user, null);
        assert.deepEqual(move_result,  {success: false, msg: "Invalid room"});

      });
      it("User3 makes a valid move, in their turn, but the game is paused", function(){
        var move_result = game_manager.make_move("1,3,3,3", created_user3, room2);
        assert.deepEqual(move_result,  {success: false, msg: "Please wait for your opponent to join!"});
      });
    });

  describe('Chess API Test', function(){
    var chess = new Chess();
    it('The default board should have 8x8 size', function(){
      assert.equal(chess.size, 8);
      assert.equal(chess.board.length, 8);
      assert.equal(chess.board[0].length, 8);
    });

    it('The default board should have 32 chess pieces', function(){
      assert.equal(chess.current_pieces.size, 32);
    });
    it('Test the default first turn', function(){
      assert.equal(chess.p1_turn, true);
    });
    it('Test the default move history', function(){
      assert.deepEqual(chess.prev_moves, []);
    });
    it('Test the default game status', function(){
      assert.equal(chess.game_status, chess.ONGOING);
      assert.equal(chess.is_check, false);

    });

    //test on 3x3 board
    var customized_chess = new Chess(3, [new Piece("pawn", 0, 0, true), new Piece("queen", 0, 2, true), new Piece("king", 2,1, false) ]);
    var board = [[new Piece("pawn", 0, 0, true), null, new Piece("queen", 0, 2, true)], [null, null, null], [null, new Piece("king", 2,1, false), null]];
    it('Test position of input pieces in the board', function(){
      for(var r = 0; r < 3; r++){
        for(var c = 0; c < 3; c++){
          if(board[r][c] == null)
            assert.notExists(customized_chess.board[r][c]);
          else{
            assert.equal(board[r][c].type, customized_chess.board[r][c].type);
          }
        }
      }
    });

    it('Test out of boundary move', function(){
      var move_result = customized_chess.move(3, 3, 4,4);
      assert.deepEqual(move_result,[ false, "Invalid or empty position"]);
    });

    it('Test invalid move', function(){
      var move_result = customized_chess.move(0, 0, 2,2);
      assert.deepEqual(move_result,[ false, "Invalid move"]);
    });

    it('Test empty postion move', function(){
      var move_result = customized_chess.move(1,1, 2,2);
      assert.deepEqual(move_result,[ false, "Invalid or empty position"]);
    });

    it('Test move in the wrong turn', function(){
      var move_result = customized_chess.move(2,1, 1,1);
      assert.deepEqual(move_result,[ false,"Invalid move! This is not your chess piece"]);
    });
    it('Test reverse to last move', function(){
      var clone = customized_chess.clone();

      //make move reverse to the last state
      customized_chess.move(0,2, 1,1);
      customized_chess.reverse_last_move();
      customized_chess.sync_avail_moves();
      customized_chess.sync_game_status();

      assert.deepEqual(customized_chess, clone);
    });

    it('Test valid move', function(){
      var move_result = customized_chess.move(0,0, 1,0);
      assert.deepEqual(move_result,[ true , "Success move!"]);
    });

    it('Test if the turn is switched after a move', function(){
      assert.equal(customized_chess.p1_turn, false);
    });

    it('Test game status when in check', function(){
      assert.equal(customized_chess.game_status, customized_chess.ONGOING);
      assert.equal(customized_chess.is_check, true);
    });


    it('Test checkmate', function(){
      var checkmate_board = new Chess(3, [new Piece("pawn", 0, 0, true), new Piece("queen", 0, 2, true), new Piece("king", 2,1, false) ], false);
      checkmate_board.move(2,1,1,0);
      checkmate_board.move(0,2,1,1);

      assert.equal(checkmate_board.game_status, checkmate_board.P1_WIN);
    });
    it('Test stalemate (draw game)', function(){
      var stalemate_board = new Chess(3, [new Piece("king", 2, 0, true), new Piece("queen", 1,2, false) ]);
      assert.equal(stalemate_board.game_status, stalemate_board.DRAW);
    });

  });

});








describe('Integration Test using Request Handler', function(){
  var request_handler = new RequestHandler();
  //TEST SET UP
  var created_user = null;
  var created_user2 = null;
  var created_user3 = null;
  var created_user4 = null;
  var room = null;
  var room2 = null;

  describe('Rooms and Users related tests', function(){
    it('Create new user1, user2, user3, user4', function(){
      created_user = request_handler.create_new_user();
      assert.isNotNull(created_user);

      created_user2 = request_handler.create_new_user();
      assert.isNotNull(created_user2);

      created_user3 = request_handler.create_new_user();
      assert.isNotNull(created_user3);

      created_user4 = request_handler.create_new_user();
      assert.isNotNull(created_user4);

    });

    it('Authenticate unregistered user_id', function(){
      var auth_result = request_handler.authenticate_user('dasdsadsad');
      assert.deepEqual(auth_result, { success: false, msg: "Failed to authenticate the user"});
    });

    it('Authenticate null user_id', function(){
      var auth_result = request_handler.authenticate_user(null);
      assert.deepEqual(auth_result, { success: false, msg: "Failed to authenticate the user"});
    });

    it('Authenticate created users', function(){
      var auth_result = request_handler.authenticate_user(created_user);
      assert.deepEqual(auth_result, { success: true, msg: "Success!"});

      auth_result = request_handler.authenticate_user(created_user2);
      assert.deepEqual(auth_result, { success: true, msg: "Success!"});

      auth_result = request_handler.authenticate_user(created_user3);
      assert.deepEqual(auth_result, { success: true, msg: "Success!"});

      auth_result = request_handler.authenticate_user(created_user4);
      assert.deepEqual(auth_result, { success: true, msg: "Success!"});

    });

    it('User1 creates a room', function(){
      var join_room_result = request_handler.create_room(created_user);
      assert.deepEqual(join_room_result, { success: true, msg: "Success!"});
    });

    it('User1 gets room, game should in the pause position', function(){
      room = request_handler.get_user_room(created_user);
      assert.isNotNull(room);
      assert.isNotNull(room.room_number);
      assert.isNotNull(room.chess);
      assert.equal(room.pause, true );
      assert.equal(room.p1, created_user);
    });
    it('User1 creates rejoins the created room', function(){
      var join_room_result = request_handler.join_room(created_user, room.room_number);
      assert.deepEqual(join_room_result, {success: true, msg: "Success to join!"});
    });

    it('User2 joins room with user1, game should be ready to start', function(){
      var join_room_result = request_handler.join_room(created_user2, room.room_number);
      assert.deepEqual(join_room_result, {success: true, msg: "Ready to start the game!"});
      var join_room = request_handler.get_user_room(created_user2);
      assert.equal(join_room, room);
      assert.isNotNull(room.chess);
      assert.equal(room.pause, false);
      assert.equal(room.p1, created_user)
      assert.equal(room.p2, created_user2);
    });
    it('User3 and user4 try to join a full room', function(){
      var join_room_result = request_handler.join_room(created_user3, room.room_number);
      assert.deepEqual(join_room_result, {success: false, msg: "The room is full or does not exist! Please try a different room ID"});

      join_room_result = request_handler.join_room(created_user4, room.room_number);
      assert.deepEqual(join_room_result, {success: false, msg: "The room is full or does not exist! Please try a different room ID"});

    });
    it('User3 creates a new room, should be different than then room1', function(){
      var join_room_result = request_handler.create_room(created_user3);
      assert.deepEqual(join_room_result, { success: true, msg: "Success!"});

      room2 = request_handler.get_user_room(created_user3);
      assert.notDeepEqual(room2, room);
      assert.isNotNull(room2);
      assert.isNotNull(room2.room_number);
      assert.isNotNull(room2.chess);
      assert.equal(room2.pause, true );
      assert.equal(room2.p1, created_user3);

    });
    it('User1 and user2 creates another room after creating a room', function(){
      var create_room_result = request_handler.create_room(created_user);
      assert.deepEqual(create_room_result, {success: false, msg:  "You have already join a room"});

      create_room_result = request_handler.create_room(created_user2);
      assert.deepEqual(create_room_result, {success: false, msg:  "You have already join a room"});

    });

    it('User1 and User 2 joins another room after creating a room', function(){
      var join_room_result = request_handler.join_room(created_user, "dads");
      assert.deepEqual(join_room_result, { success: false, msg: "You have already join a different room"});

      join_room_result = request_handler.join_room(created_user2, "dads");
      assert.deepEqual(join_room_result, { success: false, msg: "You have already join a different room"});

      join_room_result = request_handler.join_room(created_user, room2.room_number);
      assert.deepEqual(join_room_result, { success: false, msg: "You have already join a different room"});

      join_room_result = request_handler.join_room(created_user2, room2.room_number);
      assert.deepEqual(join_room_result, { success: false, msg: "You have already join a different room"});

    });
    it('Unanthenticated user creates room', function(){
      var create_room_result = request_handler.create_room("some unauthenticated user");
      assert.deepEqual(create_room_result, { success: false, msg: "Failed to authenticate the user"});
    });
    it('Unanthenticated gets room', function(){
      var room_result = request_handler.get_user_room("some unauthenticated user");
      assert.isNull(room_result);
    });

    it('Unanthenticated user joins an invalid room', function(){
      var join_room_result = request_handler.join_room("some unauthenticated user", "some invalid room");
      assert.deepEqual(join_room_result, { success: false, msg: "Failed to authenticate the user"});

      join_room_result = request_handler.join_room(null, "some invalid room");
      assert.deepEqual(join_room_result, { success: false, msg: "Failed to authenticate the user"});

    });

    it('Unanthenticated user joins a valid room', function(){
      var join_room_result = request_handler.join_room("some unauthenticated user", room.room_number);
      assert.deepEqual(join_room_result, { success: false, msg: "Failed to authenticate the user"});

      join_room_result = request_handler.join_room(null, room.room_number);
      assert.deepEqual(join_room_result, { success: false, msg: "Failed to authenticate the user"});
    });
  });

  describe('Chess move related tests', function(){
    it("User1 makes a valid move in their turn", function(){
      var move_result = request_handler.make_move("1,3,3,3", created_user);
      assert.deepEqual(move_result,  {success: true, msg: "Success move!"});
    });

    it("User1 makes a valid move, but not in their turn", function(){
      var move_result = request_handler.make_move("1,4,3,4", created_user);
      assert.deepEqual(move_result,  {success: false, msg: "This is your opponent turn, please wait!"});
    });

    it("User2 makes a invalid move, in their turn", function(){
      var move_result = request_handler.make_move("1,???,3,4", created_user2);
      assert.deepEqual(move_result,  {success: false, msg: "Invalid move format!"});

      move_result = request_handler.make_move("1,???,3,4", created_user2);
      assert.deepEqual(move_result,  {success: false, msg: "Invalid move format!"});

      move_result = request_handler.make_move(null, created_user2);
      assert.deepEqual(move_result,  {success: false, msg: "Invalid move format!"});

    });

    it("User2 makes a valid move, in their turn", function(){
      var move_result = request_handler.make_move("6,0,4,0", created_user2);
      assert.deepEqual(move_result,  {success: true, msg: "Success move!"});
    });
    it("User3 makes a valid move, in their turn, but the game is paused", function(){
      var move_result = request_handler.make_move("1,3,3,3", created_user3);
      assert.deepEqual(move_result,  {success: false, msg: "Please wait for your opponent to join!"});
    });

    it("User4 (did not join any room) makes a move", function(){
      var move_result = request_handler.make_move("1,3,3,3", created_user4);
      assert.deepEqual(move_result,  {success: false, msg: "You did not enter a room!"});
    });

    it("unauthenticated user makes a move", function(){
      var move_result = request_handler.make_move("1,3,3,3", "Some invalid id");
      assert.deepEqual(move_result,  {success: false, msg: "Failed to authenticate the user"});
    });


    it("User1 see if he/she is is_player1", function(){
      var is_p1 = request_handler.is_player1(created_user);
      assert.equal(is_p1, true);
    });

    it("User2 see if he/she is is_player1", function(){
      var is_p1 = request_handler.is_player1(created_user2);
      assert.equal(is_p1, false);
    });

    it("User3 see if he/she is is_player1", function(){
      var is_p1 = request_handler.is_player1(created_user3);
      assert.equal(is_p1, true);
    });

    it("User4 see if he/she is is_player1", function(){
      var is_p1 = request_handler.is_player1(created_user4);
      assert.equal(is_p1, null);
    });
  });

});
