import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

const title = "ImmersionMode: I turned Pokémon into a Japanese tutor";
const description =
  "A mod for Pokémon Ultra Moon on a real Nintendo 3DS. Every line of the game appears on the bottom screen: tap a word to look it up, ask Claude about the grammar, and hear every line read aloud.";

export const metadata: Metadata = {
  metadataBase: new URL("https://olliejarvis.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/immersionmode",
    type: "article",
    images: [{ url: "/immersionmode/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/immersionmode/og.jpg"],
  },
};

export default function ImmersionModeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={nunito.variable}>{children}</div>;
}
