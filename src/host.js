import React from 'react';
import ReactDOM from 'react-dom';
import * as FB from './fb.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onChildAdded, onChildRemoved, onChildChanged, onValue, get, set, remove, off, query, limitToLast, push, child } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const gameRef = FB.init();

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
    if(this.props.onSquareClick) {
      return (
        <div className="board-row">
          {this.props.row.map( (item) => { return (<Square text={item.displayText} onClick={()=>this.props.onSquareClick(item.key)} key={item.key}/>) } )}
        </div>
      )
    } else {
      return (
       <div className="board-row">
          {this.props.row.map( (item) => { return (<Square text={item.displayText} key={item.key}/>) } )}
        </div>
      )
    }
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
        <div className="game-board">    	
          <Row row={headerRow}/>      	

            {values.map((val) => {
              let row = []
              
              this.props.categories.map((category, index) => {
                let key = val + ":" + index;
                let displayText = val;
                if(this.props.picks.includes(key)) {
                  displayText = "";
                }

                row.push({ displayText: displayText, key: key }); 
              })

              return (<Row row={row} key={val} onSquareClick={this.props.onSquareClick}/>)          
            })}

  		</div>      
  	</div>    		    
  )}
}

class FinalsListItem extends React.Component {
  render() {
    let disable = this.props.finalItem.disabled;

    return (
      <div className="final-item">{this.props.playerName}, Wager: {this.props.finalItem.wager}<br/>{this.props.finalItem.solution}<br/>
          <button className="win-lose" onClick={this.props.onWin} disabled={disable}>WIN</button>
          <button className="win-lose" onClick={this.props.onLose} disabled={disable}>LOSE</button>
      </div>
    );
  }
}

class BuzzListItem extends React.Component {  
  render() {
    let disable = this.props.buzzer.disabled;

    return (
      <div className="buzz-item">{this.props.buzzer.name}
          <button className="win-lose" onClick={this.props.onWin} disabled={disable}>WIN</button>
          <button className="win-lose" onClick={this.props.onLose} disabled={disable}>LOSE</button>
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
      selectedPrompt: null,
      picks: [],
      buzzes: [],
      finals: []
    };
  }

  componentDidMount() {
    const playersRef = child(gameRef, 'players');
    
    onChildAdded(playersRef, snap => {
      let players = this.state.players.slice();
      let p = snap.val();
      let score = p.score || 0;
      
      players.push({id: snap.key, name: p.name, score:score});

      players.sort((a, b) => b.score - a.score);
            
      this.setState({players: players});
    });

    onChildRemoved(playersRef, snap => {
      let oldPlayersList = this.state.players.slice();
      let p = snap.key;      
      let removeIndex = oldPlayersList.map(function(item) { return item.id; }).indexOf(p);

      console.log("Remove Index: " + removeIndex);

      this.setState({players: oldPlayersList.splice(removeIndex, 1)});
    });

    onChildChanged(playersRef, snap => {
      let players = this.state.players.slice();
      let p = snap.val();      

      for(var i = 0; players.length ; i++) {
        if(players[i].id == snap.key) {
          players[i].score = p.score;
          players[i].name = p.name;

          players.sort((a, b) => b.score - a.score);

          this.setState({players: players});
          return;
        }
      }      
    });

    const boardRef = child(gameRef, 'board');
    get(boardRef).then(snap => {
      this.setState({board: snap.val()});

      const gameStateRef = child(gameRef, 'gameState');
      onValue(gameStateRef, snap => {      
        let state = {};
        state.status = snap.val();

        this.setState(state);
      });

      const picksLimitRef = query(child(gameRef, 'picks'), limitToLast(1));
      onChildAdded(picksLimitRef, snap => {
        this.setState({selectedPrompt: this.getSelectedPromptFromKey(snap.val())})
      });
    });

    const picksRef = child(gameRef, 'picks');
    onChildAdded(picksRef, snap => {
      let picks = this.state.picks.slice();

      picks.push(snap.val());
      this.setState({picks: picks});
    });

    onChildRemoved(picksRef, snap => {      
      this.setState({picks: []});
    });

    const buzzesRef = child(gameRef, 'buzzes');
    onChildAdded(buzzesRef, snap => {
      let buzzes = this.state.buzzes.slice();
      let buzz = snap.val();
      buzz.buzzId = snap.key;
      buzzes.push(buzz);

      this.setState({buzzes: buzzes});
    });    

    onChildRemoved(buzzesRef, snap => {
      // this.setState({buzzes: []});
    });

    const finalsRef = child(gameRef, 'finals');
    onChildAdded(finalsRef, snap => {
      let finals = this.state.finals.slice();
      let finalItem = snap.val();
      finalItem.id = snap.key
      finals.push(finalItem);

      this.setState({finals: finals});  
    });    

    onChildChanged(finalsRef, snap => {
      let finals = this.state.finals.slice();
      let finalItem = snap.val();

      for(var i = 0; i < finals.length ; i++) {
        if(finals[i].id == snap.key) {
          finals[i].wager = finalItem.wager;
          finals[i].solution = finalItem.solution;
        }
      }

      this.setState({finals: finals});
    }); 

    onChildRemoved(finalsRef, snap => {
      this.setState({finals: []});
    });    
  }

