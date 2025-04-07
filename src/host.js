import React from 'react';
import ReactDOM from 'react-dom';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onChildAdded, onChildRemoved, onChildChanged, onValue, get, set, remove, off, query, limitToLast, push, child } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

var firebaseConfig = {
    apiKey: "AIzaSyAlp9TIA0g3j0icy7YZreldkWaSVCJtK18",
    authDomain: "tvquiz-92dd4.firebaseapp.com",
    databaseURL: "https://tvquiz-92dd4.firebaseio.com",
    projectId: "tvquiz-92dd4",
    storageBucket: "tvquiz-92dd4.appspot.com",
    messagingSenderId: "946323037907"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInAnonymously(auth).catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  
  console.log(errorMessage);
});

const db = getDatabase(app);
const gameRef = ref(db, "games/game5");

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
      selectedQuestion: null,
      picks: [],
      buzzes: []
    };
  }

  componentWillMount() {
    const playersRef = child(gameRef, 'players');
    
    onChildAdded(playersRef, snap => {
      let players = this.state.players.slice();
      let p = snap.val();
      
      players.push({id: snap.key, name: p.name, score:p.score});
            
      this.setState({players: players});
    });

    onChildRemoved(playersRef, snap => {
      let players = this.state.players.slice();
      let p = snap.val();      

      let index = players.indexOf(p);
      players.splice(index, 1);

      this.setState({players: players});
    });

    onChildChanged(playersRef, snap => {
      let players = this.state.players.slice();
      let p = snap.val();      

      for(var i = 0; players.length ; i++) {
        if(players[i].id == snap.key) {
          players[i].score = p.score;
          players[i].name = p.name;
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
        this.setState({selectedQuestion: this.getSelectedQuestionFromKey(snap.val())})
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
      buzzes.push(snap.val());

      this.setState({buzzes: buzzes});
    });    

    onChildRemoved(buzzesRef, snap => {
      this.setState({buzzes: []});
    });
  }

  componentWillUnmount() {
    // Unsubscribe from Firebase listeners
    const playersRef = child(gameRef, 'players');
    const gameStateRef = child(gameRef, 'gameState');
    const picksRef = child(gameRef, 'picks');
    const buzzesRef = child(gameRef, 'buzzes');
    
    off(playersRef);
    off(gameStateRef);
    off(picksRef);
    off(buzzesRef);
  }

  nextQuestion() {
    this.setState({selectedQuestion: null});

    const buzzesRef = child(gameRef, 'buzzes');
    const gameStateRef = child(gameRef, 'gameState');
    
    remove(buzzesRef);
    set(gameStateRef, "WAITING_PICK");
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

  getPlayerById(id) {
    for(var i = 0 ; i < this.state.players.length; i++) {
      if(this.state.players[i].id == id) {
        return this.state.players[i];
      }      
    }    
  }

  handleStartGame() {
    let enableStartGame = (this.state.status === "NEW" || this.state.status === "ENDED")
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
        
        remove(picksRef);
        remove(playersRef);
        remove(buzzesRef);
        set(gameStateRef, "NEW");
      }
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
      this.nextQuestion();
    }
  }

  handleSquareClick(key) {
    if(this.state.status != "WAITING_PICK") {
      return;
    }    

    this.setState({selectedQuestion: this.getSelectedQuestionFromKey(key)})
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
    set(playerScoreRef, currentScore + parseInt(this.state.selectedQuestion.value));

    this.nextQuestion();
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
    set(playerScoreRef, currentScore - parseInt(this.state.selectedQuestion.value));
    
    // gameRef.child('players').child(buzzer.id).child('score').set(currentScore - parseInt(this.state.selectedQuestion.value))    
  }

  renderSelectedQuestion() {
    if(this.state.selectedQuestion === null) {
      return (<span>No Selected Question</span>)
    } else {
      return (
        <div>
          <span className="bold">{this.state.selectedQuestion.category}, {this.state.selectedQuestion.value}</span>
          <br/>
          <span>{this.state.selectedQuestion.text}</span>
          <br/>
          <button className="display-pick" onClick={_ => this.handleDisplayPick(this.state.selectedQuestion.key)} disabled={this.state.status != "WAITING_PICK"}>Display Question</button>
          <button className="display-pick" onClick={_ => this.handleSkipPick(this.state.selectedQuestion.key)} disabled={this.state.status != "BUZZ_READY"}>Skip</button>
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
              key={buzzer.id}
              onWin={_ => this.handleWin(buzzer)}
              onLose={_ => this.handleLose(buzzer)}
              />)
          })}
          </div>
        );
      }
    }
  }

  render() {
    let enableStartGame = (this.state.status === "NEW" || this.state.status === "ENDED")


  	let categories = [];
  	if(this.state.board) {
		  categories = this.state.board.slice()
  	}

    return (    
    	<div className="container">
    		<Board categories={categories} picks={this.state.picks} onSquareClick={key => this.handleSquareClick(key)}/>

      		<div className="host-control">
            <div>Status: {this.state.status} <button onClick={_ => this.handleStartGame() }>{enableStartGame? "Start" : "Reset" }</button></div>

            <div>
              <ul>
                <li>Players: </li>           
                 {this.state.players.length == 0 ? (<li>No players</li>) : this.state.players.map((player) => (<li key={player.id}>{player.name}: {player.score}</li>)) }
              </ul>        
            </div>

            <div className="host-question">
              {this.renderSelectedQuestion()}
            </div>

            {this.renderBuzzersList()}
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
