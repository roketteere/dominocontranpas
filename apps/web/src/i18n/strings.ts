export type Lang = "es" | "en";

export type StringKey =
    | "appTitle"
    | "appTagline"
    | "soloVsAi"
    | "onlineComingSoon"
    | "rulesLine1"
    | "rulesLine2"
    | "rulesLine3"
    | "yourTurn"
    | "noLegalPlay"
    | "isPlaying"
    | "aiThinking"
    | "tapToSelect"
    | "selectedHint"
    | "rotate"
    | "rotateShortcut"
    | "round"
    | "toWin"
    | "team"
    | "tiles"
    | "tileSingular"
    | "playing"
    | "thinking"
    | "immune"
    | "play"
    | "pass"
    | "points"
    | "pointsToTeam"
    | "nextRound"
    | "quitToMenu"
    | "matchOver"
    | "teamWins"
    | "zapato"
    | "playAgain"
    | "outcomeDomino"
    | "outcomeCapicua"
    | "outcomeChuchazo"
    | "outcomeTranca"
    | "outcomeDescDomino"
    | "outcomeDescCapicua"
    | "outcomeDescChuchazo"
    | "outcomeDescTranca"
    | "helpHeading"
    | "helpStealMechanic"
    | "helpImmunity"
    | "helpCapicua"
    | "helpChuchazo"
    | "helpTranca"
    | "helpZapato"
    | "language"
    | "switchTo";

export const STRINGS: Record<Lang, Record<StringKey, string>> = {
    es: {
        appTitle: "Dominos Con Tranpas",
        appTagline: "Dominó criollo tradicional con la mecánica del robo.",
        soloVsAi: "Solo vs IA",
        onlineComingSoon: "En línea con amigos (próximamente en Fase 3)",
        rulesLine1: "4 asientos · 2 equipos · el primero a 200 gana",
        rulesLine2: "Después de cada turno, el próximo jugador te roba una ficha a ciegas.",
        rulesLine3: "Llega a 1 ficha y ganas inmunidad (ya no te pueden robar).",
        yourTurn: "Tu turno. Arrastra una ficha a uno de los extremos.",
        noLegalPlay: "No tienes jugada — tienes que pasar.",
        isPlaying: "{name} está jugando…",
        aiThinking: "{name} está pensando…",
        tapToSelect: "Toca una ficha para seleccionar · arrástrala para jugar",
        selectedHint: "Seleccionada — arrástrala a un extremo, o gírala abajo",
        rotate: "Girar",
        rotateShortcut: "(R)",
        round: "Ronda",
        toWin: "para ganar",
        team: "Equipo",
        tiles: "fichas",
        tileSingular: "ficha",
        playing: "jugando",
        thinking: "pensando…",
        immune: "INMUNE",
        play: "Jugar",
        pass: "Pasar",
        points: "Puntos",
        pointsToTeam: "para el equipo {team}",
        nextRound: "Próxima ronda",
        quitToMenu: "Salir al menú",
        matchOver: "Partida terminada",
        teamWins: "¡Gana el equipo {team}!",
        zapato: "¡Zapato! El equipo {team} terminó en 0.",
        playAgain: "Jugar de nuevo",
        outcomeDomino: "¡Dominó!",
        outcomeCapicua: "¡Capicúa!",
        outcomeChuchazo: "¡Chuchazo!",
        outcomeTranca: "Tranca",
        outcomeDescDomino: "Vaciaste la mano",
        outcomeDescCapicua: "Pegó por los dos lados",
        outcomeDescChuchazo: "Ganaste con el 6-6",
        outcomeDescTranca: "La cadena se trancó",
        helpHeading: "Cómo se juega",
        helpStealMechanic:
            "Después de jugar o pasar, el próximo jugador te quita una ficha a ciegas. El servidor escoge la ficha al azar.",
        helpImmunity: "Cuando te queda 1 sola ficha estás inmune — nadie te la puede quitar.",
        helpCapicua: "Capicúa: ganas con una ficha que pega por los dos extremos. +25 puntos.",
        helpChuchazo: "Chuchazo: ganas poniendo el 6-6 como última ficha. +25 puntos.",
        helpTranca: "Tranca: cuando nadie puede jugar, gana el equipo con menos pintas.",
        helpZapato: "Zapato: si el equipo perdedor termina con 0, es paliza completa.",
        language: "Idioma",
        switchTo: "Switch to English",
    },
    en: {
        appTitle: "Dominos Con Tranpas",
        appTagline: "Traditional Dominó Criollo plus the steal mechanic.",
        soloVsAi: "Solo vs AI",
        onlineComingSoon: "Online with friends (coming in Phase 3)",
        rulesLine1: "4 seats · 2 teams · first to 200 wins",
        rulesLine2: "After every turn, the next player steals one tile blindly.",
        rulesLine3: "Reach 1 tile to gain immunity (no more steals).",
        yourTurn: "Your turn. Drag a tile to one of the chain ends.",
        noLegalPlay: "No legal play — you must pass.",
        isPlaying: "{name} is playing…",
        aiThinking: "{name} is thinking…",
        tapToSelect: "Tap a tile to select · drag to play",
        selectedHint: "Selected — drag to a chain end, or rotate below",
        rotate: "Rotate",
        rotateShortcut: "(R)",
        round: "Round",
        toWin: "to win",
        team: "Team",
        tiles: "tiles",
        tileSingular: "tile",
        playing: "playing",
        thinking: "thinking…",
        immune: "IMMUNE",
        play: "Play",
        pass: "Pass",
        points: "Points",
        pointsToTeam: "to team {team}",
        nextRound: "Next round",
        quitToMenu: "Quit to menu",
        matchOver: "Match over",
        teamWins: "Team {team} wins",
        zapato: "¡Zapato! Team {team} finished with 0 points.",
        playAgain: "Play again",
        outcomeDomino: "¡Dominó!",
        outcomeCapicua: "¡Capicúa!",
        outcomeChuchazo: "¡Chuchazo!",
        outcomeTranca: "Tranca",
        outcomeDescDomino: "Hand played out",
        outcomeDescCapicua: "Both ends matched",
        outcomeDescChuchazo: "Won with the double-six",
        outcomeDescTranca: "Chain locked",
        helpHeading: "How to play",
        helpStealMechanic:
            "After you play or pass, the next player blindly takes one of your dominoes. The server picks the tile at random.",
        helpImmunity: "When you're down to 1 domino you're safe — no one can steal it.",
        helpCapicua: "Capicúa: win by playing a tile that fits both open ends. +25 points.",
        helpChuchazo: "Chuchazo: win by laying down the 6-6 as your last tile. +25 points.",
        helpTranca: "Tranca: when no one can play, the team with the lower pip total wins the round.",
        helpZapato: "Zapato: if the losing team ends the match with 0 points, it's a sweep.",
        language: "Language",
        switchTo: "Cambiar a español",
    },
};

export function format(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_match, key: string) => vars[key] ?? `{${key}}`);
}
