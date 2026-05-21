import { glyphFor } from "./avatars.js";

export type PlayerAvatarProps = {
    avatarId: string | undefined | null;
    team?: "A" | "B" | null;
    size?: "sm" | "md" | "lg";
    tileCount?: number;
    active?: boolean;
    label?: string;
    immune?: boolean;
};

const SIZE: Record<NonNullable<PlayerAvatarProps["size"]>, { box: string; glyph: string }> = {
    sm: { box: "h-9 w-9", glyph: "text-xl" },
    md: { box: "h-12 w-12", glyph: "text-2xl" },
    lg: { box: "h-16 w-16", glyph: "text-3xl" },
};

// Circular player chip. Team color is the ring; the glyph (emoji) is the avatar. Tile-count
// badge sits in the bottom-right. Active turn → coquí-green pulse ring on top of the team
// color.
export function PlayerAvatar({
    avatarId,
    team,
    size = "md",
    tileCount,
    active = false,
    label,
    immune = false,
}: PlayerAvatarProps) {
    const sizing = SIZE[size];
    const teamRing =
        team === "A"
            ? "ring-pr-blue"
            : team === "B"
              ? "ring-pr-red"
              : "ring-pr-coal-soft";
    return (
        <div className="flex flex-col items-center gap-1">
            <div
                className={`relative flex ${sizing.box} items-center justify-center rounded-full bg-pr-coal-soft/80 ring-2 ${teamRing} ${active ? "shadow-[0_0_12px_3px_rgba(163,230,53,0.6)]" : ""}`}
            >
                <span className={sizing.glyph} aria-hidden>
                    {glyphFor(avatarId)}
                </span>
                {tileCount !== undefined && (
                    <span
                        className="absolute -bottom-1 -right-1 min-w-[20px] rounded-full bg-pr-coal px-1.5 py-0.5 text-center text-[10px] font-bold text-pr-ivory ring-1 ring-pr-coal-soft"
                        aria-label={`${tileCount} tiles`}
                    >
                        {tileCount}
                    </span>
                )}
                {immune && (
                    <span
                        className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-pr-coqui px-1.5 py-0.5 text-[9px] font-bold text-pr-coal"
                        aria-label="Immune"
                    >
                        ★
                    </span>
                )}
            </div>
            {label !== undefined && (
                <span className="max-w-[6rem] truncate text-center text-[10px] text-pr-ivory">
                    {label}
                </span>
            )}
        </div>
    );
}
