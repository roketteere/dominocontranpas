import { useState } from "react";
import { useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useGameStore } from "../state/gameStore.js";
import { useIdentityStore } from "../state/identityStore.js";
import { AudioControlsBody } from "./AudioControls.js";
import { LanguagePickerBody } from "./LanguageMenu.js";
import { ProfileEditor } from "./ProfileEditor.js";
import { AdminPanel } from "./AdminPanel.js";
import { glyphFor } from "./avatars.js";

const IN_MATCH_SCREENS = new Set(["playing", "round_end"]);

// Single top-right gear menu. Replaces the old AudioControls, LanguageMenu, ProfileChip, and
// admin chip — everything lives under one ⚙️ now.
export function SettingsMenu() {
    const [open, setOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [adminOpen, setAdminOpen] = useState(false);

    const lang = useGameStore((s) => s.lang);
    const screen = useGameStore((s) => s.screen);
    const returnToMenu = useGameStore((s) => s.returnToMenu);
    const inMatch = IN_MATCH_SCREENS.has(screen);

    const deviceId = useIdentityStore((s) => s.deviceId);
    const avatar = useIdentityStore((s) => s.avatar);
    const displayName = useIdentityStore((s) => s.displayName);

    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const isOwner = me?.isOwner === true;

    const openProfile = () => {
        setProfileOpen(true);
        setOpen(false);
    };

    const openAdmin = () => {
        setAdminOpen(true);
        setOpen(false);
    };

    const quit = () => {
        returnToMenu();
        setOpen(false);
    };

    return (
        <div className="relative select-none">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={lang === "es" ? "Ajustes" : "Settings"}
                className="flex items-center justify-center rounded-full border border-pr-coal-soft/60 bg-pr-coal-soft/70 px-3 py-1 text-lg leading-none text-pr-ivory shadow hover:bg-pr-coal-soft"
            >
                ⚙️
            </button>
            {open && (
                <>
                    {/* Backdrop — taps outside the panel close it. */}
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => setOpen(false)}
                        aria-hidden
                    />
                    <div className="absolute right-0 z-40 mt-2 max-h-[80vh] w-72 space-y-4 overflow-y-auto rounded-2xl border border-pr-coal-soft/60 bg-pr-table-dark/95 p-4 text-sm text-pr-ivory shadow-xl">
                        <p className="font-display text-pr-coqui">
                            {lang === "es" ? "Ajustes" : "Settings"}
                        </p>

                        {/* Profile row */}
                        <button
                            type="button"
                            onClick={openProfile}
                            className="flex w-full items-center gap-3 rounded-xl border border-pr-coal-soft/40 bg-pr-coal-soft/30 px-3 py-2 text-left transition-colors hover:bg-pr-coal-soft/60"
                        >
                            <span className="text-2xl" aria-hidden>
                                {glyphFor(avatar)}
                            </span>
                            <div className="flex-1 overflow-hidden">
                                <div className="truncate text-sm text-pr-ivory">
                                    {displayName.length > 0
                                        ? displayName
                                        : lang === "es" ? "Tu jugador" : "Your player"}
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-pr-ivory-dim">
                                    {lang === "es" ? "Editar perfil" : "Edit profile"}
                                </div>
                            </div>
                            <span className="text-pr-ivory-dim">›</span>
                        </button>

                        {/* Audio */}
                        <div className="rounded-xl border border-pr-coal-soft/40 bg-pr-coal-soft/30 p-3">
                            <AudioControlsBody />
                        </div>

                        {/* Language */}
                        <div className="rounded-xl border border-pr-coal-soft/40 bg-pr-coal-soft/30 p-3">
                            <LanguagePickerBody />
                        </div>

                        {/* Admin (owner-only) */}
                        {isOwner && (
                            <button
                                type="button"
                                onClick={openAdmin}
                                className="flex w-full items-center gap-3 rounded-xl border border-pr-coqui/60 bg-pr-coqui/10 px-3 py-2 text-left transition-colors hover:bg-pr-coqui/20"
                            >
                                <span className="text-xl" aria-hidden>
                                    🔧
                                </span>
                                <div className="flex-1">
                                    <div className="text-sm text-pr-coqui">
                                        {lang === "es" ? "Panel de admin" : "Admin panel"}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-wider text-pr-ivory-dim">
                                        {lang === "es" ? "Ver todos los códigos" : "View all codes"}
                                    </div>
                                </div>
                                <span className="text-pr-ivory-dim">›</span>
                            </button>
                        )}

                        {/* Quit match (only when in match) */}
                        {inMatch && (
                            <button
                                type="button"
                                onClick={quit}
                                className="w-full rounded-xl border border-pr-red/60 bg-pr-red/20 py-2 text-sm text-pr-ivory transition-colors hover:bg-pr-red/40"
                            >
                                {lang === "es" ? "🚪 Abandonar partida" : "🚪 Quit match"}
                            </button>
                        )}

                        <div className="border-t border-pr-coal-soft/40 pt-2 text-[10px] text-pr-ivory-dim">
                            <p>Dominos Con Tranpas</p>
                            <p>By: Joel Pérez Santiago · TeKi</p>
                        </div>
                    </div>
                </>
            )}
            {profileOpen && <ProfileEditor onClose={() => setProfileOpen(false)} />}
            {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
        </div>
    );
}
