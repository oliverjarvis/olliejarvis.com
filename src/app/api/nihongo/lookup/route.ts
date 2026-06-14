import { NextRequest, NextResponse } from "next/server";

interface LookupResult {
  word: string;
  reading: string;
  meaning: string;
}

function extractDefinitions(html: string): LookupResult[] {
  const results: LookupResult[] = [];

  // ichi.moe wraps each compound/word analysis in <div class="gloss-rw">
  // Inside, definitions appear in <span class="gloss-desc">
  // Readings appear in <span class="gloss-rk"> (reading in kana)
  const meanings: string[] = [];
  const regex = /class="gloss-desc"[^>]*>([^<]+)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const trimmed = match[1].trim();
    if (trimmed.length > 0) meanings.push(trimmed);
  }

  if (meanings.length > 0) {
    results.push({
      word: "",
      reading: "",
      meaning: meanings.slice(0, 5).join("; "),
    });
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { word } = await request.json();
    if (!word) {
      return NextResponse.json({ error: "No word provided" }, { status: 400 });
    }

    const url = `https://ichi.moe/cl/qr/?q=${encodeURIComponent(word)}&r=htr`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NihongoPractice/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { results: [], url },
        { status: 200 },
      );
    }

    const html = await response.text();
    const results = extractDefinitions(html);

    return NextResponse.json({ results, url });
  } catch {
    return NextResponse.json(
      { results: [], error: "Lookup failed" },
      { status: 200 },
    );
  }
}
