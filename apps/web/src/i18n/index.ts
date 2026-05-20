import { useGameStore } from "../state/gameStore.js";
import { STRINGS, format, type Lang, type StringKey } from "./strings.js";

export type { Lang, StringKey } from "./strings.js";
export { format } from "./strings.js";

// React hook: returns a translator function bound to the current language.
export function useT(): (key: StringKey, vars?: Record<string, string>) => string {
    const lang = useGameStore((s) => s.lang);
    return (key, vars) => {
        const raw = STRINGS[lang][key];
        return vars !== undefined ? format(raw, vars) : raw;
    };
}

// Outside-of-react helper: explicit lang arg.
export function tForLang(lang: Lang, key: StringKey, vars?: Record<string, string>): string {
    const raw = STRINGS[lang][key];
    return vars !== undefined ? format(raw, vars) : raw;
}
