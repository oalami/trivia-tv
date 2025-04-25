import React from 'react';
import ReactDOM from 'react-dom';
import * as FB from './fb.js';
import { getDatabase, ref, child, onChildAdded, onChildRemoved, onChildChanged, onValue, get, off } from 'firebase/database';

const gameRef = FB.init();

document.addEventListener('DOMContentLoaded', function () {
	ReactDOM.render(
		React.createElement(TV),
		document.getElementById('mount')
	);
});

class DisplayPrompt extends React.Component {
	render() {
		return (
			<div className="display-item-parent">
				<div className="display-item">
					<div>{this.props.prompt}</div>
				</div>
			</div>
		);
	}
}

class DisplayCloser extends React.Component {
	render() {
		return (
			<div className="display-item-parent">
				<div className="display-item-final">
					<div>Thanks for playing!</div>
				

				<ul className="final-score-list">
				{this.props.players.map(p => {
					let score = p.score || "0";
					return (
						<li key={p.name}>{p.name}: {score} {p.wager ? "(wagered " + p.wager + ")": ""} points</li>
					)
				})}		
				</ul>
			</div></div>
		);
	}
}

class DisplayFinalRoundWager extends React.Component {
	render() {
		return (
			<div className="display-item-parent">
				<div className="display-item-final">
					<div>Final Jeopardy - Enter Wagers!</div>
					<div className="final-category-header">Category</div>
					<div className="final-category">{this.props.finalRound.category}</div>
				</div>
			</div>
		);
	}
}

class Square extends React.Component {
	render() {
		return (
			<div className="board-cell"><span>{this.props.text}</span></div>
		);
	}
}

class Row extends React.Component {
	render() {
		return (
			<div className={"board-row" + (this.props.headerRow ? " header" : "")}>
				{this.props.row.map(item => {
					return (
						<Square text={(this.props.headerRow || item.displayText == "" ? "" : "$") + item.displayText} key={item.key} />
					);
				})}
			</div>
		);
	}
}


class Board extends React.Component {
	render() {
		let values = [100, 200, 300, 400, 500];
		let headerRow = []

		this.props.categories.map((category, index) => {
			headerRow.push({ displayText: category.category, key: index })
		});

		return (
			<div className="game">
				<div className="board">
					<Row row={headerRow} headerRow={true} />

					{values.map((val) => {
						let row = []

						this.props.categories.map((category, index) => {
							let key = val + ":" + index;
							let displayText = val;
							if (this.props.picks.includes(key)) {
								displayText = "";
							}

							row.push({ displayText: displayText, key: key });
						})

						return (<Row row={row} key={val} headerRow={false} />)
					})}

				</div>
			</div>
		)
	}
}

class PlayerList extends React.Component {
	render() {
		return (
			<div className="player-list">
				<div className="player-box-header">TEAMS</div>
				{this.props.players.map(p => {
					let score = p.score || "0";
					return (<div key={p.name} className={"player-box" + (this.props.buzzerName == p.name ? " buzzed" : "")}>
						<span className={"player-name" + (this.props.buzzerName == p.name ? " buzzed" : "")}>{p.name}</span>
						<span className="player-score">{score}</span>
					</div>)
				})}
			</div>
		);
	}
}


class Timer extends React.Component {
	render() {
	  const radius = 50; // Radius of the circle
	  const circumference = 2 * Math.PI * radius;
	  const progress = (this.props.timeLeft / this.props.duration) * circumference;
	
	  return (
		<div className="timer-container">
			<div className="timer">
		  <svg width="120" height="120">
			<circle
			  cx="60"
			  cy="60"
			  r={radius}
			  stroke="#ddd"
			  strokeWidth="10"
			  fill="none"
			/>
			<circle
			  cx="60"
			  cy="60"
			  r={radius}
			  stroke="#4048CC"
			  strokeWidth="10"
			  fill="none"
			  strokeDasharray={circumference}
			  strokeDashoffset={circumference - progress}
			  style={{ transition: "stroke-dashoffset 1s linear" }}
			/>
		  </svg>
		  <div className="timer-text">
		  {String(this.props.timeLeft).padStart(2, '0')}
		  </div>
		</div></div>
	  );
	};
}
	

class TV extends React.Component {
	constructor() {
		super();
		this.state = {
			board: [],
			status: "loading",
			players: [],
			selectedPrompt: null,
			selectedSolution: null,
			picks: [],
			buzzes: [],
			finalRound: null,
			timer: 0,
			timerDuration: 0
		};
	}

