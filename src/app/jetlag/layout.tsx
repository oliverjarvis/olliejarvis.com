import type { Metadata } from "next";
import { ReactNode } from "react";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { IdentityProvider } from "./IdentityProvider";
import { JetlagNav } from "./JetlagNav";

export const metadata: Metadata = {
  title: "Jetlag",
  description: "Real-time team chat, lists and dice rolls.",
};

export default function JetlagLayout({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <IdentityProvider>
        <div className="flex h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
          <JetlagNav />
          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </IdentityProvider>
    </ConvexClientProvider>
  );
}
