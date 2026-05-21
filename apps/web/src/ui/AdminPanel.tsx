import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useIdentityStore } from "../state/identityStore.js";
import { useGameStore } from "../state/gameStore.js";

// Owner-only modal listing every user's recovery code. Used so Joel can help friends/family
// recover their identity if they lose their code. The server query (api.users.adminListUsers)
// returns [] for any caller that doesn't have isOwner=true on their user row.
export function AdminPanel({ onClose }: { onClose: () => void }) {
    const lang = useGameStore((s) => s.lang);
    const deviceId = useIdentityStore((s) => s.deviceId);
    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const users = useQuery(
        api.users.adminListUsers,
        me?._id ? { requestingUserId: me._id } : "skip",
    );
    const [filter, setFilter] = useState("");

    const filtered = useMemo(() => {
        if (users === undefined || users === null) return [];
        const needle = filter.trim().toLowerCase();
        if (needle.length === 0) return users;
        return users.filter(
            (u: { displayName: string; friendCode: string | null; recoveryCode: string | null }) =>
                u.displayName.toLowerCase().includes(needle) ||
                (u.friendCode ?? "").toLowerCase().includes(needle) ||
                (u.recoveryCode ?? "").toLowerCase().includes(needle),
        );
    }, [users, filter]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-pr-coal/80 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-pr-coal-soft bg-pr-coal p-5 shadow-2xl"
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

                <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={lang === "es" ? "Buscar por nombre o código…" : "Filter by name or code…"}
                    className="mb-3 w-full rounded-xl border border-pr-coal-soft bg-pr-coal-soft/40 px-3 py-2 text-sm text-pr-ivory placeholder:text-pr-ivory-dim/50 focus:border-pr-coqui focus:outline-none"
                />

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm text-pr-ivory">
                        <thead>
                            <tr className="border-b border-pr-coal-soft text-[11px] uppercase tracking-wider text-pr-ivory-dim">
                                <th className="py-2 text-left">{lang === "es" ? "Nombre" : "Name"}</th>
                                <th className="py-2 text-left">Friend</th>
                                <th className="py-2 text-left">Recovery</th>
                                <th className="py-2 text-right">{lang === "es" ? "Creado" : "Created"}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(
                                (u: {
                                    userId: string;
                                    displayName: string;
                                    friendCode: string | null;
                                    recoveryCode: string | null;
                                    createdAt: number;
                                }) => (
                                    <tr key={u.userId} className="border-b border-pr-coal-soft/40">
                                        <td className="py-1.5 pr-3">{u.displayName || "—"}</td>
                                        <td className="py-1.5 pr-3 font-mono text-xs text-pr-ivory-dim">
                                            {u.friendCode ?? "—"}
                                        </td>
                                        <td className="py-1.5 pr-3 font-mono text-xs text-pr-coqui">
                                            {u.recoveryCode ?? "—"}
                                        </td>
                                        <td className="py-1.5 text-right text-[11px] text-pr-ivory-dim">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ),
                            )}
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
                </p>
            </div>
        </div>
    );
}