  componentWillUnmount() {
    // Unsubscribe from Firebase listeners
    const playersRef = child(gameRef, 'players');
    const gameStateRef = child(gameRef, 'gameState');
    const picksRef = child(gameRef, 'picks');
    const buzzesRef = child(gameRef, 'buzzes');
    const finalsRef = child(gameRef, 'finals');
    
    off(playersRef);
    off(gameStateRef);
    off(picksRef);
    off(buzzesRef);
    off(finalsRef);
  }

  showSolution() {
    const gameStateRef = child(gameRef, 'gameState');

    if(!this.state.selectedPrompt.solution) {
      this.nextQuestion();
    } else {
      set(gameStateRef, "DISPLAY_SOLUTION");
      setTimeout(_ => {
        this.nextQuestion();
      }, 5000)
    }
  }
 
  nextQuestion() {
    this.setState({selectedPrompt: null});

    const buzzesRef = child(gameRef, 'buzzes');
    const gameStateRef = child(gameRef, 'gameState');
    
    remove(buzzesRef);
    this.setState({buzzes: []});
    set(gameStateRef, "WAITING_PICK");
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
    
    if(this.state.board[col].q) {
      selectedPrompt.solution = this.state.board[col].q[val];
    } else {
      selectedPrompt.solution = "No Solution Stored";
    }

    return selectedPrompt;
  }

  getPlayerById(id) {
    for(var i = 0 ; i < this.state.players.length; i++) {
      if(this.state.players[i].id == id) {
        return this.state.players[i];
      }      
    }    
  }

  handleStartGame() {
    let displaySolution = this.state.status === "DISPLAY_SOLUTION";
    let enableStartGame = this.state.status === "NEW" && !displaySolution;
    if(enableStartGame) {
      const gameStateRef = child(gameRef, 'gameState');
      set(gameStateRef, "WAITING_PICK");
    } else {     
      let reset = confirm('Reset Game?');
      if(reset) {
        const picksRef = child(gameRef, 'picks');
        const playersRef = child(gameRef, 'players');
        const buzzesRef = child(gameRef, 'buzzes');
        const gameStateRef = child(gameRef, 'gameState');
        const finalsRef = child(gameRef, 'finals');
        
        remove(picksRef);
        remove(playersRef);
        remove(buzzesRef);
        remove(finalsRef);
        this.setState({players: [], finals: [], buzzes: [], picks: [], selectedPrompt: null});
        set(gameStateRef, "NEW");
      }
    }
  }

  handleEndGame() {
    let end = confirm('End Game?');
    if(end) {
      const gameStateRef = child(gameRef, 'gameState');
      set(gameStateRef, "ENDED");
    }
  }

