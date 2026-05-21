# Audio assets

Drop royalty-free reggaeton-style MP3s here. The player loads them by
filename from `/audio/...`:

| File | Purpose | When it plays |
|---|---|---|
| `reggaeton-loop.mp3` | Primary background loop | Whenever the app is open and music is enabled |
| `lobby-loop.mp3` _(optional)_ | Lobby-screen variation | Override for MainMenu / LobbyHub if present |

Recommended sources (royalty-free / Creative Commons):

- [pixabay.com/music/search/reggaeton](https://pixabay.com/music/search/reggaeton/)
- [freemusicarchive.org](https://freemusicarchive.org/)
- [opengameart.org](https://opengameart.org/)

If a file is missing the player silently skips it — no errors. The
volume/mute UI in the top-right of the app still works for the
synthesized sound effects regardless.
