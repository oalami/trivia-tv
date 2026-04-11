
## Trivia TV Game

A trivia party game designed for live group events. Show the game board on a TV, control the game from a host device, and let players buzz in from their phones.

Built with React and Firebase Realtime Database.

## How It Works

There are three separate interfaces, each opened in its own browser:

- **TV** (`tv.html`) -- Displays the game board, questions, scores, and timer to the audience.
- **Host** (`host.html`) -- Controls the game: selects questions, judges answers (win/lose), manages rounds.
- **Phone** (`phone.html`) -- Players enter a team name and use their phone as a buzzer.

All clients stay in sync in real-time via Firebase.

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```
2. Start the dev server (with hot rebuild):
   ```
   npm run dev
   ```
3. Open each interface in a browser (all on `http://localhost:3000`):
   - Host: `http://localhost:3000/host.html`
   - TV: `http://localhost:3000/tv.html`
   - Players: `http://localhost:3000/phone.html`

### Production Build and Deploy

```
npm run compile       # build bundles
npm start             # start server (production mode)
firebase deploy       # deploy to Firebase Hosting
```

### Custom Game ID

By default the game uses the `game7` reference in Firebase. You can use a different game by adding a `?game=` query parameter to all three URLs:

```
http://localhost:3000/tv.html?game=myGame
http://localhost:3000/host.html?game=myGame
http://localhost:3000/phone.html?game=myGame
```

If the game node doesn't exist yet in Firebase, the host will bootstrap it automatically.

## Loading Questions from Google Sheets

Instead of manually loading questions into Firebase, the host can import them directly from a Google Sheet:

1. Create a Google Sheet with columns: **Category**, **Answer** (the prompt shown to players), **Question** (the solution).
2. Group 5 rows per category. Add a row with category "Final Jeopardy Round" for the final round.
3. Share the sheet publicly (Anyone with the link).
4. On the host page (when game state is `NEW`), paste the sheet URL and tab name, then click **Load Questions**.

Point values (100-500) are assigned automatically by row order within each category. The first 5 categories are used.

## Game Flow

```
NEW -> WAITING_PICK -> DISPLAY_PICK -> BUZZ_READY -> WAITING_PICK -> ... -> ENDED
                                                         \
                                          FINAL_ROUND_WAGER -> FINAL_ROUND_PROMPT -> FINAL_ROUND_DISPLAY -> ENDED
```

| State | Description |
|-------|-------------|
| `NEW` | Lobby. Players join, host hasn't started yet. |
| `WAITING_PICK` | Host selects a question from the board. |
| `DISPLAY_PICK` | Question is shown on the TV. |
| `BUZZ_READY` | Players can buzz in. Host judges answers. |
| `DISPLAY_SOLUTION` | Solution is briefly shown on TV. |
| `FINAL_ROUND_WAGER` | Players enter a point wager (60s timer). |
| `FINAL_ROUND_PROMPT` | Players submit their answer (60s timer). |
| `FINAL_ROUND_DISPLAY` | Final scores displayed. |
| `ENDED` | Game over. |

## Project Structure

```
src/
  fb.js        -- Firebase initialization and auth
  host.js      -- Host control UI (React)
  tv.js        -- TV display UI (React)
  phone.js     -- Mobile buzzer UI (React)
public/
  host.html    -- Host page
  tv.html      -- TV display page
  phone.html   -- Player page
  css/         -- Stylesheets
  js/          -- Compiled bundles (output of webpack)
quiz.json      -- Sample question data
server.js      -- Express dev server
```

## License

This library is licensed under the MIT License. Full license text is available in [LICENSE](LICENSE).
