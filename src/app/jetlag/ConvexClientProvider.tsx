"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

/**
 * Wraps the jetlag subtree in a Convex client. The deployment URL comes from
 * NEXT_PUBLIC_CONVEX_URL (written to .env.local by `npx convex dev`). If it is
 * missing we render children without a provider and surface a hint instead of
 * crashing the whole app.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  const client = useMemo(
    () => (url ? new ConvexReactClient(url) : null),
    [url],
  );

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-2">
          <h1 className="text-lg font-semibold">Convex not configured</h1>
          <p className="text-sm text-neutral-500">
            <code>NEXT_PUBLIC_CONVEX_URL</code> is not set. Run{" "}
            <code>npx convex dev</code> in the project root to start a local
            deployment, then reload.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
