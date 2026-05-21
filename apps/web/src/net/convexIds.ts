// Re-export the Convex-generated Id<T> type from the convex package so web code doesn't have to
// dig through the relative path. After codegen runs, @convex/_generated/dataModel.js provides
// this; before codegen it doesn't exist and the @ts-expect-error suppresses the missing import.

// @ts-ignore — stub overwritten by `convex dev`
export type { Id } from "@convex/_generated/dataModel.js";
