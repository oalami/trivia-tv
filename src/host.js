import React from 'react';
import ReactDOM from 'react-dom';
import * as FB from './fb.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onChildAdded, onChildRemoved, onChildChanged, onValue, get, set, remove, query, limitToLast, push, child } from 'firebase/database';
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
      finals: [],
      sheetUrl: "",
      sheetTab: "",
      sheetLoading: false,
      sheetError: null
    };
    this.handleLoadSheet = this.handleLoadSheet.bind(this);
  }

  componentDidMount() {
    this.unsubscribers = [];
    const playersRef = child(gameRef, 'players');

    this.unsubscribers.push(onChildAdded(playersRef, snap => {
      let players = this.state.players.slice();
      let p = snap.val();
      let score = p.score || 0;
      
      players.push({id: snap.key, name: p.name, score:score});

      players.sort((a, b) => b.score - a.score);
            
      this.setState({players: players});
    }));

    this.unsubscribers.push(onChildRemoved(playersRef, snap => {
      let oldPlayersList = this.state.players.slice();
      let p = snap.key;      
      let removeIndex = oldPlayersList.map(function(item) { return item.id; }).indexOf(p);

      console.log("Remove Index: " + removeIndex);

      this.setState({players: oldPlayersList.filter((_, i) => i !== removeIndex)});
    }));

    this.unsubscribers.push(onChildChanged(playersRef, snap => {
      let players = this.state.players.slice();
      let p = snap.val();      

      for(var i = 0; i < players.length ; i++) {
        if(players[i].id == snap.key) {
          players[i].score = p.score;
          players[i].name = p.name;

          players.sort((a, b) => b.score - a.score);

          this.setState({players: players});
          return;
        }
      }
    }));

    const boardRef = child(gameRef, 'board');
    get(boardRef).then(snap => {
      this.setState({board: snap.val() || []});

      const gameStateRef = child(gameRef, 'gameState');
      if (!snap.exists()) {
        set(gameStateRef, "NEW").catch(console.error);
      }
      this.unsubscribers.push(onValue(gameStateRef, snap => {
        let state = {};
        state.status = snap.val() || "NEW";

        this.setState(state);
      }));

      const picksLimitRef = query(child(gameRef, 'picks'), limitToLast(1));
      this.unsubscribers.push(onChildAdded(picksLimitRef, snap => {
        this.setState({selectedPrompt: this.getSelectedPromptFromKey(snap.val())})
      }));
    });

    const picksRef = child(gameRef, 'picks');
    this.unsubscribers.push(onChildAdded(picksRef, snap => {
      let picks = this.state.picks.slice();

      picks.push(snap.val());
      this.setState({picks: picks});
    }));

    this.unsubscribers.push(onChildRemoved(picksRef, snap => {
      this.setState({picks: []});
    }));

    const buzzesRef = child(gameRef, 'buzzes');
    this.unsubscribers.push(onChildAdded(buzzesRef, snap => {
      let buzzes = this.state.buzzes.slice();
      let buzz = snap.val();
      buzz.buzzId = snap.key;
      buzzes.push(buzz);

      this.setState({buzzes: buzzes});
    }));

    this.unsubscribers.push(onChildRemoved(buzzesRef, snap => {
      // this.setState({buzzes: []});
    }));

    const finalsRef = child(gameRef, 'finals');
    this.unsubscribers.push(onChildAdded(finalsRef, snap => {
      let finals = this.state.finals.slice();
      let finalItem = snap.val();
      finalItem.id = snap.key
      finals.push(finalItem);

      this.setState({finals: finals});
    }));

    this.unsubscribers.push(onChildChanged(finalsRef, snap => {
      let finals = this.state.finals.slice();
      let finalItem = snap.val();

      for(var i = 0; i < finals.length ; i++) {
        if(finals[i].id == snap.key) {
          finals[i].wager = finalItem.wager;
          finals[i].solution = finalItem.solution;
        }
      }

      this.setState({finals: finals});
    }));

    this.unsubscribers.push(onChildRemoved(finalsRef, snap => {
      this.setState({finals: []});
    }));
  }

  componentWillUnmount() {
    this.unsubscribers.forEach(unsub => unsub());
  }

  parseCSV(text) {
    let rows = [];
    let current = '';
    let inQuotes = false;
    let fields = [];

    for (let i = 0; i < text.length; i++) {
      let ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current.trim());
          current = '';
        } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
          fields.push(current.trim());
          current = '';
          if (fields.some(f => f !== '')) rows.push(fields);
          fields = [];
          if (ch === '\r') i++;
        } else {
          current += ch;
        }
      }
    }
    if (current || fields.length > 0) {
      fields.push(current.trim());
      if (fields.some(f => f !== '')) rows.push(fields);
    }
    return rows;
  }

  transformSheetToBoard(rows) {
    // Validate header row
    let header = rows[0].map(h => h.toLowerCase().trim());
    let catIdx = header.indexOf('category');
    let ansIdx = header.indexOf('answer');
    let qIdx = header.indexOf('question');

    if (catIdx === -1 || ansIdx === -1) {
      throw new Error('Sheet must have "Category" and "Answer" columns. Found: ' + rows[0].join(', '));
    }

    let dataRows = rows.slice(1);
    let categories = {};
    let categoryOrder = [];
    let finalRound = null;
    let warnings = [];
    let nextRowIsFinal = false;

    for (let row of dataRows) {
      let category = (row[catIdx] || '').trim();
      let answer = (row[ansIdx] || '').trim();
      let question = qIdx !== -1 ? (row[qIdx] || '').trim() : '';

      if (!category) continue;

      if (nextRowIsFinal) {
        finalRound = { category: category, prompt: answer || question };
        nextRowIsFinal = false;
        continue;
      }

      if (category.toLowerCase().includes('final')) {
        if (!answer && !question) {
          // Section header row (e.g. "Final Jeopardy Round") — real data is next row
          nextRowIsFinal = true;
        } else {
          finalRound = { category: category, prompt: answer || question };
        }
        continue;
      }

      if (!answer) {
        warnings.push('Skipped empty answer in "' + category + '"');
        continue;
      }

      if (!categories[category]) {
        categories[category] = [];
        categoryOrder.push(category);
      }
      categories[category].push({ answer: answer, question: question });
    }

    if (categoryOrder.length === 0) {
      throw new Error('No categories with questions found in sheet');
    }

    // Warn about categories with wrong number of questions
    for (let cat of categoryOrder) {
      let count = categories[cat].length;
      if (count < 5) {
        warnings.push('"' + cat + '" has only ' + count + ' question(s), expected 5');
      } else if (count > 5) {
        warnings.push('"' + cat + '" has ' + count + ' questions, using first 5');
      }
    }

    let board = categoryOrder.map(cat => {
      let items = {};
      let q = {};
      let values = [100, 200, 300, 400, 500];
      categories[cat].slice(0, 5).forEach((row, i) => {
        items[values[i]] = row.answer;
        q[values[i]] = row.question;
      });
      return { category: cat, items: items, q: q };
    });

    return { board: board, finalRound: finalRound, warnings: warnings };
  }

  handleLoadSheet() {
    let url = this.state.sheetUrl;
    let tab = this.state.sheetTab;

    let match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      this.setState({ sheetError: "Invalid Google Sheets URL" });
      return;
    }

    let spreadsheetId = match[1];
    let csvUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId +
      '/gviz/tq?tqx=out:csv' + (tab ? '&sheet=' + encodeURIComponent(tab) : '');

    this.setState({ sheetLoading: true, sheetError: null });

    fetch(csvUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch sheet (HTTP ' + res.status + '). Is the sheet shared publicly?');
        return res.text();
      })
      .then(text => {
        if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
          throw new Error('Sheet returned an HTML page instead of CSV. Make sure the sheet is shared publicly (Anyone with the link).');
        }

        let rows = this.parseCSV(text);
        if (rows.length < 2) throw new Error('Sheet appears empty or has only a header row');

        let result = this.transformSheetToBoard(rows);

        const boardRef = child(gameRef, 'board');
        const finalRoundRef = child(gameRef, 'finalRound');

        let writes = [set(boardRef, result.board)];
        if (result.finalRound) {
          writes.push(set(finalRoundRef, result.finalRound));
        }

        return Promise.all(writes).then(() => {
          let warnings = result.warnings.length > 0 ? result.warnings.join('; ') : null;
          this.setState({ sheetLoading: false, board: result.board, sheetError: warnings ? 'Warnings: ' + warnings : null });
        });
      })
      .catch(err => {
        this.setState({ sheetLoading: false, sheetError: err.message });
      });
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

        remove(picksRef).catch(console.error);
        remove(playersRef).catch(console.error);
        remove(buzzesRef).catch(console.error);
        remove(finalsRef).catch(console.error);
        this.setState({players: [], finals: [], buzzes: [], picks: [], selectedPrompt: null});
        set(gameStateRef, "NEW").catch(console.error);
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

    set(playerScoreRef, currentScore + parseInt(finalItem.wager)).catch(console.error);
    remove(child(playersRef, 'wager')).catch(console.error);
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

    set(playerScoreRef, currentScore - parseInt(finalItem.wager)).catch(console.error);
    remove(child(playersRef, 'wager')).catch(console.error);
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
    set(playerScoreRef, currentScore + parseInt(this.state.selectedPrompt.value)).catch(console.error);

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
    set(playerScoreRef, currentScore - parseInt(this.state.selectedPrompt.value)).catch(console.error);

    remove(child(child(gameRef, 'buzzes'), buzzer.buzzId)).catch(console.error);
    
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

            {enableStartGame && (
            <div className="sheet-import">
              <span className="bold">Load Questions from Google Sheet</span>
              <input type="text" placeholder="Google Sheets URL"
                value={this.state.sheetUrl}
                onChange={e => this.setState({sheetUrl: e.target.value})} />
              <input type="text" placeholder="Tab name (optional)"
                value={this.state.sheetTab}
                onChange={e => this.setState({sheetTab: e.target.value})} />
              <button onClick={this.handleLoadSheet} disabled={this.state.sheetLoading || !this.state.sheetUrl}>
                {this.state.sheetLoading ? "Loading..." : "Load Questions"}
              </button>
              {this.state.sheetError && this.state.sheetError.startsWith('Warnings:') ? (
                <div className="sheet-warning">{this.state.sheetError}</div>
              ) : this.state.sheetError ? (
                <div className="sheet-error">{this.state.sheetError}</div>
              ) : null}
              {this.state.board.length > 0 && !this.state.sheetLoading && (
                <div className="sheet-success">{this.state.board.length} categories loaded</div>
              )}
            </div>
            )}

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
