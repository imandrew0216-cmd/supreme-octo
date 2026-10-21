# Supreme Octo Real Terminal

This project is a browser-based terminal powered by Node.js and the server's bash shell.

## Features
- Real shell execution using `bash`
- Browser UI for command input and output
- WebSocket communication between frontend and backend
- Works in a local dev environment

## Run locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## Notes
- This executes commands on the machine running the server.
- Use only on a trusted machine or private/internal environment.
- Add authentication before exposing it publicly.
