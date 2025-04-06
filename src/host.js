import React from 'react';
import { createRoot } from 'react-dom/client';
import { getDatabase, ref, onChildAdded, onChildRemoved, onChildChanged, onValue, get, set, remove } from 'firebase/database';
import * as FB from './fb.js';

const gameRef = FB.init();
const db = getDatabase();

class Square extends React.Component {
    render() {
        return (
            <button className="square" onClick={this.props.onClick}>
                {this.props.text}
            </button>
        );
    }
}

class Row extends React.Component {
    render() {
        if (this.props.onSquareClick) {
            return (
                <div className="board-row">
                    {this.props.row.map((item) => {
                        return (
                            <Square
                                text={item.displayText}
                                onClick={() => this.props.onSquareClick(item.key)}
                                key={item.key}
                            />
                        );
                    })}
                </div>
            );
        } else {
            return (
                <div className="board-row">
                    {this.props.row.map((item) => {
                        return (
                            <Square
                                text={item.displayText}
                                key={item.key}
                            />
                        );
                    })}
                </div>
            );
        }
    }
}

class Board extends React.Component {
    render() {
        let values = [100, 200, 300, 400, 500];
        let headerRow = [];

        this.props.categories.forEach((category, index) => {
            headerRow.push({ displayText: category.category, key: index });
        });

        return (
            <div className="game">
                <div className="game-board">
                    <Row row={headerRow} />
                    {values.map((val) => {
                        let row = [];
                        this.props.categories.forEach((category, index) => {
                            let key = val + ":" + index;
                            let displayText = val;
                            if (this.props.picks.includes(key)) {
                                displayText = "";
                            }
                            row.push({ displayText: displayText, key: key });
                        });
                        return (
                            <Row
                                row={row}
                                key={val}
                                onSquareClick={this.props.onSquareClick}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }
}

class BuzzListItem extends React.Component {
    render() {
        let disable = this.props.buzzer.disabled;

        return (
            <div className="buzz-item">
                {this.props.buzzer.name}
                <button
                    className="win-lose"
                    onClick={this.props.onWin}
                    disabled={disable}
                >
                    WIN
                </button>
                <button
                    className="win-lose"
                    onClick={this.props.onLose}
                    disabled={disable}
                >
                    LOSE
                </button>
            </div>
        );
    }
}

class Host extends React.Component {
    constructor() {
        super();
        this.state = {
            board: [],
            status: "loading",
            players: [],
            selectedQuestion: null,
            picks: [],
            buzzes: []
        };
    }

    componentDidMount() {
        onChildAdded(ref(db, 'games/game5/players'), snap => {
            let players = this.state.players.slice();
            let p = snap.val();

            players.push({ id: snap.key, name: p.name, score: p.score });

            this.setState({ players: players });
        });

        onChildRemoved(ref(db, 'games/game5/players'), snap => {
            let players = this.state.players.slice();
            let p = snap.val();

            let index = players.indexOf(p);
            players.splice(index, 1);

            this.setState({ players: players });
        });

        onChildChanged(ref(db, 'games/game5/players'), snap => {
            let players = this.state.players.slice();
            let p = snap.val();

            for (let i = 0; i < players.length; i++) {
                if (players[i].id === snap.key) {
                    players[i].score = p.score;
                    players[i].name = p.name;
                    this.setState({ players: players });
                    return;
                }
            }
        });

        get(ref(db, 'games/game5/board')).then(snap => {
            this.setState({ board: snap.val() });

            onValue(ref(db, 'games/game5/gameState'), snap => {
                let state = {};
                state.status = snap.val();
                this.setState(state);
            });

            onChildAdded(ref(db, 'games/game5/picks'), snap => {
                this.setState({ selectedQuestion: this.getSelectedQuestionFromKey(snap.val()) });
            }, { limitToLast: 1 });
        });

        onChildAdded(ref(db, 'games/game5/picks'), snap => {
            let picks = this.state.picks.slice();
            picks.push(snap.val());
            this.setState({ picks: picks });
        });

        onChildRemoved(ref(db, 'games/game5/picks'), snap => {
            this.setState({ picks: [] });
        });

        onChildAdded(ref(db, 'games/game5/buzzes'), snap => {
            let buzzes = this.state.buzzes.slice();
            buzzes.push(snap.val());
            this.setState({ buzzes: buzzes });
        });

        onChildRemoved(ref(db, 'games/game5/buzzes'), snap => {
            this.setState({ buzzes: [] });
        });
    }

    nextQuestion() {
        this.setState({ selectedQuestion: null });
        remove(ref(db, 'games/game5/buzzes')).then(() => {});
        set(ref(db, 'games/game5/gameState'), "WAITING_PICK");
    }

    getSelectedQuestionFromKey(key) {
        let selectedQuestion = {};
        let split = key.split(':');
        let col = split[1];
        let val = split[0];

        selectedQuestion.key = key;
        selectedQuestion.value = val;
        selectedQuestion.category = this.state.board[col].category;
        selectedQuestion.text = this.state.board[col].items[val];

        return selectedQuestion;
    }

    render() {
        let categories = [];
        if (this.state.board) {
            categories = this.state.board.slice();
        }

        let buzzerName = "";
        if (this.state.buzzes.length > 0) {
            buzzerName = this.state.buzzes[0].name;
        }

        if (this.state.selectedQuestion != null && (this.state.status === "DISPLAY_PICK" || this.state.status === "BUZZ_READY")) {
            return (
                <div className="host-content">
                    <DisplayQuestion selectedQuestion={this.state.selectedQuestion} />
                    <PlayerList players={this.state.players} buzzerName={buzzerName} />
                </div>
            );
        } else {
            return (
                <div className="host-content">
                    <Board categories={categories} picks={this.state.picks} />
                    <PlayerList players={this.state.players} buzzerName={buzzerName} />
                </div>
            );
        }
    }
}

// Mount the app using createRoot
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Host />);
