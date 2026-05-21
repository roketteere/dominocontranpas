# Expectations.md — Defaults qwen must satisfy in every dispatch

Read this FIRST in every Opus brief. Self-check against every box
before returning output. If any box fails, fix and re-emit — do not
return partial work. If a box is genuinely unknowable for this task,
add `N/A: <reason>` next to it.

These rules apply to **every** dispatch in this repo. The Opus brief
adds task-specific rules on top; it never overrides what's here unless
it says so explicitly.

## Output format

- [ ] Output is the COMPLETE file contents requested, top to bottom.
      Never a diff. Never just the modified hunk.
- [ ] No markdown fences (no ` ```tsx `, no ` ```ts `, no closing
      ` ``` `).
- [ ] No preamble ("Here's the file:"). No trailing commentary
      ("Hope this helps!").
- [ ] Indentation matches the source file. **This project uses 4
      spaces, never tabs.**
- [ ] UTF-8 encoding. Line endings match the source file's existing
      convention (Windows-cloned files are typically CRLF here; LF is
      acceptable when the source is LF).

## TypeScript — strict + exactOptionalPropertyTypes

- [ ] No implicit `any`. No `as any`. No `as unknown as <T>`. Prefer
      `unknown` plus a real type guard.
- [ ] Do NOT annotate the callbacks of `useQuery` results with
      hand-written object types. The query already carries a precise
      generated type; let TS infer. Inline annotations clash with
      branded `Id<T>` types and with `exactOptionalPropertyTypes:
      true`.
- [ ] Branded Convex `Id<"table">` types cannot be widened to plain
      `string` in a parameter or annotation. If you need to pass an
      `Id` where the brand is unknown to you, **ask Opus** — do not
      reach for `as never` or `as Id<"users">` blindly.
- [ ] Top-level imports: preserve exactly as in the source file unless
      the brief instructs an explicit add or remove. Adding an import
      qwen "thinks is needed" is a frequent source of typecheck breaks.

## React — Rules of Hooks (non-negotiable)

- [ ] EVERY hook call (`useState`, `useEffect`, `useMemo`, `useRef`,
      `useMutation`, `useQuery`, any custom `use*`) must appear at the
      TOP of the component body, BEFORE any `if`, early `return`,
      ternary, or loop. **This is what tripped up the first qwen
      dispatch; do not repeat it.**
- [ ] The order of hook calls must be identical on every render.
      Never put a hook inside an `if`/`switch`/`try`.
- [ ] `key` props on `.map()` are stable IDs from the data (e.g.
      `f.friendshipId`, `seat.position`). Never use the array index
      when the items could reorder.

## Convex

- [ ] `useQuery(api.path.fn, args | "skip")` — the skip sentinel is
      the literal lowercase string `"skip"`, with the quotes.
- [ ] Mutation argument names follow the convention used in this
      repo: `gameId`, `fromUserId`, `toUserId`, `userId`,
      `callerUserId`, `inviteId`. Do not invent variants like
      `targetUserId` or `senderUserId`.
- [ ] `api.path.fn` — use the dotted path imported from
      `@convex/_generated/api.js`. Never construct strings.
- [ ] Mutations from `useMutation` are called with a single object
      arg: `void sendInvite({ gameId, fromUserId, toUserId })`.
- [ ] `console.*` in Convex handlers IS supported at runtime (output
      lands in the Convex dashboard logs), but the convex tsconfig has
      `lib: ["ES2022"]` only — no DOM, no Node — so `console` is not in
      scope at compile time. The ambient lives at
      `apps/convex/convex/globals.d.ts`. If you reference `console` in a
      new convex handler and tsc complains, the ambient is missing or
      excluded — fix the ambient, do NOT widen the tsconfig lib to
      `DOM`. Reason: BUG-001 dispatch tripped this; the brief asserted
      "console is a global" without checking the lib.

## Project style — Tailwind, bilingual, PR color tokens

- [ ] Tailwind utility classes ONLY. No CSS modules, no styled-jsx, no
      external CSS files. No inline `style={}` objects except when the
      value is dynamic (computed at render).
- [ ] Color tokens are restricted to this palette — these are real
      tokens defined in the project's Tailwind config:
      - `pr-coal`, `pr-coal-soft`
      - `pr-ivory`, `pr-ivory-dim`
      - `pr-blue`, `pr-red`, `pr-coqui`, `pr-white`
      Do NOT introduce new tokens (`pr-yellow`, `pr-coral`, etc).
- [ ] Bilingual UI uses the inline pattern `lang === "es" ? "Spanish"
      : "English"`. No third language. No i18n library calls.
      Spanish strings preserve accents (`í`, `ó`, `ñ`).

## Cultural correctness

- [ ] Spanish PR domino terms (`capicúa`, `chuchazo`, `tranca`, `paso`,
      `zapato`) keep their Spanish forms in the UI even when surrounded
      by English. Don't translate them away.
- [ ] If a brief asks you to invent UI copy about Puerto Rican culture
      and the brief doesn't quote exact strings: **don't guess**. Flag
      it as `AMBIGUOUS: cultural copy not specified`.

## Anti-cheat invariants (engine + server)

- [ ] Engine code (anything under `apps/web/src/engine/`) must be a
      pure function of `(state, input) → state`. No React imports, no
      Convex imports, no `Math.random` directly (accept an RNG
      function as a parameter).
- [ ] Never include opponent-hand data in any client-facing payload.
      If a brief implies that, refuse with `AMBIGUOUS: this would leak
      opponent hands — confirm intent`.
- [ ] Steal RNG runs on the server. Client never picks which tile is
      stolen. If a brief asks for client-side RNG on a steal: refuse.

## Process

- [ ] If the brief is ambiguous, do NOT guess. Return ONE line:
      `AMBIGUOUS: <exact thing that's unclear>`. Better to bounce than
      to invent.
- [ ] If you cannot satisfy an acceptance box, do NOT silently skip
      it. Return the file with a top-of-file comment
      `// qwen: FAILED <box name> because <reason>` and update the
      `BugFix.md` entry status to `[failed]` with the reason on the
      Resolution line.
- [ ] Brevity. Do not add comments, JSDoc, or "explanation" prose the
      brief didn't request. Code only.
- [ ] When in doubt, prefer the smaller change. A two-line patch that
      passes the acceptance criteria is better than a refactor that
      "improves" surrounding code.

## How this file gets updated

Opus appends new rules here whenever a qwen dispatch reveals a class
of mistake not already covered. The file is the source of truth for
qwen self-check; do not duplicate its contents into memory or briefs.
If a rule here turns out to be wrong, edit it in place and note the
reason in a follow-up commit.
