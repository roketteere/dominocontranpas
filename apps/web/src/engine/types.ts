/**
 * Pure types, no imports, server-authoritative game state model.
 */

// Represents a pip value on a domino tile.
export type Pip = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Represents a domino tile as a readonly tuple of two pips, normalized such that the first pip is less than or equal to the second.
export type Tile = readonly [Pip, Pip] & { __normalized: never };

// Represents a player ID as a branded string.
export type PlayerId = string & { readonly __brand: 'PlayerId' };

// Represents a team ID.
export type TeamId = 'A' | 'B';

// Represents a seat position on the table.
export type SeatPosition = 0 | 1 | 2 | 3; // In 2p mode, only positions 0 and 1 are used.

// Represents the game mode.
export type GameMode = '4p-partners' | '2p' | 'solo-vs-ai';

// Represents a player seat with their ID, position, team, AI status, and display name.
export type PlayerSeat = {
    readonly playerId: PlayerId;
    readonly position: SeatPosition;
    readonly team: TeamId;
    readonly isAI: boolean;
    readonly displayName: string;
};

// Represents a player's hand of tiles.
export type Hand = readonly Tile[];

// Represents which side of the chain a tile is being added to.
export type Side = 'left' | 'right';

// Represents a played tile on the chain.
export type PlacedTile = {
    readonly tile: Tile;
    readonly leftPip: Pip; // The pip facing the chain's left end after placement.
    readonly rightPip: Pip;
    readonly playedBy: PlayerId;
    readonly turnNumber: number;
};

// Represents the current state of the chain.
export type Chain = {
    readonly tiles: readonly PlacedTile[];
    readonly leftEnd: Pip | null; // Null only when the chain is empty.
    readonly rightEnd: Pip | null;
};

// Represents a play move by a player.
export type PlayMove = {
    readonly kind: 'play';
    readonly playerId: PlayerId;
    readonly tile: Tile;
    readonly side: Side;
};

// Represents a pass move by a player.
export type PassMove = {
    readonly kind: 'pass';
    readonly playerId: PlayerId;
};

// Represents a move, which can be either a play or a pass.
export type Move = PlayMove | PassMove;

// Represents an event where a tile is stolen from one player to another.
export type StealEvent = {
    readonly kind: 'steal';
    readonly fromPlayerId: PlayerId;
    readonly toPlayerId: PlayerId;
    readonly stolenTile: Tile;
    readonly turnNumber: number;
};

// Represents the reason why a steal was skipped.
export type StealSkippedReason = 'immunity' | 'first-move-of-round' | 'source-won-round';

// Represents an event where a steal is skipped.
export type StealSkipped = {
    readonly kind: 'steal-skipped';
    readonly fromPlayerId: PlayerId;
    readonly toPlayerId: PlayerId;
    readonly reason: StealSkippedReason;
    readonly turnNumber: number;
};

// Represents an entry in the game history, which can be a move or a steal event.
export type HistoryEntry = Move | StealEvent | StealSkipped;

// Represents the current phase of the game.
export type GamePhase = 'lobby' | 'in_round' | 'round_end' | 'match_end';

// Represents the kind of outcome for a round.
export type RoundOutcomeKind = 'domino' | 'capicua' | 'chuchazo' | 'tranca';

// Represents the outcome of a round, including the winning team, points, and remaining pips by player.
export type RoundOutcome = {
    readonly kind: RoundOutcomeKind;
    readonly winningTeam: TeamId;
    readonly points: number;
    readonly remainingPipsByPlayer: Readonly<Record<string, number>>;
};

// Represents the scores for each team.
export type Scores = Readonly<Record<TeamId, number>>;

// Represents game options that can be configured by the player.
export type GameOptions = {
    readonly targetScore: 100 | 150 | 200;
    readonly capicuaBonus: number;
    readonly chuchazoBonus: number;
    readonly mode: GameMode;
};

// Represents the current state of the game.
export type GameState = {
    readonly phase: GamePhase;
    readonly seats: readonly PlayerSeat[];
    readonly hands: Readonly<Record<string, Hand>>;
    readonly chain: Chain;
    readonly turnIndex: number;
    readonly turnNumber: number;
    readonly scores: Scores;
    readonly round: number;
    readonly options: GameOptions;
    readonly history: readonly HistoryEntry[];
    readonly lastActorPlayerId: PlayerId | null;
    readonly lastOutcome: RoundOutcome | null;
};

// Represents a random number generator function.
export type Rng = () => number; // Returns a float in [0, 1); injected, never Math.random directly.
