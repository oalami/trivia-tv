import React from "react";
import ReactDOM from "react-dom";
import * as FB from './fb.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, child, push, set, get, onValue, onChildChanged, onChildAdded } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const gameRef = FB.init();

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
		this.inputRef = React.createRef();
	}

	handlePlayButtonClick(e) {
		e.preventDefault();

		if (this.inputRef.current.value != "") {
			this.props.onNamePicked(this.inputRef.current.value);
		} else {
			//TODO: Visual indicator that player name required
		}
	}

	render() {
		return (
			<div className="phone-content">
				<form onSubmit={this.handlePlayButtonClick}>
					<h1>CLIMATE JEOPARDY</h1>
					<h2>Enter Team Name:</h2>
					<input
						type="text"
						defaultValue={this.props.name}
						ref={this.inputRef}
					/>
					<button>Let's Play</button>
				</form>
			</div>
		);
	}
}

class FinalRoundWager extends React.Component {
	constructor() {
		super();
		this.handleWagerButtonClick = this.handleWagerButtonClick.bind(this);
	}

	handleWagerButtonClick(e) {
		e.preventDefault();

		if (this._input.value != "" && this._input.value >= 0 && this._input.value <= this.props.score) {
			this.props.onWagerPicked(this._input.value);
			
		} else {
			//TODO: Visual indicator of error
		}
	}

	render() {
		let score = this.props.score | 0;
		let wagerSet = this.props.wagerSet;
		
		if (this.props.wagerPicked) {
			return (
				<div className="phone-content">
					<h2>FINAL ROUND</h2>					
					<h2 className="team-name-final">{this.props.name}: {score} points</h2>					
					<h2 className="team-name-final">Wager: {this.props.wager} points</h2>	
				</div>
			)	
		} else {
			return (
				<div className="phone-content">
					<form onSubmit={this.handleWagerButtonClick}>
						<h2>FINAL ROUND</h2>					
						<h2 className="team-name-final">{this.props.name}: {score} points</h2>					
						<h2>Enter Wager</h2>
						<input
							type="number"
							defaultValue={score}
							max={score}
							min="0"
							ref={(c) => (this._input = c)}
						/>
						<button>Wager</button>
					</form>
				</div>
			);
		}
	}
}

class FinalRoundSolution extends React.Component {
	constructor() {
		super();
		this.handleSolutionButtonClick = this.handleSolutionButtonClick.bind(this);
	}

	handleSolutionButtonClick(e) {
		e.preventDefault();

		if (this._input.value != "") {
			this.props.onSolutionPicked(this._input.value);
		} else {
			//TODO: Visual indicator of error
		}
	}

	render() {
		let score = this.props.score | 0;
		if(!this.props.finalRoundSolutionPicked) {
			return (
				<div className="phone-content">
					<form onSubmit={this.handleSolutionButtonClick}>
						<h2>FINAL ROUND</h2>					
						<h2 className="team-name-final">{this.props.name}: {score} points</h2>					
						<h2 className="team-name-final">Wager: {this.props.wager} points</h2>					
						<h2>Enter Solution</h2>
						<textarea
							defaultValue=""
							ref={(c) => (this._input = c)}
							rows="4"
							cols="30"
						/>
						<button>Submit Solution</button>
					</form>
				</div>
			);
		} else {
			return (
				<div className="phone-content">
					<form onSubmit={this.handleSolutionButtonClick}>
						<h2>FINAL ROUND</h2>					
						<h2 className="team-name-final">{this.props.name}: {score} points</h2>					
						<h2 className="team-name-final">Wager: {this.props.wager} points</h2>					
						<h2>Your Solution</h2>
						{this.props.finalRoundSolution}
					</form>
				</div>
			);		
		}
	}	
}

class EndGame extends React.Component {
	constructor() {
		super();
	}

