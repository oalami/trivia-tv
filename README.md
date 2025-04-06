# Trivia TV Game v1.0.0

A trivia party game, designed to be played on a TV with mobile phones as the player buzzers. 
Built with React 18 and Firebase 9.

## Features
- Real-time multiplayer gameplay
- Mobile phone buzzers
- TV display for questions and scores
- Host controls for game management

## Recent Updates (v1.0.0)
- Upgraded to React 18
- Upgraded to Firebase 9
- Modernized codebase
- Improved performance and stability
- Enhanced error handling
- Better code quality and maintainability

## Game State
- NEW: Game Hasn't Started
- STARTED: Game Has Started
- WAITING_PICK: Waiting For Square Pick
- DISPLAY_PICK: Question Picked
- BUZZ_READY: Question Picked, Ready for Buzzing or Question Picked, Player Has Buzzed
- ENDED: Game Over

NEW -> STARTED -> WAITING_PICK -> DISPLAY_PICK -> BUZZ_READY -> WAITING_PICK ... -> ENDED

## Getting Started
1. Install dependencies: `npm install`
2. Compile the app: `npm run compile`
3. Start the server: `npm start`
4. Open the game in your browser:
   - Host view: `http://localhost:3000/host.html`
   - TV view: `http://localhost:3000/tv.html`
   - Player view: `http://localhost:3000/phone.html`

## License
This library is licensed under the The MIT License. Full license text is
available in [LICENSE](LICENSE).
