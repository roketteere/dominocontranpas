import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useIdentityStore } from "../state/identityStore.js";
import { useGameStore } from "../state/gameStore.js";

// Owner-only modal listing every user's recovery code. The server query
// (api.users.adminListUsers) returns [] for any caller that doesn't have isOwner=true on their
// user row, so the gate is server-side. The UI adds a Quick-Actions dropdown mirroring the
// admin-cli commands (list / find / whoami / set-owner) with friendly aliases.
type UserRow = {
    userId: string;
    displayName: string;
    friendCode: string | null;
    recoveryCode: string | null;
    isOwner: boolean;
    createdAt: number;
};

type Action =
    | "refresh"          // re-fetch (alias for CLI `list`)
    | "find-me"          // filter to caller's row (alias for `whoami`)
    | "show-all"         // clear the filter
    | "show-owners"      // filter to only owners
    | "promote";         // open the promote-to-owner form (alias for `set-owner`)

export function AdminPanel({ onClose }: { onClose: () => void }) {
    const lang = useGameStore((s) => s.lang);
    const deviceId = useIdentityStore((s) => s.deviceId);
    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const users = useQuery(
        api.users.adminListUsers,
        me?._id ? { requestingUserId: me._id } : "skip",
    );
    const claimOwnership = useMutation(api.users.claimOwnership);

    const [filter, setFilter] = useState("");
    const [showOwnersOnly, setShowOwnersOnly] = useState(false);
    const [promoteOpen, setPromoteOpen] = useState(false);
    const [promoteUserId, setPromoteUserId] = useState("");
    const [promoteSecret, setPromoteSecret] = useState("");
    const [promoteStatus, setPromoteStatus] = useState<"idle" | "saving" | "ok" | "bad">("idle");
    const [copiedRow, setCopiedRow] = useState<string | null>(null);

    const actionLabel = (a: Action): string => {
        if (a === "refresh") return lang === "es" ? "🔄 Recargar lista" : "🔄 Refresh list";
        if (a === "find-me") return lang === "es" ? "👤 Encontrarme" : "👤 Find me";
        if (a === "show-all") return lang === "es" ? "📋 Mostrar todos" : "📋 Show everyone";
        if (a === "show-owners") return lang === "es" ? "👑 Solo admins" : "👑 Owners only";
        return lang === "es" ? "🆙 Ascender a admin…" : "🆙 Promote to owner…";
    };

    const runAction = (a: Action) => {
        if (a === "refresh") {
            // Convex queries are reactive; touching filter forces a recompute and the visible
            // state will reflect any server-side changes since the modal opened.
            setFilter((f) => f + "");
            return;
        }
        if (a === "show-all") {
            setFilter("");
            setShowOwnersOnly(false);
            return;
        }
        if (a === "find-me") {
            setShowOwnersOnly(false);
            setFilter(me?.displayName ?? "");
            return;
        }
        if (a === "show-owners") {
            setShowOwnersOnly(true);
            setFilter("");
            return;
        }
        if (a === "promote") {
            setPromoteOpen(true);
            return;
        }
    };

    const filtered: UserRow[] = useMemo(() => {
        if (users === undefined || users === null) return [];
        let list = users as UserRow[];
        if (showOwnersOnly) list = list.filter((u) => u.isOwner);
        const needle = filter.trim().toLowerCase();
        if (needle.length > 0) {
            list = list.filter(
                (u) =>
                    u.displayName.toLowerCase().includes(needle) ||
                    (u.friendCode ?? "").toLowerCase().includes(needle) ||
                    (u.recoveryCode ?? "").toLowerCase().includes(needle),
            );
        }
        return list;
    }, [users, filter, showOwnersOnly]);

    const onCopyCode = async (userId: string, code: string | null) => {
        if (code === null) return;
        try {
            await navigator.clipboard.writeText(code);
            setCopiedRow(userId);
            setTimeout(() => setCopiedRow((c) => (c === userId ? null : c)), 1200);
        } catch {
            // best-effort
        }
    };

    const onPromote = async () => {
        if (promoteUserId.trim().length === 0 || promoteSecret.trim().length === 0) return;
        setPromoteStatus("saving");
        try {
            await claimOwnership({
                secret: promoteSecret,
                userId: promoteUserId.trim() as never,
            });
            setPromoteStatus("ok");
            setTimeout(() => {
                setPromoteOpen(false);
                setPromoteStatus("idle");
                setPromoteUserId("");
                setPromoteSecret("");
            }, 800);
        } catch {
            setPromoteStatus("bad");
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-pr-coal/80 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-pr-coal-soft bg-pr-coal p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-xl text-pr-ivory">
                        🔧 {lang === "es" ? "Panel de administrador" : "Admin panel"}
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

                {/* Quick-actions dropdown — friendly aliases for the admin-cli commands. */}
                <div className="mb-3 flex items-center gap-2">
                    <label
                        htmlFor="admin-action"
                        className="text-[11px] uppercase tracking-wider text-pr-ivory-dim"
                    >
                        {lang === "es" ? "Acción" : "Action"}
                    </label>
                    <select
                        id="admin-action"
                        value=""
                        onChange={(e) => {
                            const a = e.target.value as Action | "";
                            if (a !== "") runAction(a);
                            e.target.value = "";
                        }}
                        className="flex-1 rounded-lg border border-pr-coal-soft bg-pr-coal-soft/40 px-3 py-2 text-sm text-pr-ivory focus:border-pr-coqui focus:outline-none"
                    >
                        <option value="" disabled>
                            {lang === "es" ? "Elige una acción…" : "Pick an action…"}
                        </option>
                        <option value="refresh">{actionLabel("refresh")}</option>
                        <option value="find-me">{actionLabel("find-me")}</option>
                        <option value="show-all">{actionLabel("show-all")}</option>
                        <option value="show-owners">{actionLabel("show-owners")}</option>
                        <option value="promote">{actionLabel("promote")}</option>
                    </select>
                </div>

                <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={lang === "es" ? "Buscar por nombre o código…" : "Filter by name or code…"}
                    className="mb-3 w-full rounded-xl border border-pr-coal-soft bg-pr-coal-soft/40 px-3 py-2 text-sm text-pr-ivory placeholder:text-pr-ivory-dim/50 focus:border-pr-coqui focus:outline-none"
                />

                {/* Promote-to-owner inline form (toggled by the dropdown). */}
                {promoteOpen && (
                    <div className="mb-3 space-y-2 rounded-xl border border-pr-coqui/60 bg-pr-coqui/10 p-3">
                        <p className="text-[11px] uppercase tracking-wider text-pr-coqui">
                            {lang === "es" ? "Ascender a admin" : "Promote to owner"}
                        </p>
                        <input
                            type="text"
                            value={promoteUserId}
                            onChange={(e) => setPromoteUserId(e.target.value)}
                            placeholder={lang === "es" ? "userId" : "userId"}
                            className="w-full rounded-lg border border-pr-coal-soft bg-pr-coal-soft/40 px-3 py-1.5 font-mono text-xs text-pr-ivory placeholder:text-pr-ivory-dim/40 focus:border-pr-coqui focus:outline-none"
                        />
                        <input
                            type="password"
                            value={promoteSecret}
                            onChange={(e) => setPromoteSecret(e.target.value)}
                            placeholder={lang === "es" ? "OWNER_SECRET" : "OWNER_SECRET"}
                            className="w-full rounded-lg border border-pr-coal-soft bg-pr-coal-soft/40 px-3 py-1.5 text-xs text-pr-ivory placeholder:text-pr-ivory-dim/40 focus:border-pr-coqui focus:outline-none"
                        />
                        <div className="flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setPromoteOpen(false);
                                    setPromoteStatus("idle");
                                }}
                                className="rounded-lg border border-pr-coal-soft px-3 py-1 text-xs text-pr-ivory-dim hover:text-pr-ivory"
                            >
                                {lang === "es" ? "Cancelar" : "Cancel"}
                            </button>
                            <button
                                type="button"
                                onClick={() => void onPromote()}
                                disabled={
                                    promoteUserId.trim().length === 0 ||
                                    promoteSecret.trim().length === 0 ||
                                    promoteStatus === "saving"
                                }
                                className="rounded-lg bg-pr-coqui px-4 py-1 text-xs font-bold text-pr-coal disabled:bg-pr-coal-soft disabled:text-pr-ivory-dim"
                            >
                                {promoteStatus === "saving"
                                    ? "…"
                                    : lang === "es" ? "Ascender" : "Promote"}
                            </button>
                        </div>
                        {promoteStatus === "bad" && (
                            <p className="text-[11px] text-pr-red">
                                {lang === "es"
                                    ? "Falló — revisa userId y secret"
                                    : "Failed — check userId and secret"}
                            </p>
                        )}
                        {promoteStatus === "ok" && (
                            <p className="text-[11px] text-pr-coqui">
                                {lang === "es" ? "¡Listo!" : "Done!"}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm text-pr-ivory">
                        <thead>
                            <tr className="border-b border-pr-coal-soft text-[11px] uppercase tracking-wider text-pr-ivory-dim">
                                <th className="py-2 text-left">{lang === "es" ? "Nombre" : "Name"}</th>
                                <th className="py-2 text-left">Friend</th>
                                <th className="py-2 text-left">Recovery</th>
                                <th className="py-2 text-center">{lang === "es" ? "Admin" : "Owner"}</th>
                                <th className="py-2 text-right">{lang === "es" ? "Acción" : "Action"}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => {
                                const isMe = me?._id === u.userId;
                                return (
                                    <tr
                                        key={u.userId}
                                        className={`border-b border-pr-coal-soft/40 ${isMe ? "bg-pr-coqui/10" : ""}`}
                                    >
                                        <td className="py-1.5 pr-3">
                                            {u.displayName || "—"}
                                            {isMe && (
                                                <span className="ml-2 text-[10px] uppercase tracking-wider text-pr-coqui">
                                                    {lang === "es" ? "tú" : "you"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-1.5 pr-3 font-mono text-xs text-pr-ivory-dim">
                                            {u.friendCode ?? "—"}
                                        </td>
                                        <td className="py-1.5 pr-3 font-mono text-xs text-pr-coqui">
                                            {u.recoveryCode ?? "—"}
                                        </td>
                                        <td className="py-1.5 text-center">
                                            {u.isOwner ? "👑" : ""}
                                        </td>
                                        <td className="py-1.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() => void onCopyCode(u.userId, u.recoveryCode)}
                                                disabled={u.recoveryCode === null}
                                                className="rounded border border-pr-coal-soft px-2 py-0.5 text-[10px] text-pr-ivory-dim hover:text-pr-ivory disabled:opacity-40"
                                            >
                                                {copiedRow === u.userId
                                                    ? lang === "es" ? "✓" : "✓"
                                                    : lang === "es" ? "Copiar" : "Copy"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {users !== undefined && users !== null && users.length === 0 && (
                        <p className="py-6 text-center text-sm text-pr-ivory-dim">
                            {lang === "es" ? "No hay usuarios" : "No users yet"}
                        </p>
                    )}
                </div>

                <p className="mt-3 text-[10px] text-pr-ivory-dim">
                    {filtered.length}{" "}
                    {filtered.length === 1
                        ? lang === "es" ? "usuario" : "user"
                        : lang === "es" ? "usuarios" : "users"}
                    {showOwnersOnly && (
                        <span className="ml-2 text-pr-coqui">
                            · {lang === "es" ? "solo admins" : "owners only"}
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
}
