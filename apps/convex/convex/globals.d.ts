// Convex runtime exposes console.* (output appears in the Convex dashboard
// logs). The lib in tsconfig is ES2022 only, so we declare the ambient here.
declare const console: {
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
};

// Convex runtime exposes process.env for environment variables set via the
// Convex dashboard. We only read string values; never write.
declare const process: {
    env: Record<string, string | undefined>;
};
