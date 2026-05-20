import type { Tile, Pip, Hand } from "./types.js";

// Tile constructor. Validates pip range and normalizes so the smaller pip is first.
export function tile(a: number, b: number): Tile {
    if (!Number.isInteger(a) || a < 0 || a > 6) {
        throw new Error("Invalid pip: " + String(a));
    }
    if (!Number.isInteger(b) || b < 0 || b > 6) {
        throw new Error("Invalid pip: " + String(b));
    }
    const low = (a <= b ? a : b) as Pip;
    const high = (a <= b ? b : a) as Pip;
    return [low, high] as readonly [Pip, Pip] as Tile;
}

// Strict pair equality between two tiles.
export function equals(t1: Tile, t2: Tile): boolean {
    return t1[0] === t2[0] && t1[1] === t2[1];
}

// Sum of the two pip values on a tile. Range 0..12.
export function pips(t: Tile): number {
    return t[0] + t[1];
}

// True when both ends of the tile match (e.g. [6,6]).
export function isDouble(t: Tile): boolean {
    return t[0] === t[1];
}

// Sum of pips across an entire hand.
export function handPips(hand: Hand): number {
    return hand.reduce((sum, t) => sum + pips(t), 0);
}

// Canonical double-six tile set, ordered [0,0], [0,1], ..., [0,6], [1,1], ..., [6,6].
export function allDoubleSixTiles(): Tile[] {
    const tiles: Tile[] = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            tiles.push([i as Pip, j as Pip] as readonly [Pip, Pip] as Tile);
        }
    }
    return tiles;
}

// Format a tile as "a|b".
export function tileToString(t: Tile): string {
    return t[0] + "|" + t[1];
}

// Parse "a|b" back into a Tile, normalizing through the tile() constructor.
export function tileFromString(s: string): Tile {
    const parts = s.split("|");
    if (parts.length !== 2) {
        throw new Error("Malformed tile: " + s);
    }
    const aStr = parts[0];
    const bStr = parts[1];
    if (aStr === undefined || bStr === undefined) {
        throw new Error("Malformed tile: " + s);
    }
    const a = Number(aStr);
    const b = Number(bStr);
    if (Number.isNaN(a) || Number.isNaN(b)) {
        throw new Error("Malformed tile: " + s);
    }
    return tile(a, b);
}

// True if any tile in the hand equals t.
export function containsTile(hand: Hand, t: Tile): boolean {
    return hand.some((h) => equals(h, t));
}

// Return a new hand with the first matching tile removed. Throws if missing.
export function removeTile(hand: Hand, t: Tile): Hand {
    const index = hand.findIndex((h) => equals(h, t));
    if (index === -1) {
        throw new Error("Tile not in hand: " + tileToString(t));
    }
    return [...hand.slice(0, index), ...hand.slice(index + 1)];
}
