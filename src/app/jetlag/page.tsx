import { Suspense } from "react";
import { ChatView } from "./components/ChatView";

// The chat view reads `useSearchParams()` (via ChatView), which Next.js
// requires to be inside a <Suspense> boundary or `next build` fails.
export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-neutral-400">Loading…</div>}
    >
      <ChatView />
    </Suspense>
  );
}
