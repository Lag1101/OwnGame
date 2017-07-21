/**
 * Created by luckybug on 21.07.17.
 */


function Player(socket) {
    this.socket = socket;
    this.room = undefined;
    this.name = "";
}

function Room(player, name, roomId) {
    this.owner = player;

    this.winner = undefined;
    this.name = name;
    this.roomId = roomId;

    this.players = {};

    this.playersNameSeed = 0;
}

Player.prototype.leaveRoom = function() {
    delete this.room.players[this.socket.id];
    this.room = undefined;
};

Player.prototype.enterRoom = function(room) {
    this.room = room;
    this.room.players[this.socket.id] = this;
    this.room.playersNameSeed ++;

    this.name = "Команда " + this.room.playersNameSeed;
};

Player.prototype.getRaw = function(winner) {
    return {
        id: this.socket.id,
        winner: winner,
        name: this.name
    }
};

Room.prototype.getRaw = function() {
    return {
        name: this.name,
        roomId: this.roomId,
        players: Object.keys(this.players).map(id => {
            return this.players[id].getRaw(this.winner && id === this.winner.socket.id);
        })
    }
};

module.exports.Room = Room;
module.exports.Player = Player;