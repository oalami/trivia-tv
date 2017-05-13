import React from 'react';
import ReactDOM from 'react-dom';
import Firebase from 'firebase'

var firebaseConfig = {
    apiKey: "AIzaSyAlp9TIA0g3j0icy7YZreldkWaSVCJtK18",
    authDomain: "tvquiz-92dd4.firebaseapp.com",
    databaseURL: "https://tvquiz-92dd4.firebaseio.com",
    projectId: "tvquiz-92dd4",
    storageBucket: "tvquiz-92dd4.appspot.com",
    messagingSenderId: "946323037907"
};

var firebaseUser = null;

function auth() {
	Firebase.initializeApp(firebaseConfig); Firebase.auth().onAuthStateChanged(user => {  		
  		firebaseUser = user;
	});


	Firebase.auth().signInAnonymously().catch(function(error) {
	  // Handle Errors here.
	  var errorCode = error.code;
	  var errorMessage = error.message;
	  
	  console.log(errorMessage);
	});
}

auth();

var gameRef = Firebase.database().ref("games/game1");

document.addEventListener('DOMContentLoaded', function() {
  ReactDOM.render(
    React.createElement(PlayerControler),
    document.getElementById('mount')
  );
});


class BuzzerScreen extends React.Component {
	render() {
		let text = "Waiting for question";
		let className = "waiting"

		switch(this.props.status) {
			case "BUZZ_READY":
				if(this.props.sentBuzz) {
					text = "BUZZZZZZZZZZ"
					className = "buzz"
				} else {
					text = "CLICK TO BUZZ"
					className = "ready"
				}				
				break;
			case "DISPLAY_PICK":
				text = "GET READY"
				className = "waiting"
		}

		let score = this.props.score | 0
		return (
			<div className={"content " + className} onClick={this.props.onClick}>
				<h1 className="team-name">{this.props.name} - {score} points</h1>

				<div className="message">
					<h1>{text}</h1>
				</div>

			</div>
		);
	}
}

class NameEntryScreen extends React.Component {
	constructor() {
		super();
		this.handlePlayButtonClick = this.handlePlayButtonClick.bind(this);
	}

	handlePlayButtonClick(e) {
		e.preventDefault();

		if(this._input.value != "") {
			this.props.onNamePicked(this._input.value);
		} else {
			//TODO: Visual indicator that player name required
		}
		
	}

	render() {
		return (
			<div className="content">
			<form onSubmit={this.handlePlayButtonClick}>
  				<h1>MAINE & CALIFORNIA<br/>JEOPARDY</h1>
  				<h2>Enter Team Name:</h2>
  				<input type="text" defaultValue={this.props.name} ref={c => this._input = c}/>
				<button>Let's Play</button>
			</form>
			</div>
		)		
	}
}


class PlayerControler extends React.Component {
	constructor() {
		super();
		this.state = {
			playerName: "",
			playerScore: 0,
			status: 'loading',
			playerId: null,		
			nameSet: false,
			sentBuzz: false
		};

		this.handleNamePicked = this.handleNamePicked.bind(this);
	}

	componentWillMount() {
		let cookieId = 0;

  		if(document.cookie) {
  			let uid = document.cookie.split("=")[1];
  			cookieId = uid;
  		}  		

		gameRef.child('players').once('value', snapList => {
			let player = {playerName: "", playerId: null};
			
			snapList.forEach(snap => {
				if(cookieId == snap.key) {
					player = {playerId: snap.key, playerName: snap.val().name, playerScore: snap.val().score};
				}
			});

			this.setState(player);
		});

		gameRef.child('players').on('child_changed', snap => {
			let p = snap.val();
			if(this.state.playerId && this.state.playerId == snap.key) {
				this.setState({playerName: p.name, playerScore: p.score});
			}
		})

		gameRef.child('gameState').on('value', snap => {      
			let state = {}
			state.status = snap.val();
			if(this.state.status != 'loading' && state.status == 'NEW' && this.state.nameSet) {
				state.nameSet = false;
			} 

			if(state.status != "BUZZ_READY") {
				state.sentBuzz = false;
			}

        	this.setState(state);
    	});
	}

	handleNamePicked(name) {
		let playerId = this.state.playerId;

		if(playerId != null) {
			gameRef.child('players').child(playerId).set({name: name});
		} else {
			playerId = gameRef.child('players').push({name: name}).key;

			document.cookie = "playerId=" + playerId;
		}

		this.setState({playerId: playerId, playerName: name, nameSet: true});
	}

	handleBuzzClick() {
		if(!this.state.sentBuzz && this.state.status == "BUZZ_READY") {
			gameRef.child('buzzes').push({name: this.state.playerName, id:this.state.playerId})
			this.setState({sentBuzz: true})
		}
	}	

	render() {
		if(this.state.status == 'loading') {
			return (<h1>Loading Please Wait</h1>)
		} else if(!this.state.nameSet && (this.state.status == 'NEW' || this.state.playerName == "")) {
			return ( <NameEntryScreen onNamePicked={this.handleNamePicked} name={this.state.playerName}/> );
		} else {
			return ( 
				<BuzzerScreen status={this.state.status} 
					sentBuzz={this.state.sentBuzz} 
					score={this.state.playerScore} 
					name={this.state.playerName}
					onClick={_ => this.handleBuzzClick()}/>
				
			 );
		}
	}
}

	