import React from "react";
import { createRoot } from "react-dom/client";
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, get, set, push, onValue, onChildChanged } from 'firebase/database';

const firebaseConfig = {
	apiKey: "AIzaSyAlp9TIA0g3j0icy7YZreldkWaSVCJtK18",
	authDomain: "tvquiz-92dd4.firebaseapp.com",
	databaseURL: "https://tvquiz-92dd4.firebaseio.com",
	projectId: "tvquiz-92dd4",
	storageBucket: "tvquiz-92dd4.appspot.com",
	messagingSenderId: "946323037907",
};

let firebaseUser = null;
let needRefresh = false;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const gameRef = ref(db, "games/game5");

function initAuth() {
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
		const errorCode = error.code;
		const errorMessage = error.message;
		console.log(errorMessage);
	});
}

initAuth();

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

		let score = this.props.score || 0;
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
		this._input = React.createRef();
	}

	handlePlayButtonClick(e) {
		e.preventDefault();

		if (this._input.current.value !== "") {
			this.props.onNamePicked(this._input.current.value);
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
						ref={this._input}
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

		get(ref(db, "games/game5/players")).then((snapList) => {
			let player = { playerName: "", playerId: null };

			snapList.forEach((snap) => {
				if (cookieId === snap.key) {
					player = {
						playerId: snap.key,
						playerName: snap.val().name,
						playerScore: snap.val().score,
					};
				}
			});

			this.setState(player);
		});

		onChildChanged(ref(db, "games/game5/players"), (snap) => {
			let p = snap.val();
			if (this.state.playerId && this.state.playerId === snap.key) {
				this.setState({ playerName: p.name, playerScore: p.score });
			}
		});

		onValue(ref(db, "games/game5/gameState"), (snap) => {
			let state = {};
			state.status = snap.val();
			if (
				this.state.status !== "loading" &&
				state.status === "NEW" &&
				this.state.nameSet
			) {
				state.nameSet = false;
			}

			if (state.status !== "BUZZ_READY") {
				state.sentBuzz = false;
			}

			this.setState(state);
		});
	}

	handleNamePicked(name) {
		let playerId = this.state.playerId;

		if (playerId != null) {
			set(ref(db, `games/game5/players/${playerId}`), { name: name });
		} else {
			const newPlayerRef = push(ref(db, "games/game5/players"));
			playerId = newPlayerRef.key;
			set(newPlayerRef, { name: name });
			document.cookie = "playerId=" + playerId;
		}

		this.setState({ playerId: playerId, playerName: name, nameSet: true });
	}

	handleBuzzClick() {
		if (!this.state.sentBuzz && this.state.status === "BUZZ_READY") {
			push(ref(db, "games/game5/buzzes"), {
				name: this.state.playerName,
				id: this.state.playerId,
			});
			this.setState({ sentBuzz: true });
		}
	}

	render() {
		if (this.state.status === "loading") {
			return <h1>Loading Please Wait</h1>;
		} else if (
			!this.state.nameSet &&
			(this.state.status === "NEW" || this.state.playerName === "")
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
					onClick={() => this.handleBuzzClick()}
				/>
			);
		}
	}
}

// Mount the app using createRoot
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<PlayerControler />);
