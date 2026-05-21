// Preset avatar emojis with a PR-flavored set. Each entry has an ID we store on the user/seat
// row (a short slug) and a glyph to render. Future tweaks: replace with real SVGs or photos
// without breaking stored IDs.

export type AvatarId =
    | "coqui"
    | "palm"
    | "wave"
    | "sun"
    | "chili"
    | "drum"
    | "trumpet"
    | "parrot"
    | "star"
    | "flag"
    | "coffee"
    | "hibiscus"
    | "mic"
    | "boombox"
    | "shades"
    | "chain"
    | "dancer"
    | "maracas"
    | "sax"
    | "notes"
    | "pavaHat"
    | "rooster"
    | "cuatro"
    | "mountain"
    | "plantain"
    | "pinaColada"
    | "vejigante"
    | "elMorro";

export const AVATARS: { id: AvatarId; glyph: string; label: string }[] = [
    { id: "coqui", glyph: "🐸", label: "Coquí" },
    { id: "palm", glyph: "🌴", label: "Palma" },
    { id: "wave", glyph: "🌊", label: "Ola" },
    { id: "sun", glyph: "🌞", label: "Sol" },
    { id: "chili", glyph: "🌶️", label: "Ají" },
    { id: "drum", glyph: "🥁", label: "Tambor" },
    { id: "trumpet", glyph: "🎺", label: "Trompeta" },
    { id: "parrot", glyph: "🦜", label: "Cotorra" },
    { id: "star", glyph: "⭐", label: "Estrella" },
    { id: "flag", glyph: "🇵🇷", label: "Bandera" },
    { id: "coffee", glyph: "☕", label: "Café" },
    { id: "hibiscus", glyph: "🌺", label: "Flor de maga" },
    { id: "mic", glyph: "🎤", label: "Micrófono" },
    { id: "boombox", glyph: "📻", label: "Boombox" },
    { id: "shades", glyph: "😎", label: "Gafas" },
    { id: "chain", glyph: "⛓️", label: "Cadena" },
    { id: "dancer", glyph: "💃", label: "Bailadora" },
    { id: "maracas", glyph: "🪇", label: "Maracas" },
    { id: "sax", glyph: "🎷", label: "Saxofón" },
    { id: "notes", glyph: "🎶", label: "Notas" },
    { id: "pavaHat", glyph: "👒", label: "Pava" },
    { id: "rooster", glyph: "🐓", label: "Gallo" },
    { id: "cuatro", glyph: "🎸", label: "Cuatro" },
    { id: "mountain", glyph: "⛰️", label: "Cordillera" },
    { id: "plantain", glyph: "🍌", label: "Plátano" },
    { id: "pinaColada", glyph: "🍹", label: "Piña Colada" },
    { id: "vejigante", glyph: "🎭", label: "Vejigante" },
    { id: "elMorro", glyph: "🏰", label: "El Morro" },
];

export function glyphFor(id: string | undefined | null): string {
    if (id === undefined || id === null) return "🐸";
    const found = AVATARS.find((a) => a.id === id);
    return found?.glyph ?? "🐸";
}

// Default avatar for a brand-new user: pick deterministically from the deviceId so the user
// gets a stable default before they pick.
export function defaultAvatarId(deviceId: string): AvatarId {
    let hash = 0;
    for (let i = 0; i < deviceId.length; i++) {
        hash = (hash * 31 + deviceId.charCodeAt(i)) >>> 0;
    }
    return AVATARS[hash % AVATARS.length]!.id;
}
