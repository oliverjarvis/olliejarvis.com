import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import styles from "./traces.module.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: {
    template: "%s — Traces",
    default: "Traces",
  },
  description:
    "Legal information for Traces, the word puzzle game: privacy policy and terms of use.",
};

export default function TracesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${styles.page} ${nunito.variable}`}>
      <div className={styles.accentBar} />
      <header className={styles.header}>
        <p className={styles.wordmark}>Traces</p>
      </header>
      <main className={styles.container}>{children}</main>
      <footer className={styles.footer}>
        <p>Traces is made by Oliver Jarvis.</p>
        <nav className={styles.footerLinks}>
          <Link href="/traces/privacy">Privacy Policy</Link>
          <Link href="/traces/terms">Terms of Use</Link>
        </nav>
      </footer>
    </div>
  );
}
