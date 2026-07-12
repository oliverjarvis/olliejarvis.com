"use client";

import { useEffect, useState } from "react";

// The address, base64-encoded, so it never appears as a plain-text string
// (and isn't matchable by a naive email regex) in the static HTML or the JS
// bundle. Decoded on the client after mount.
const ENCODED_EMAIL = "b2xpdmVyc2ltb25qYXJ2aXNAZ21haWwuY29t";

// Same address, reversed, used only as a pre-hydration / no-JS display
// fallback. Rendered right-to-left via CSS so it *looks* correct to a human
// but the markup itself never contains the address in matchable form.
const REVERSED_FALLBACK = "moc.liamg@sivrajnomisrevilo";

export default function ContactEmail() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(atob(ENCODED_EMAIL));
  }, []);

  if (email) {
    return <a href={`mailto:${email}`}>{email}</a>;
  }

  return (
    <span style={{ unicodeBidi: "bidi-override", direction: "rtl" }}>
      {REVERSED_FALLBACK}
    </span>
  );
}
