import { useState } from "react";
import { useIdentityStore } from "../state/identityStore.js";
import { useGameStore } from "../state/gameStore.js";
import { glyphFor } from "./avatars.js";
import { ProfileEditor } from "./ProfileEditor.js";

// Small avatar+name chip. Always-visible entry to the profile editor (display name + avatar).
// Mount near a corner of the main menu so it's discoverable without being noisy.
export function ProfileChip() {
    const lang = useGameStore((s) => s.lang);
    const displayName = useIdentityStore((s) => s.displayName);
    const avatar = useIdentityStore((s) => s.avatar);
    const [open, setOpen] = useState(false);
    const label = displayName.length > 0 ? displayName : lang === "es" ? "Tu jugador" : "Your player";

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-full border border-pr-coal-soft bg-pr-coal-soft/40 px-3 py-1 text-pr-ivory transition-colors hover:bg-pr-coal-soft/70"
                aria-label={lang === "es" ? "Editar tu jugador" : "Edit your player"}
            >
                <span className="text-xl" aria-hidden>
                    {glyphFor(avatar)}
                </span>
                <span className="max-w-[8rem] truncate text-sm">{label}</span>
            </button>
            {open && <ProfileEditor onClose={() => setOpen(false)} />}
        </>
    );
}
