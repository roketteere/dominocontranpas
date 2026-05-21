import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useIdentityStore } from "../state/identityStore.js";
import { useGameStore } from "../state/gameStore.js";
import { AVATARS, type AvatarId } from "./avatars.js";

// Modal editor for display name + avatar. Reused by ProfileChip in MainMenu and (optionally)
// any lobby "edit my seat" entry point. Writes through to identityStore (local cache) and the
// Convex users row via createOrGetUser (which upserts on deviceId).
export function ProfileEditor({ onClose }: { onClose: () => void }) {
    const lang = useGameStore((s) => s.lang);
    const deviceId = useIdentityStore((s) => s.deviceId);
    const currentName = useIdentityStore((s) => s.displayName);
    const currentAvatar = useIdentityStore((s) => s.avatar);
    const setDisplayName = useIdentityStore((s) => s.setDisplayName);
    const setAvatar = useIdentityStore((s) => s.setAvatar);
    const createOrGetUser = useMutation(api.users.createOrGetUser);
    const claimByRecoveryCode = useMutation(api.users.claimByRecoveryCode);
    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const myRecoveryCode = useQuery(
        api.users.getMyRecoveryCode,
        me?._id ? { userId: me._id } : "skip",
    );

    const [name, setName] = useState(currentName);
    const [pickedAvatar, setPickedAvatar] = useState<AvatarId>(currentAvatar);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [claimInput, setClaimInput] = useState("");
    const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "ok" | "bad">("idle");
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        if (myRecoveryCode === undefined || myRecoveryCode === null) return;
        try {
            await navigator.clipboard.writeText(myRecoveryCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // best-effort
        }
    };

    const onClaim = async () => {
        const code = claimInput.trim().toUpperCase();
        if (code.length !== 8) return;
        setClaimStatus("claiming");
        try {
            const claimedId = await claimByRecoveryCode({ recoveryCode: code, deviceId });
            if (claimedId === null) {
                setClaimStatus("bad");
                return;
            }
            setClaimStatus("ok");
            // The subscription will refetch with the new identity; close shortly so user sees
            // the updated chip on next render.
            setTimeout(() => onClose(), 600);
        } catch {
            setClaimStatus("bad");
        }
    };

    const submit = async () => {
        const trimmed = name.trim();
        if (trimmed.length < 1 || trimmed.length > 24) return;
        setSaving(true);
        setError(null);
        try {
            await createOrGetUser({ deviceId, displayName: trimmed, avatar: pickedAvatar });
            setDisplayName(trimmed);
            setAvatar(pickedAvatar);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-pr-coal/80 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-pr-coal-soft bg-pr-coal p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-xl text-pr-ivory">
                        {lang === "es" ? "Tu jugador" : "Your player"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={lang === "es" ? "Cerrar" : "Close"}
                        className="text-pr-ivory-dim hover:text-pr-ivory"
                    >
                        ✕
                    </button>
                </div>

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
                    className="mb-4 w-full rounded-xl border border-pr-coal-soft bg-pr-coal-soft/40 px-4 py-2 text-center font-display text-xl text-pr-ivory placeholder:text-pr-ivory-dim/50 focus:border-pr-coqui focus:outline-none"
                />

                <p className="mb-2 text-[11px] uppercase tracking-wider text-pr-ivory-dim">
                    {lang === "es" ? "Elige tu ícono" : "Pick your icon"}
                </p>
                <div className="mb-4 grid max-h-[40vh] grid-cols-6 gap-2 overflow-y-auto pr-1">
                    {AVATARS.map((a) => (
                        <button
                            key={a.id}
                            type="button"
                            onClick={() => setPickedAvatar(a.id)}
                            aria-label={a.label}
                            title={a.label}
                            className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-transform ${pickedAvatar === a.id ? "scale-110 bg-pr-coqui/30 ring-2 ring-pr-coqui" : "bg-pr-coal-soft/40 ring-1 ring-pr-coal-soft hover:bg-pr-coal-soft/60"}`}
                        >
                            <span aria-hidden>{a.glyph}</span>
                        </button>
                    ))}
                </div>

                {/* Recovery code section — shows the user's own code + a claim input. */}
                <div className="mb-4 space-y-3 rounded-xl border border-pr-coal-soft bg-pr-coal-soft/30 p-3">
                    <div>
                        <p className="mb-1 text-[11px] uppercase tracking-wider text-pr-ivory-dim">
                            {lang === "es" ? "Tu código de recuperación" : "Your recovery code"}
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 select-all rounded-lg bg-pr-coal px-3 py-1.5 font-mono text-lg tracking-widest text-pr-coqui">
                                {myRecoveryCode ?? "········"}
                            </code>
                            <button
                                type="button"
                                onClick={() => void onCopy()}
                                disabled={!myRecoveryCode}
                                className="rounded-lg border border-pr-coal-soft px-3 py-1 text-xs text-pr-ivory-dim hover:text-pr-ivory disabled:opacity-40"
                            >
                                {copied
                                    ? lang === "es" ? "Copiado" : "Copied"
                                    : lang === "es" ? "Copiar" : "Copy"}
                            </button>
                        </div>
                        <p className="mt-1 text-[10px] text-pr-ivory-dim">
                            {lang === "es"
                                ? "Guárdalo. Te deja recuperar tu cuenta en otro dispositivo."
                                : "Save it. Lets you recover this account on another device."}
                        </p>
                    </div>

                    <div>
                        <p className="mb-1 text-[11px] uppercase tracking-wider text-pr-ivory-dim">
                            {lang === "es" ? "¿Tienes otro código?" : "Use someone else's code"}
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={claimInput}
                                onChange={(e) => setClaimInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") void onClaim();
                                }}
                                maxLength={8}
                                placeholder="XXXXXXXX"
                                className="flex-1 rounded-lg border border-pr-coal-soft bg-pr-coal-soft/40 px-3 py-1.5 font-mono text-lg tracking-widest text-pr-ivory placeholder:text-pr-ivory-dim/40 focus:border-pr-coqui focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => void onClaim()}
                                disabled={claimInput.trim().length !== 8 || claimStatus === "claiming"}
                                className="rounded-lg bg-pr-coqui px-3 py-1.5 text-xs font-bold text-pr-coal disabled:bg-pr-coal-soft disabled:text-pr-ivory-dim"
                            >
                                {claimStatus === "claiming"
                                    ? "..."
                                    : lang === "es" ? "Reclamar" : "Claim"}
                            </button>
                        </div>
                        {claimStatus === "bad" && (
                            <p className="mt-1 text-[11px] text-pr-red">
                                {lang === "es" ? "Código inválido" : "Invalid code"}
                            </p>
                        )}
                        {claimStatus === "ok" && (
                            <p className="mt-1 text-[11px] text-pr-coqui">
                                {lang === "es" ? "¡Reclamado!" : "Claimed!"}
                            </p>
                        )}
                    </div>
                </div>

                {error !== null && (
                    <p className="mb-3 rounded-lg bg-pr-red/30 px-3 py-2 text-xs text-pr-ivory">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-pr-coal-soft px-4 py-2 text-sm text-pr-ivory-dim hover:text-pr-ivory"
                    >
                        {lang === "es" ? "Cancelar" : "Cancel"}
                    </button>
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={saving || name.trim().length < 1}
                        className="rounded-xl bg-pr-blue px-6 py-2 font-display text-sm text-pr-white shadow disabled:opacity-40"
                    >
                        {saving ? "..." : lang === "es" ? "Guardar" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