  startTimer(time, endFunction) {
    this.setState({ timer: time });
    const timerRef = child(gameRef, 'timer')
      

    // Clear any existing timer to avoid multiple intervals
    if (this.timerInterval) {
        clearInterval(this.timerInterval);
    }

    // Start a new interval
    this.timerInterval = setInterval(() => {
        if (this.state.timer > 0) {            
            this.setState((prevState) => ({ timer: prevState.timer - 1 }));
            console.log(`Timer ticked: ${this.state.timer} seconds`);
            set(timerRef, this.state.timer);
        } else {
          clearInterval(this.timerInterval); // Stop the timer when it reaches 0
          endFunction();
        }
    }, 1000); // Tick every second
}

  handleStartFinalRound() {
    let startFinal = confirm('Start Final Round?');  //TODO: Don't prompt if there are still points on the board
    if(startFinal) {
      const gameStateRef = child(gameRef, 'gameState');
      set(gameStateRef, "FINAL_ROUND_WAGER");
      this.startTimer(60, _ => {
        set(gameStateRef, "FINAL_ROUND_PROMPT");
        this.startTimer(60, _ => {
          set(gameStateRef, "FINAL_ROUND_DISPLAY");
        }); 
      });
    }
  }

  handleDisplayPick(key) {
    if(this.state.status == "WAITING_PICK") {
      const picksRef = child(gameRef, 'picks');
      const gameStateRef = child(gameRef, 'gameState');
      
      push(picksRef, key);
      set(gameStateRef, 'DISPLAY_PICK');

      setTimeout(_ => {
        set(gameStateRef, 'BUZZ_READY');
      }, 3000)
    }
  }

  handleSkipPick(key) {
    let skip = confirm('Really Skip?');

    if(skip) {
      this.showSolution();
    }
  }

  handleSquareClick(key) {
    if(this.state.status != "WAITING_PICK") {
      return;
    }    

    this.setState({selectedPrompt: this.getSelectedPromptFromKey(key)})
  }  

  handleFinalWin(finalItem) {
    let finals = this.state.finals.slice();
    let index = finals.indexOf(finalItem);
    finalItem.disabled = true;
    finals[index] = finalItem;
    
    this.setState({finals: finals})

    let p = this.getPlayerById(finalItem.id);
    let currentScore = p.score ? parseInt(p.score) : 0;
    
    const playersRef = child(child(gameRef, 'players'),finalItem.id);
    const playerScoreRef = child(playersRef, 'score');

    set(playerScoreRef, currentScore + parseInt(finalItem.wager));
    remove(child(playersRef, 'wager'));
  } 

  handleFinalLose(finalItem) {
    let finals = this.state.finals.slice();
    let index = finals.indexOf(finalItem);
    finalItem.disabled = true;
    finals[index] = finalItem;
    
    this.setState({finals: finals})

    let p = this.getPlayerById(finalItem.id);
    let currentScore = p.score ? parseInt(p.score) : 0;
    
    const playersRef = child(child(gameRef, 'players'),finalItem.id);
    const playerScoreRef = child(playersRef, 'score');

    set(playerScoreRef, currentScore - parseInt(finalItem.wager));
    remove(child(playersRef, 'wager'));
  }

  handleWin(buzzer) {
    let buzzes = this.state.buzzes.slice();
    let index = buzzes.indexOf(buzzer);
    buzzer.disabled = true;
    buzzes[index] = buzzer;

    this.setState({buzzes: buzzes})

    let p = this.getPlayerById(buzzer.id);
    let currentScore = p.score ? parseInt(p.score) : 0;

    const playerScoreRef = child(child(child(gameRef, 'players'), buzzer.id), 'score');     
    set(playerScoreRef, currentScore + parseInt(this.state.selectedPrompt.value));

    this.showSolution();
  }


  handleLose(buzzer) {
    let buzzes = this.state.buzzes.slice();
    let index = buzzes.indexOf(buzzer);
    buzzer.disabled = true;
    buzzes[index] = buzzer;

    this.setState({buzzes: buzzes})

    let p = this.getPlayerById(buzzer.id);
    let currentScore = p.score ? parseInt(p.score) : 0;

    const playerScoreRef = child(child(child(gameRef, 'players'), buzzer.id), 'score');
    set(playerScoreRef, currentScore - parseInt(this.state.selectedPrompt.value));

    remove(child(child(gameRef, 'buzzes'), buzzer.buzzId));
    
  }

