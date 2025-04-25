


## Triva TV Game
A trivia party game, designed to be played on a TV with mobile phones as the player buzzers. 
Built with React and Firebase.

## Features
- Real-time multiplayer gameplay
- Mobile phone buzzers
- TV display for questions and scores
- Host controls for game management

## Game State
- NEW: Game Hasn't Started
- STARTED: Game Has Started
- WAITING_PICK: Waiting For Square Pick
- DISPLAY_PICK: Prompt Picked
- BUZZ_READY: Prompt Picked, Ready for Buzzing or Prompt Picked, Player Has Buzzed
- FINAL_ROUND_WAGER: Optional final round, point wager
- FINAL_ROUND_PROMPT: Optional final round, prompt for solution
- FINAL_ROUND_DISPLAY: Optional final round, display
- ENDED: Game Over

NEW -> STARTED -> WAITING_PICK -> DISPLAY_PICK -> BUZZ_READY -> WAITING_PICK ... -> ENDED

## Getting Started
1. Install dependencies: `npm install`
2. Compile the app: `npm run compile` (development mode `npm run dev`)
3. Start the server: `npm start`
4. Open the game in your browser:
   - Host view: `http://localhost:3000/host.html`
   - TV view: `http://localhost:3000/tv.html`
   - Player view: `http://localhost:3000/phone.html` 

## License
This library is licensed under the The MIT License. Full license text is
available in [LICENSE](LICENSE).
