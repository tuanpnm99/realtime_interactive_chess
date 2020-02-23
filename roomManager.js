
class RoomManager{
  constructor(request_handler, size=30000){
    this.USER_TO_ROOM = {};
    this.ROOMS_STATE = {};
    this.REQUEST_HANDLER = request_handler;
    this.max_size = size;
  }
  authenticate_user(user_id){ //public
    if(!this.is_user_exist(user_id))
      return {
        success: false,
        msg: "Failed to authenticate the user"
      };
    return {
      success: true,
      msg: "Success!"
    };
  }
  join_room(user_id, room_id){ //public
    var auth_result = this.authenticate_user(user_id);
    if(!auth_result.success)
      return auth_result;


    if(!this.valid_room_to_join(user_id, room_id))
      return {
        success:false,
        msg: "The room is full or does not exist! Please try a different room ID"
      };

    var room = this.get_room(room_id);

    if(room.p1 != user_id && room.p2 != user_id){
      if(room.p1 == null)
        room.p1 = user_id;
      else
        room.p2 = user_id;
    }
    this.USER_TO_ROOM[user_id] = room_id;
    var msg = "Success to join!"
    if(this.is_full(room_id)){
      room.pause = false;
      msg = "Ready to start the game!";
    }
    return {
      success: true,
      msg: msg
    };
  }
  create_room(user_id){ //public
    var auth_result = this.authenticate_user(user_id);
    if(!auth_result.success)
      return auth_result;

    if(this.ROOMS_STATE.length == this.max_size)
      return {
        success: false,
        msg: "We have filled all rooms! Please try again later!"
      };

    var new_id = this.get_new_room_id();

    if(this.is_room_exist(new_id)) //should not enter here
      return {
        success: false,
        msg: "Something wrong happen, Please try again!"
      };

      var new_game = this.REQUEST_HANDLER.new_chess_game();
      this.ROOMS_STATE[new_id] = {
        room_number: new_id,
        p1: user_id,
        p2: null,
        chess: new_game,
        pause: true
      }

      this.USER_TO_ROOM[user_id] = new_id;

      return {
        success: true,
        msg: "Success!"
      };
  }
  create_new_user(){ //public
    var user_id = this.get_new_user_id();
    this.USER_TO_ROOM[user_id] = null;
    return user_id;
  }
  is_user_exist(user_id){
    if(user_id == null)
      return false;
    return (user_id in this.USER_TO_ROOM);
  }
  get_user_room(user_id){ //public
    if(!this.is_user_exist(user_id))
      return null;
    var room_id = this.USER_TO_ROOM[user_id];

    return this.get_room(room_id);
  }
  is_room_exist(room_id){
    if(room_id == null)
      return false;
    return (room_id in this.ROOMS_STATE)
  }
  get_room(room_id){
    if(!this.is_room_exist(room_id))
      return null;
    return this.ROOMS_STATE[room_id];
  }

  is_full(room_id){ //private, should only be use by Room Manager
    if(!this.is_room_exist(room_id)) //should not enter here
      return false;

    var room = this.get_room(room_id);
    if(room.p1 != null && room.p2 != null)
      return true;
    return false;
  }
  valid_room_to_join(user_id, room_id){
    if(!this.is_room_exist(room_id))
      return false;

    var room = this.get_room(room_id);
    if(room.p1 == user_id || room.p2 == user_id)
      return true;

    if(this.is_full(room_id))
      return false;
    return true;
  }
  get_new_user_id(){
    var new_id = this.REQUEST_HANDLER.generate_random_id();
    while(this.is_user_exist(new_id)){
      new_id = this.REQUEST_HANDLER.generate_random_id();
    }
    return new_id;
  }
  get_new_room_id(){
    var new_id = this.REQUEST_HANDLER.generate_random_id();
    while(this.is_room_exist(new_id)){
      new_id = this.REQUEST_HANDLER.generate_random_id();
    }
    return new_id;
  }
}

module.exports = RoomManager;