  renderSelectedPrompt() {      
    if(this.state.status.startsWith("FINAL")) {
      return;
    }

    if(this.state.selectedPrompt === null) {
      return (<div className="host-question"><span>No Selected Question</span></div>)
    } else {
      return (
      <div className="host-question">
        <div>
          <span className="bold">{this.state.selectedPrompt.category}, {this.state.selectedPrompt.value}</span>
          <br/>
          <span>{this.state.selectedPrompt.text}</span>          
          <span className="solution">Solution:<br/>
          <span className="solution-text">{this.state.selectedPrompt.solution}</span>
          </span>
          <button className="display-pick" onClick={_ => this.handleDisplayPick(this.state.selectedPrompt.key)} disabled={this.state.status != "WAITING_PICK"}>Display Question</button>
          <button className="display-pick" onClick={_ => this.handleSkipPick(this.state.selectedPrompt.key)} disabled={this.state.status != "BUZZ_READY"}>Skip</button>
        </div>
      </div>
      );
    }
  }  

  renderBuzzersList() {
    if(this.state.status == 'BUZZ_READY') {
      if( this.state.buzzes.length == 0) {
        return (
          <div className="host-question">
            <span className="bold">Buzzers</span>
            <br/>No Buzzers
          </div>
        );
      } else { 
        return (
          <div className="host-question">
          <span className="bold">Buzzers</span>
          { this.state.buzzes.map(buzzer => { 
            return (<BuzzListItem buzzer={buzzer} 
              key={buzzer.id + "_buzzer"}
              onWin={_ => this.handleWin(buzzer)}
              onLose={_ => this.handleLose(buzzer)}
              />)
          })}
          </div>
        );
      }
    }
  }

  renderFinalsList() {
    if(this.state.status != "FINAL_ROUND_PROMPT" && this.state.status != "FINAL_ROUND_DISPLAY") {
      return;
    }

    if(this.state.finals.length == 0) {
      return (
        <div className="host-question">
          <span className="bold">Finals</span>
          <br/>Nothing Yet...
        </div>
      );
    }
    return(
    <div className="host-finals">
    <span className="bold">Finals</span>
    { this.state.finals.map(finalItem => { 
      let player = this.getPlayerById(finalItem.id);

      return (<FinalsListItem finalItem={finalItem}
        playerName={player.name} 
        key={finalItem.id + "_final"}
        onWin={_ => this.handleFinalWin(finalItem)}
        onLose={_ => this.handleFinalLose(finalItem)}
        />)
    })}
    </div>);

  }

  render() {
    let displaySolution = this.state.status === "DISPLAY_SOLUTION";
    let enableStartGame = (this.state.status === "NEW") && !displaySolution;
    let enableEndGame = !enableStartGame && !displaySolution;
    let enableFinalRound = !displaySolution && !this.state.status.startsWith("FINAL") && this.state.status != "NEW";


  	let categories = [];
  	if(this.state.board) {
		  categories = this.state.board.slice()
  	}

    return (    
    	<div className="container">
    		<Board categories={categories} picks={this.state.picks} onSquareClick={key => this.handleSquareClick(key)}/>

      		<div className="host-control">
            <div>Game State: {this.state.status}
            <br/>
            <button onClick={_ => this.handleStartGame() }>{enableStartGame? "Start" : "Reset" }</button>
            &nbsp;
            <button onClick={_ => this.handleEndGame()} disabled={!enableEndGame}>End Game</button>
            &nbsp;
            <button onClick={_ => this.handleStartFinalRound()} disabled={!enableFinalRound}>Start Final Round</button>
            </div>

            <div>
              <ul>
                <li>Players: </li>           
                 {this.state.players.length == 0 ? (<li>No players</li>) : this.state.players.map((player) => (<li key={player.id}>{player.name}: {player.score}</li>)) }
              </ul>        
            </div>

            
            {this.renderSelectedPrompt()}
            {this.renderBuzzersList()}
            {this.renderFinalsList()}
      		</div>
      	</div>
    );
  }
}

document.addEventListener('DOMContentLoaded', function() {
  ReactDOM.render(
    React.createElement(Host),
    document.getElementById('mount')
  );
});
