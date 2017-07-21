const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const Commands = require('./site_sources/commands');
const Room = require('./Room').Room;
const Player = require('./Room').Player;

const index = require('./routes/index');
const users = require('./routes/users');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const rooms = {};

const players = {};

function SendRooms() {
    const rawRooms = Object.keys(rooms).map(function(id){
        return rooms[id].getRaw();
    });
    Object.keys(players).forEach(function(id){
        players[id].socket.emit(Commands.ROOMS, rawRooms);
    });
}

function destroyRoom(room) {
    for(var i = 0; i < room.players.length; i++) {
        const player = room.players[i];
        player.socket.emit(Commands.LEAVE_ROOM);
        player.room = undefined;
    }
    room.owner.room = undefined;
    delete rooms[room.roomId];
}

io.on('connection', function (socket) {
    players[socket.id] = new Player(socket);

    const me = players[socket.id];

    socket.on(Commands.GET_ROOMS, SendRooms);

    socket.on('disconnect', (reason) => {
        if(rooms[socket.id] !== undefined)
            destroyRoom(rooms[socket.id]);

        delete players[socket.id];
        SendRooms();
    });

    socket.on(Commands.ENTER_ROOM, function(roomId){

        if(me.room) {
            if(me.room.owner.socket.id === me.socket.id){
                console.log("try destroy", me.room.roomId);
                destroyRoom(me.room);
                SendRooms();
            } else {
                console.log(me.socket.id, "leaved", me.room.roomId);

                me.room.owner.socket.emit(Commands.UPDATE_ROOM, me.room.getRaw());
                Object.keys(me.room.players).forEach(function(id){
                    me.room.players[id].socket.emit(Commands.UPDATE_ROOM, me.room.getRaw());
                });
                me.leaveRoom();
            }
        }

        const room = rooms[roomId];

        if(room) {
            me.enterRoom(room);
            room.owner.socket.emit(Commands.UPDATE_ROOM, room.getRaw());
            Object.keys(room.players).forEach(function(id){
                room.players[id].socket.emit(Commands.UPDATE_ROOM, room.getRaw());
            });

            socket.emit(Commands.ENTER_ROOM, room.getRaw());
        }

    });

    socket.on(Commands.LEAVE_ROOM, function(){
        const room = me.room;

        if(me.room.roomId === me.socket.id){
            console.log("try destroy", player.room.roomId);
            destroyRoom(player.room);
            SendRooms();
        } else {
            console.log(me.socket.id, "leaved", me.room.roomId);

            room.owner.socket.emit(Commands.UPDATE_ROOM, room.getRaw());
            Object.keys(room.players).forEach(function(id){
                room.players[id].socket.emit(Commands.UPDATE_ROOM, room.getRaw());
            });
            me.leaveRoom();
        }
    });

    socket.on(Commands.CREATE_ROOM, function(name){
        if(me.room) {
            console.log("try destroy", me.room.roomId);
            destroyRoom(me.room);
            SendRooms();
        }

        const roomId = socket.id;
        rooms[roomId] = new Room(me, name, roomId);

        me.room = rooms[roomId];

        SendRooms();
        socket.emit(Commands.ROOM_CREATED, rooms[roomId].getRaw());
     });

    socket.on(Commands.START_GAME, function(){
        const room = me.room;

        room.winner = undefined;

        room.owner.socket.emit(Commands.UPDATE_ROOM, room.getRaw());
        Object.keys(room.players).forEach(function(id){
            room.players[id].socket.emit(Commands.UPDATE_ROOM, room.getRaw());
        });
        Object.keys(room.players).forEach(function(id){
            room.players[id].socket.emit(Commands.START_GAME);
        });
    });

    socket.on(Commands.ANSWER, function(){
        const room = me.room;

        if(room.winner !== undefined)
            return;
        room.winner = me;

        room.owner.socket.emit(Commands.UPDATE_ROOM, room.getRaw());
        Object.keys(room.players).forEach(function(id){
            room.players[id].socket.emit(Commands.UPDATE_ROOM, room.getRaw());
        });
    });
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const debug = require('debug')('owngame:server');
const http = require('http');

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);


server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