	render() {
		let score = this.props.score | 0;
		return (
			<div className="phone-content">				
				<h1 className="team-name-final">{this.props.name}</h1>
				<h2 className="team-name-final">{score} points</h2>
				<h2>Thanks for playing!</h2>
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
			wager: null,
			wagerPicked: false,
			finalRoundSolutionPicked: false,
			finalRoundSolution: ""
		};

		this.handleNamePicked = this.handleNamePicked.bind(this);
		this.handleWagerPicked = this.handleWagerPicked.bind(this);
		this.handleSolutionPicked = this.handleSolutionPicked.bind(this);
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
						wager: snap.val().wager
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

			if( this.state.status == "NEW") { 
				this.state = {
					playerName: "",
					playerScore: 0,
					status: "loading",
					playerId: null,
					nameSet: false,
					sentBuzz: false,
					wager: null,
					wagerPicked: false,
					finalRoundSolutionPicked: false,
					finalRoundSolution: ""
				};
			}

			if (this.state.status != "loading" && state.status == "NEW" && this.state.nameSet) {
				state.nameSet = false;
			}

			// if(!this.state.nameSet && state.status != "NEW" && this.state.playerName != "") {
			// 	this.handleNamePicked(this.state.playerName);
			// }

			if (state.status != "BUZZ_READY") {
				state.sentBuzz = false;
			}

			this.setState(state);
		});
	}

	handleNamePicked(pName) {
		let playerId = this.state.playerId;

		if (playerId != null) {
			const playerRef = child(child(gameRef, "players"), playerId);
			set(child(playerRef, "name"), pName);
		} else {

			console.log("New player: " + pName);
			const playersRef = child(gameRef, "players");
			playerId = push(playersRef, { name: pName }).key;

			document.cookie = "playerId=" + playerId;
		}

		this.setState({ playerId: playerId, nameSet: true, playerName: pName });
	}

	handleWagerPicked(wager) {
		console.log("Wager picked: " + wager);
		const gameFinalsRef = child(gameRef, "finals");	
		set(child(child(gameFinalsRef, this.state.playerId), "wager"), wager);

		//store this in the player object as well (in case of a page refresh)
		const gamePlayersRef = child(gameRef, "players");
		set(child(child(gamePlayersRef, this.state.playerId),"wager"),wager)


		this.setState({ wager: wager });
		this.setState({ wagerPicked: true })
	}

	handleSolutionPicked(solution) {
		console.log("Solution picked: " + solution);

		const gameFinalsRef = child(gameRef, "finals");
		set(child(child(gameFinalsRef, this.state.playerId), "solution"), solution);

		this.setState({ finalRoundSolution: solution });
		this.setState({ finalRoundSolutionPicked: true });
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
		} else if ( !this.state.nameSet ) {
			return (
				<NameEntryScreen
					onNamePicked={this.handleNamePicked}
					name={this.state.playerName}
				/>
			);
		} else if( this.state.status == "FINAL_ROUND_WAGER" && this.state.playerScore > 0) {
			return (
				<FinalRoundWager
					onWagerPicked={this.handleWagerPicked}
					name={this.state.playerName}
					score={this.state.playerScore}
					wager={this.state.wager}
					wagerPicked={this.state.wagerPicked}
				/>
			);
		} else if( this.state.status == "FINAL_ROUND_PROMPT" && this.state.playerScore > 0) {
			return (
				<FinalRoundSolution
					onSolutionPicked={this.handleSolutionPicked}
					name={this.state.playerName}
					score={this.state.playerScore}
					wager={this.state.wager}
					finalRoundSolutionPicked={this.state.finalRoundSolutionPicked}	
					finalRoundSolution={this.state.finalRoundSolution}
				/>
			);
		} else if( this.state.status == "ENDED" || this.state.status == "FINAL_ROUND_DISPLAY" || (this.state.status.startsWith("FINAL") && this.state.playerScore <= 0)) {
			return (
				<EndGame
					status={this.state.status}
					score={this.state.playerScore}
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
