import { Nunito } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Github, Twitter } from "lucide-react";
import styles from "./home.module.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

const APP_STORE_URL = "https://apps.apple.com/app/id6790066066";

export default function Home() {
  return (
    <div className={`${styles.page} ${nunito.variable}`}>
      <main className={styles.main}>
        <header className={styles.intro}>
          <Image
            src="/profile.png"
            alt="Oliver Jarvis"
            width={112}
            height={112}
            className={styles.avatar}
            priority
          />
          <h1 className={styles.name}>Oliver Jarvis</h1>
          <p className={styles.role}>
            Senior AI Engineer at{" "}
            <a href="https://www.simply.tv" target="_blank" rel="noopener noreferrer">
              Simply.TV
            </a>
          </p>
          <nav className={styles.socials} aria-label="Elsewhere">
            <a href="https://github.com/oliverjarvis" target="_blank" rel="noopener noreferrer">
              <Github size={18} aria-hidden />
              GitHub
            </a>
            <a href="https://twitter.com/olliesjarvis" target="_blank" rel="noopener noreferrer">
              <Twitter size={18} aria-hidden />
              Twitter
            </a>
          </nav>
        </header>

        <section className={styles.section} aria-labelledby="work">
          <h2 id="work" className={styles.sectionLabel}>
            Work
          </h2>
          <a
            href="https://www.simply.tv"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.card} ${styles.workCard}`}
          >
            <div className={styles.logoBadge}>
              <Image
                src="/home/simplytv.webp"
                alt="Simply.TV"
                width={780}
                height={280}
                className={styles.logo}
              />
            </div>
            <div className={styles.cardBody}>
              <h3 className={styles.cardTitle}>Senior AI Engineer, Simply.TV</h3>
              <p className={styles.cardText}>
                Simply.TV provides TV metadata on a global scale, across linear
                TV and streaming.
              </p>
            </div>
          </a>
        </section>

        <section className={styles.section} aria-labelledby="projects">
          <h2 id="projects" className={styles.sectionLabel}>
            Projects
          </h2>

          <div className={styles.projects}>
            <article className={styles.card}>
              <div className={`${styles.cardMedia} ${styles.wpMedia}`}>
                <Image
                  src="/home/wp-traces.webp"
                  alt="Traces: trace words through the letters"
                  width={762}
                  height={358}
                  className={styles.wpCard}
                />
                <Image
                  src="/home/wp-hideseek.webp"
                  alt="Hide & Seek: find a famous place using clues and a real map"
                  width={762}
                  height={358}
                  className={styles.wpCard}
                />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.titleRow}>
                  <Image
                    src="/home/wordsplaces-icon.webp"
                    alt=""
                    width={44}
                    height={44}
                    className={styles.appIcon}
                  />
                  <div>
                    <h3 className={styles.cardTitle}>Words&amp;Places</h3>
                    <p className={styles.cardMeta}>iPhone app</p>
                  </div>
                </div>
                <p className={styles.cardText}>
                  Daily puzzles for words and places. In <strong>Traces</strong>
                  {" "}you find hidden words by tracing paths through the
                  letters; in <strong>Hide &amp; Seek</strong>{" "}you track down
                  a famous place using clues and a real map.
                </p>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.button}
                >
                  Get it on the App Store →
                </a>
              </div>
            </article>

            <article className={styles.card}>
              <Link href="/immersionmode" className={styles.cardMedia}>
                <Image
                  src="/home/immersionmode.webp"
                  alt="A Nintendo 3DS running ImmersionMode, with the game's dialogue on the bottom screen"
                  width={960}
                  height={504}
                  className={styles.cover}
                />
              </Link>
              <div className={styles.cardBody}>
                <div className={styles.titleRow}>
                  <div>
                    <h3 className={styles.cardTitle}>ImmersionMode</h3>
                    <p className={styles.cardMeta}>A Pokémon mod for learning Japanese</p>
                  </div>
                </div>
                <p className={styles.cardText}>
                  I turned Pokémon Ultra Moon into a Japanese tutor. On a real
                  3DS, every line of the game appears on the bottom screen:
                  tap a word to look it up, ask Claude about the grammar, and
                  hear every line read aloud.
                </p>
                <Link href="/immersionmode" className={styles.button}>
                  See how it works →
                </Link>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
