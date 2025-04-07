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

Firebase.initializeApp(firebaseConfig); 

Firebase.auth().signInAnonymously().catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  
  console.log(errorMessage);
});

var gameRef = Firebase.database().ref("games/game5");





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
    gameRef.child('players').on('child_added', snap => {
      let players = this.state.players.slice();
      let p = snap.val();
      
      players.push({id: snap.key, name: p.name, score:p.score});
            
      this.setState({players: players});
    });

    gameRef.child('players').on('child_removed', snap => {
      let players = this.state.players.slice();
      let p = snap.val();      

      let index = players.indexOf(p);
      players.splice(index, 1);

      this.setState({players: players});
    });

    gameRef.child('players').on('child_changed', snap => {
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

    gameRef.child('board').once('value', snap => {
      this.setState({board: snap.val()});

      gameRef.child('gameState').on('value', snap => {      
        let state = {};
        state.status = snap.val();

        this.setState(state);
      });

      gameRef.child('picks').limitToLast(1).once('child_added', snap => {
        this.setState({selectedQuestion: this.getSelectedQuestionFromKey(snap.val())})
      })      
    });

    gameRef.child('picks').on('child_added', snap => {
      let picks = this.state.picks.slice();

      picks.push(snap.val());
      this.setState({picks: picks});
    });

    gameRef.child('picks').on('child_removed', snap => {      
      this.setState({picks: []});
    });

    gameRef.child('buzzes').on('child_added', snap => {
      let buzzes = this.state.buzzes.slice();
      buzzes.push(snap.val());

      this.setState({buzzes: buzzes});
    });    

    gameRef.child('buzzes').on('child_removed', snap => {
      this.setState({buzzes: []});
    });
  }

  componentWillUnmount() {
    gameRef.off();
  }

  nextQuestion() {
      this.setState({selectedQuestion: null});

      gameRef.child('buzzes').remove( _ => {})
      gameRef.child('gameState').set("WAITING_PICK");
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
      gameRef.child('gameState').set("WAITING_PICK");
    } else {     
      let reset = confirm('Reset Game?');
      if(reset) {
        gameRef.child('picks').remove(_ => {});
        gameRef.child('players').remove(_ => {});
        gameRef.child('buzzes').remove(_ => {});          
        gameRef.child('gameState').set("NEW");
      }
    }
  }

  handleDisplayPick(key) {
    if(this.state.status != "WAITING_PICK") {
      return;
    }

    gameRef.child('picks').push(key);
    gameRef.child('gameState').set('DISPLAY_PICK');

    setTimeout(_ => {gameRef.child('gameState').set('BUZZ_READY')}, 3000)
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

    gameRef.child('players').child(buzzer.id).child('score').set(currentScore + parseInt(this.state.selectedQuestion.value))

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

    gameRef.child('players').child(buzzer.id).child('score').set(currentScore - parseInt(this.state.selectedQuestion.value))    
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
