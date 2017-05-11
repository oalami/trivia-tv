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

Firebase.auth().onAuthStateChanged(function(user) {
  console.log('firebase auth state changed');
});

Firebase.auth().signInAnonymously().catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  
  console.log(errorMessage);
});

var gameRef = Firebase.database().ref("games/game1");





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
          {this.props.row.map( (item) => { return (<Square text={item.displayText} key={item.displayText}/>) } )}
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

class Host extends React.Component {
  constructor() {
    super();
    this.state = {
      allowBuzz: false,
      board: [],
      status: "loading",
      players: [],
      selectedQuestion: null,
      picks: []
    };
  }

  componentWillMount() {
  	gameRef.child('allowBuzz').on('value', snap => {
  		this.setState({allowBuzz: snap.val()})
  	});

    gameRef.child('players').on('value', snap => {
      let players = [];
      snap.forEach((child_snap) => {
        players.push({uid: child_snap.key, name: child_snap.val()});
      });
            
      this.setState({players: players});
    });

    gameRef.child('board').once('value', snap => {
      this.setState({board: snap.val()});

      gameRef.child('gameState').on('value', snap => {      
        this.setState({status: snap.val()});
      });

      gameRef.child('picks').limitToLast(1).once('child_added', snap => {
        this.setState({selectedQuestion: this.getSelectedQuestionFromKey(snap.val())})
      })      
    });

    gameRef.child('picks').on('child_added', snap => {
      let picks = this.state.picks.slice();

      picks.push(snap.val());
      this.setState({picks: picks});
    })

    gameRef.child('buzzes').on('child_added', snap => {
      if(this.state.status == 'BUZZ_READY') {
        gameRef.child('gameState').set("BUZZED");
      }
    });
  }

  componentWillUnmount() {
    gameRef.off();
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

  handleStartGame() {
    let enableStartGame = (this.state.status === "NEW" || this.state.status === "ENDED")
    if(enableStartGame) {      
      gameRef.child('gameState').set("WAITING_PICK");
    } else {
      gameRef.child('picks').remove(_ => {});
      gameRef.child('players').remove(_ => {});
      gameRef.child('buzzes').remove(_ => {});       
      let reset = confirm('Reset Game?');
      if(reset) {
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
      this.setState({selectedQuestion: null});

      gameRef.child('buzzes').remove( _ => {})
      gameRef.child('gameState').set("WAITING_PICK");
    }

  }

  handleSquareClick(key) {
    if(this.state.status != "WAITING_PICK") {
      return;
    }    

    this.setState({selectedQuestion: this.getSelectedQuestionFromKey(key)})
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
          <button className="display-pick" onClick={_ => this.handleSkipPick(this.state.selectedQuestion.key)} disabled={this.state.status != "BUZZ_READY" && this.state.status != "BUZZED"}>Skip</button>
        </div>
      );
    }
  }  

  render() {
  	let allowBuzz = this.state.allowBuzz;

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
                 {this.state.players.length == 0 ? (<li>No players</li>) : this.state.players.map((player) => (<li key={player.uid}>{player.name}</li>)) }
              </ul>        
            </div>

            <div className="host-question">
              {this.renderSelectedQuestion()}
            </div>
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
