/**
 * Created by luckybug on 21.07.17.
 */

import React from "react";
import ReactDom from "react-dom";
import io from "socket.io-client";
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import { MuiThemeProvider } from 'material-ui/styles';
import {List, ListItem} from 'material-ui/List';
import Paper from 'material-ui/Paper';
import Subheader from 'material-ui/Subheader';

import PubSub from "pubsub-js";
import Commands from "./commands";

const socket = io.connect('/');

class Player {
    constructor(p) {
        this.id = p.id;
        this.name = p.name;
        this.winner = p.winner;
    }
}

class Room{

    constructor(r) {
        this.name = r.name;
        this.roomId = r.roomId;
        this.players = r.players.map(p=>{ return new Player(p); });
    }
}

class CurrentRoom extends Room{
    constructor(room) {
        super(room);
    }
}

let owner = false;

socket.on('disconnect', (reason) => {
    console.log("diconected", reason);
    PubSub.publishSync(Commands.LEAVE_ROOM);
});

class CurrentRoomComponent extends React.PureComponent{
    constructor(props) {
        super(props);

        this.state = {
            currentRoom: undefined,
            engage: false
        };

        this.onStart = this.onStart.bind(this);
        this.onAnswer = this.onAnswer.bind(this);
    }
    componentDidMount() {
        socket.on(Commands.ENTER_ROOM, room => {

            owner = false;
            this.setState({
                currentRoom: new CurrentRoom(room)
            });
        });
        socket.on(Commands.LEAVE_ROOM, () => {
            this.setState({
                currentRoom: undefined
            });
        });
        socket.on(Commands.UPDATE_ROOM, (room) => {
            this.setState({
                currentRoom: new CurrentRoom(room),
                engage: false
            });
        });

        socket.on(Commands.ROOM_CREATED, (room) => {
            owner = true;
            this.setState({
                currentRoom: new CurrentRoom(room)
            });
        });

        PubSub.subscribe(Commands.LEAVE_ROOM, ()=> {
            this.setState({
                currentRoom: undefined
            });
        });

        socket.on(Commands.START_GAME, ()=>{
            this.setState({
                engage: true
            });
        });
    }
    onStart() {
        socket.emit(Commands.START_GAME);
    }
    onAnswer() {
        this.setState({
            engage: false
        });
        socket.emit(Commands.ANSWER);
    }
    render(){
        console.log("currentRoom", this.state.currentRoom);
        if(this.state.currentRoom === undefined)
            return (<div></div>);


        const room = this.state.currentRoom;

        const playersView = room.players.map(player => {
            return (
                <ListItem key={player.id} style={{backgroundColor: player.winner ? "green" : "red"}}>
                    <p>{player.name}</p>
                </ListItem>
            );
        });

        if(owner) {
            return (
                <div>
                    <h1>Current room</h1>
                    <h2>{room.name}</h2>
                    <Subheader>Hi, master</Subheader>

                    <RaisedButton
                        label="Start"
                        onClick={this.onStart}
                    />
                    <List >
                        <Subheader>players</Subheader>
                        {playersView}
                    </List>
                </div>
            );
        } else {
            return (
                <div>
                    <h1>Current room</h1>
                    <h2>{room.name}</h2>
                    <Subheader>Hi, player</Subheader>

                    <RaisedButton
                        label="Answer"
                        disabled={!this.state.engage}
                        onClick={this.onAnswer}
                    />
                    <List >
                        <Subheader>players</Subheader>
                        {playersView}
                    </List>
                </div>
            );
        }
    }
}


class RoomComponent extends React.PureComponent{
    constructor(props) {
        super(props);

        this.onEnter = this.onEnter.bind(this);
    }
    onEnter() {
        console.log("try enter");

        PubSub.publishSync(Commands.LEAVE_ROOM);
        socket.emit(Commands.ENTER_ROOM, this.props.room.roomId);
    }

    render() {
        const room = this.props.room;
        return (
            <ListItem
                primaryText={room.name}
                onClick={this.onEnter}>
            </ListItem>
        );
    }
}

class RoomsComponent extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            rooms: []
        }
    }
    componentDidMount() {
        socket.on(Commands.ROOMS, rawRoms => {
            const rooms = rawRoms.map(r => {
                return new Room(r);
            });
            this.setState({
                rooms: rooms
            });
        });

        socket.emit(Commands.GET_ROOMS);
    }

    render() {
        const roomViews = this.state.rooms.map(room => {
            return <RoomComponent
                room={room}
                key={room.roomId}
            />
        });
        return (
            <List>
                {roomViews}
            </List>
        );
    }
}

class RoomsCreater extends React.PureComponent{
    constructor(props){
        super(props);
        this.onCreate = this.onCreate.bind(this);
        this.onRoomNameChange = this.onRoomNameChange.bind(this);
        this.state = {
            roomName: "",
            errorMessage: ""
        }
    }
    onCreate() {
        const roomName = this.state.roomName;
        if(roomName.length === 0) {
            this.setState({
                errorMessage: "name cannot be empty"
            });
        } else {

            this.setState({
                errorMessage: ""
            });

            PubSub.publishSync(Commands.LEAVE_ROOM);
            socket.emit(Commands.CREATE_ROOM, roomName);
        }
    }
    onRoomNameChange(_, val) {
        this.setState({
            roomName: val
        });
    }
    render() {
        return (
            <div>
                <TextField
                    ref="roomName"
                    hintText="Ender room name"
                    errorText={this.state.errorMessage}
                    value={this.state.roomName}
                    onChange={this.onRoomNameChange}
                />
                <RaisedButton
                    label="Create"
                    onClick={this.onCreate}
                />
            </div>
        );

    }
}

const style = {
    margin: 20,
    textAlign: 'center',
    display: 'inline-block',
};

class App extends React.Component{
    render() {
        return (
            <MuiThemeProvider>
                <div className="main">
                    <Paper className="tab">
                        <RoomsCreater/>
                        <Subheader>All rooms</Subheader>
                        <RoomsComponent/>
                    </Paper>
                    <Paper className="tab">
                        <CurrentRoomComponent/>
                    </Paper>
                </div>
            </MuiThemeProvider>
        );
    }
}

ReactDom.render(<App/>, document.getElementById('app'));