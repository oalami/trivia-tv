import React from 'react';
import ReactDOM from 'react-dom';
import * as FB from './fb.js'

var gameRef = FB.init()

document.addEventListener('DOMContentLoaded', function() {
  ReactDOM.render(
    React.createElement(TV),
    document.getElementById('mount')
  );
});

class DisplayQuestion extends React.Component {

	render() {
		return (
			<div className="display-item-parent">
		<div className="display-item">
			<div>{this.props.selectedQuestion.text}</div>
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
		{ this.props.row.map( item => { 
          	return (
          		<Square text={(this.props.headerRow || item.displayText == "" ? "" : "$") + item.displayText} key={item.key}/>
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
          <Row row={headerRow} headerRow={true}/>      	

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

              return (<Row row={row} key={val} headerRow={false}/>)          
            })}

  		</div>      
  	</div>    		    
  )}
}

class PlayerList extends React.Component {
	render() {
		return (
			<div className="player-list">
				<div className="player-box-header">TEAMS</div>
				{this.props.players.map(p => {
					let score = p.score || "0";
					return (<div className={"player-box" + (this.props.buzzerName == p.name ? " buzzed" : "")}>
										<div className={"player-name" + (this.props.buzzerName == p.name ? " buzzed" : "")}>{p.name}</div>
										<div className="player-score">{score}</div>
									</div>)
				})}
			</div>
		);
	}
}


class TV extends React.Component {
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
	    });

	    gameRef.child('picks').on('child_added', snap => {
	   	  let pick = snap.val();
	      let picks = this.state.picks.slice();
	      picks.push(pick);

	      let sq = this.getSelectedQuestionFromKey(pick);

	      console.log(pick)
	      console.log(sq)

	      this.setState({picks: picks, selectedQuestion: sq});
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
  		if(this.state.board) {
		  	categories = this.state.board.slice()
  		}

  		let buzzerName = "";
  		if(this.state.buzzes.length > 0) {
  			buzzerName = this.state.buzzes[0].name;
  		}
  		console.log('here: buzz: ' + buzzerName);

  		if(this.state.selectedQuestion != null && (this.state.status == "DISPLAY_PICK" || this.state.status == "BUZZ_READY")) {  			
		   return (    
		    	<div className="tv-content">
		    		<DisplayQuestion selectedQuestion={this.state.selectedQuestion}/>
		    		<PlayerList players={this.state.players} buzzerName={buzzerName}/>
		      </div>
		    );	
		} else {
		   return (    
		    	<div className="tv-content">
		    		<Board categories={categories} picks={this.state.picks}/>
		    		<PlayerList players={this.state.players} buzzerName={buzzerName}/>
		      </div>
		    );				
		}
	}
}