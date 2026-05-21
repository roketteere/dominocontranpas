import { useState } from "react";
import { useMutation } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { useGameStore } from "../../state/gameStore.js";
import { AVATARS, type AvatarId } from "../avatars.js";

// First-time setup: ask for a display name + avatar, register a user row keyed by deviceId.
export function UsernameSetup({ onDone }: { onDone: () => void }) {
    const lang = useGameStore((s) => s.lang);
    const deviceId = useIdentityStore((s) => s.deviceId);
    const setDisplayName = useIdentityStore((s) => s.setDisplayName);
    const storeAvatar = useIdentityStore((s) => s.avatar);
    const setAvatar = useIdentityStore((s) => s.setAvatar);
    const createOrGetUser = useMutation(api.users.createOrGetUser);
    const [name, setName] = useState("");
    const [avatar, setLocalAvatar] = useState<AvatarId>(storeAvatar);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        const trimmed = name.trim();
        if (trimmed.length < 1 || trimmed.length > 24) return;
        setSubmitting(true);
        setError(null);
        // Try with the new avatar arg first; if the backend hasn't been pushed yet and rejects
        // unknown args, retry without it so registration still works.
        try {
            await createOrGetUser({ deviceId, displayName: trimmed, avatar });
            setDisplayName(trimmed);
            setAvatar(avatar);
            onDone();
            return;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("avatar") || msg.toLowerCase().includes("argument")) {
                // Backend hasn't been pushed with the new schema yet — retry without avatar.
                try {
                    await createOrGetUser({ deviceId, displayName: trimmed } as { deviceId: string; displayName: string });
                    setDisplayName(trimmed);
                    setAvatar(avatar);
                    onDone();
                    return;
                } catch (e2) {
                    setError(e2 instanceof Error ? e2.message : String(e2));
                }
            } else {
                setError(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <h2 className="font-display text-3xl text-pr-ivory">
                {lang === "es" ? "Tu jugador" : "Your player"}
            </h2>

            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") void submit();
                }}
                maxLength={24}
                placeholder={lang === "es" ? "Tu nombre" : "Your name"}
                autoFocus
                className="w-64 rounded-xl border border-pr-coal-soft bg-pr-coal-soft/40 px-4 py-2 text-center font-display text-xl text-pr-ivory placeholder:text-pr-ivory-dim/50 focus:border-pr-coqui focus:outline-none"
            />

            <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-pr-ivory-dim">
                    {lang === "es" ? "Elige tu ícono" : "Pick your icon"}
                </p>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-6">
                    {AVATARS.map((a) => (
                        <button
                            key={a.id}
                            type="button"
                            onClick={() => setLocalAvatar(a.id)}
                            aria-label={a.label}
                            className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-transform ${avatar === a.id ? "scale-110 bg-pr-coqui/30 ring-2 ring-pr-coqui" : "bg-pr-coal-soft/40 ring-1 ring-pr-coal-soft hover:bg-pr-coal-soft/60"}`}
                        >
                            <span aria-hidden>{a.glyph}</span>
                        </button>
                    ))}
                </div>
            </div>

            {error !== null && (
                <p className="max-w-xs rounded-lg bg-pr-red/30 px-3 py-2 text-xs text-pr-ivory">
                    {error}
                </p>
            )}
            <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting || name.trim().length < 1}
                className="rounded-xl bg-pr-blue px-8 py-2 font-display text-pr-white shadow disabled:opacity-40"
            >
                {submitting ? "..." : lang === "es" ? "Continuar" : "Continue"}
            </button>
        </div>
    );
}
