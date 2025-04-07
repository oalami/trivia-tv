import React from "react";
import ReactDOM from "react-dom";
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, child, push, set, get, onValue, onChildChanged, onChildAdded } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

var firebaseConfig = {
	apiKey: "AIzaSyAlp9TIA0g3j0icy7YZreldkWaSVCJtK18",
	authDomain: "tvquiz-92dd4.firebaseapp.com",
	databaseURL: "https://tvquiz-92dd4.firebaseio.com",
	projectId: "tvquiz-92dd4",
	storageBucket: "tvquiz-92dd4.appspot.com",
	messagingSenderId: "946323037907",
};

var firebaseUser = null;
var needRefresh = false;

function auth() {
	const app = initializeApp(firebaseConfig);
	const auth = getAuth(app);
	
	onAuthStateChanged(auth, (user) => {
		if (user != null) {
			console.log("Auth state changed " + user.uid);
			if (needRefresh) {
				window.location.reload();
			}
		} else {
			needRefresh = true;
			console.log("Auth state changed NULL");
		}

		firebaseUser = user;
	});

	signInAnonymously(auth).catch(function (error) {
		// Handle Errors here.
		var errorCode = error.code;
		var errorMessage = error.message;

		console.log(errorMessage);
	});
	
	return getDatabase(app);
}

const db = auth();
const gameRef = ref(db, "games/game5");

document.addEventListener("DOMContentLoaded", function () {
	ReactDOM.render(
		React.createElement(PlayerControler),
		document.getElementById("mount"),
	);
});

class BuzzerScreen extends React.Component {
	render() {
		let text = "Waiting for answer";
		let className = "waiting";

		switch (this.props.status) {
			case "BUZZ_READY":
				if (this.props.sentBuzz) {
					text = "BUZZZZZZZZZZ";
					className = "buzz";
				} else {
					text = "CLICK TO BUZZ";
					className = "ready";
				}
				break;
			case "DISPLAY_PICK":
				text = "GET READY";
				className = "waiting";
		}

		let score = this.props.score | 0;
		return (
			<div
				className={"phone-content " + className}
				onClick={this.props.onClick}
			>
				<h1 className="team-name">
					{this.props.name}: {score} points
				</h1>

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

		if (this._input.value != "") {
			this.props.onNamePicked(this._input.value);
		} else {
			//TODO: Visual indicator that player name required
		}
	}

	render() {
		return (
			<div className="phone-content">
				<form onSubmit={this.handlePlayButtonClick}>
					<h1>MERCHANTXP JEOPARDY</h1>
					<h2>Enter Team Name:</h2>
					<input
						type="text"
						defaultValue={this.props.name}
						ref={(c) => (this._input = c)}
					/>
					<button>Let's Play</button>
				</form>
			</div>
		);
	}
}

class PlayerControler extends React.Component {
	constructor() {
		super();
		this.state = {
			playerName: "",
			playerScore: 0,
			status: "loading",
			playerId: null,
			nameSet: false,
			sentBuzz: false,
		};

		this.handleNamePicked = this.handleNamePicked.bind(this);
	}

	componentDidMount() {
		let cookieId = 0;

		if (document.cookie) {
			let uid = document.cookie.split("=")[1];
			cookieId = uid;
		}

		const playersRef = child(gameRef, "players");
		get(playersRef).then((snapList) => {
			let player = { playerName: "", playerId: null };

			snapList.forEach((snap) => {
				if (cookieId == snap.key) {
					player = {
						playerId: snap.key,
						playerName: snap.val().name,
						playerScore: snap.val().score,
					};
				}
			});

			this.setState(player);
		});

		onChildChanged(playersRef, (snap) => {
			let p = snap.val();
			if (this.state.playerId && this.state.playerId == snap.key) {
				this.setState({ playerName: p.name, playerScore: p.score });
			}
		});

		const gameStateRef = child(gameRef, "gameState");
		onValue(gameStateRef, (snap) => {
			let state = {};
			state.status = snap.val();
			if (
				this.state.status != "loading" &&
				state.status == "NEW" &&
				this.state.nameSet
			) {
				state.nameSet = false;
			}

			if (state.status != "BUZZ_READY") {
				state.sentBuzz = false;
			}

			this.setState(state);
		});
	}

	handleNamePicked(name) {
		let playerId = this.state.playerId;

		if (playerId != null) {
			const playerRef = child(child(gameRef, "players"), playerId);
			set(playerRef, { name: name });
		} else {
			const playersRef = child(gameRef, "players");
			playerId = push(playersRef, { name: name }).key;

			document.cookie = "playerId=" + playerId;
		}

		this.setState({ playerId: playerId, nameSet: true, playerName: name });
	}

	handleBuzzClick() {
		if (this.state.status == "BUZZ_READY" && !this.state.sentBuzz) {
			const buzzesRef = child(gameRef, "buzzes");
			push(buzzesRef, {
				name: this.state.playerName,
				id: this.state.playerId
			});
			this.setState({ sentBuzz: true });
		}
	}

	render() {
		if (this.state.status == "loading") {
			return <h1>Loading Please Wait</h1>;
		} else if (
			!this.state.nameSet &&
			(this.state.status == "NEW" || this.state.playerName == "")
		) {
			return (
				<NameEntryScreen
					onNamePicked={this.handleNamePicked}
					name={this.state.playerName}
				/>
			);
		} else {
			return (
				<BuzzerScreen
					status={this.state.status}
					sentBuzz={this.state.sentBuzz}
					score={this.state.playerScore}
					name={this.state.playerName}
					onClick={(_) => this.handleBuzzClick()}
				/>
			);
		}
	}
}
