// Convex runtime exposes console.* (output appears in the Convex dashboard
// logs). The lib in tsconfig is ES2022 only, so we declare the ambient here.
declare const console: {
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
};