	componentDidMount() {
		const playersRef = child(gameRef, 'players');		

		onChildAdded(playersRef, snap => {
			let players = this.state.players.slice();
			let p = snap.val();
			let score = p.score || 0;

			players.push({ id: snap.key, name: p.name, score: score, wager: p.wager });

			players.sort((a, b) => b.score - a.score);

			this.setState({ players: players });
		});

		onChildRemoved(playersRef, snap => {
			let players = this.state.players.slice();
			let p = snap.val();

			let index = players.indexOf(p);
			players.splice(index, 1);

			this.setState({ players: players });
		});

		onChildChanged(playersRef, snap => {
			let players = this.state.players.slice();
			let p = snap.val();

			for (var i = 0; players.length; i++) {
				if (players[i].id == snap.key) {
					players[i].score = p.score;
					players[i].name = p.name;
					players[i].wager = p.wager;

					players.sort((a, b) => b.score - a.score);

					this.setState({ players: players });
					return;
				}
			}
		});

		const boardRef = child(gameRef, 'board');
		get(boardRef).then(snap => {
			this.setState({ board: snap.val() });

			const gameStateRef = child(gameRef, 'gameState');
			onValue(gameStateRef, snap => {
				let state = {};
				state.status = snap.val();

				this.setState(state);
			});

			const picksRef = child(gameRef, 'picks');
			onChildAdded(picksRef, snap => {
				let pick = snap.val();
				let picks = this.state.picks.slice();
				picks.push(pick);

				let sq = this.getSelectedPromptFromKey(pick);

				this.setState({ picks: picks, selectedPrompt: sq });
			});

			onChildRemoved(picksRef, snap => {
				this.setState({ picks: [] });
			});

			const buzzesRef = child(gameRef, 'buzzes');
			onChildAdded(buzzesRef, snap => {
				let buzzes = this.state.buzzes.slice();
				buzzes.push(snap.val());

				this.setState({ buzzes: buzzes });
			});

			onChildRemoved(buzzesRef, snap => {
				let buzzes = this.state.buzzes.slice();

				for(var i = 0; i < buzzes.length; i++) {
					if (buzzes[i].id == snap.val().id) {
						buzzes.splice(i, 1);
						break;
					}
				}

				this.setState({ buzzes: buzzes });
			});

			onValue(buzzesRef, snap => {
				if (snap.val() == null) {
					this.setState({ buzzes: [] });
				}
			});
		});

		const finalRoundRef = child(gameRef, 'finalRound');
		get(finalRoundRef).then(snap => {
			let finalRound = snap.val();
			if (finalRound) {
				this.setState({ finalRound: finalRound });
			}
		});

		const timerRef = child(gameRef, 'timer');
		onValue(timerRef, snap => {
			let timer = snap.val();
			let timerDuration = this.state.timerDuration
			if(timer > timerDuration) {
				timerDuration = timer;
				this.setState({ timerDuration: timerDuration });
			}
			if(timer == 0) {
				this.setState({ timer: 0, timerDuration: 1 });
			} else {
				this.setState({ timer: timer });
			}
			
		});
	}

	componentWillUnmount() {
		const playersRef = child(gameRef, 'players');
		const gameStateRef = child(gameRef, 'gameState');
		const picksRef = child(gameRef, 'picks');
		const buzzesRef = child(gameRef, 'buzzes');
		const finalRoundRef = child(gameRef, 'finalRound');
		const timerRef = child(gameRef, 'timer');
		

		off(playersRef);
		off(gameStateRef);
		off(picksRef);
		off(buzzesRef);
		off(finalRoundRef);
		off(timerRef);
	}

	getSelectedPromptFromKey(key) {
		let selectedPrompt = {};
		let split = key.split(':');
		let col = split[1];
		let val = split[0];

		selectedPrompt.key = key;
		selectedPrompt.value = val;
		selectedPrompt.category = this.state.board[col].category;
		selectedPrompt.text = this.state.board[col].items[val];

		if (this.state.board[col].q[val]) {
			selectedPrompt.solution = this.state.board[col].q[val];
		}

		return selectedPrompt;
	}

	render() {
		let categories = [];
		if (this.state.board) {
			categories = this.state.board.slice()
		}

		let buzzerName = "";
		if (this.state.buzzes.length > 0) {
			buzzerName = this.state.buzzes[0].name;
		}

		if (this.state.status == "FINAL_ROUND_WAGER") {
			return (
				<div className="tv-content">
					<DisplayFinalRoundWager finalRound={this.state.finalRound} />
					<div className="sidebar">
						<Timer duration={this.state.timerDuration} timeLeft={this.state.timer} />
						<PlayerList players={this.state.players} buzzerName={buzzerName} />
					</div>

				</div>
			);
		} else if (this.state.status == "FINAL_ROUND_PROMPT") {
			return (
				<div className="tv-content">
					<DisplayPrompt prompt={this.state.finalRound.prompt} />
					<div className="sidebar">
						<Timer duration={this.state.timerDuration} timeLeft={this.state.timer} />
						<PlayerList players={this.state.players} buzzerName={buzzerName} />
					</div>
				</div>
			);
		} else if (this.state.status == "FINAL_ROUND_DISPLAY" || this.state.status == "ENDED") {
			return (
				<div className="tv-content">
					<DisplayCloser players={this.state.players} />
				</div>
			);

		} else if (this.state.selectedPrompt != null && (this.state.status == "DISPLAY_PICK" || this.state.status == "BUZZ_READY")) {
			return (
				<div className="tv-content">
					<DisplayPrompt prompt={this.state.selectedPrompt.text} />
					<div className="sidebar">
						<PlayerList players={this.state.players} buzzerName={buzzerName} />
					</div>
				</div>
			);
		} else if (this.state.selectedPrompt != null && this.state.status == "DISPLAY_SOLUTION") {
			return (
				<div className="tv-content">
					<DisplayPrompt prompt={this.state.selectedPrompt.solution} />
					<div className="sidebar">
						<PlayerList players={this.state.players} buzzerName={buzzerName} />
					</div>
				</div>
			);
		} else {
			return (
				<div className="tv-content">
					<Board categories={categories} picks={this.state.picks} />
					<div className="sidebar">
						<PlayerList players={this.state.players} buzzerName={buzzerName} />
					</div>
				</div>
			);
		}
	}
}