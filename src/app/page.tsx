import { Nunito } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Github, Twitter } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./home.module.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

const APP_STORE_URL = "https://apps.apple.com/app/id6790066066";

const TOOLS = [
  {
    name: "Dreamux",
    meta: "A Mac terminal for coding agents",
    url: "https://github.com/oliverjarvis/dreamux",
    image: "/home/dreamux.webp",
    imageAlt: "Dreamux: design. dream. build.",
    text:
      "A native macOS terminal multiplexer built on Ghostty, made for working " +
      "with coding agents. Each project keeps its repos and terminals together, " +
      "and you can describe a small tool in a sentence and have Claude build it " +
      "as an applet inside the app.",
  },
  {
    name: "Huggable",
    meta: "A Claude Code plugin for design systems",
    url: "https://github.com/oliverjarvis/huggable",
    image: "/home/huggable.webp",
    imageAlt: "Huggable: hugs for every moment",
    text:
      "AI-made interfaces tend to all look the same. Huggable has Claude build a " +
      "distinctive design system for a React or React Native app and stick to " +
      "it: lint rules and code generation keep every screen on the system, and " +
      "it can move an existing app onto one step by step.",
  },
];

const REPOS = [
  {
    name: "Pokémon Ultra Sun decompilation",
    url: "https://github.com/oliverjarvis/pokemonultrasun",
    text: "Rebuilds the 3DS game from source, byte-identical to the retail cartridge.",
  },
  {
    name: "agentic-setup",
    url: "https://github.com/oliverjarvis/agentic-setup",
    text: "My Claude Code setup as a plugin marketplace, installed with one line.",
  },
  {
    name: "grid-cells-tf2",
    url: "https://github.com/oliverjarvis/grid-cells-tf2",
    text: "DeepMind's grid-cell navigation paper (Nature, 2018), ported to TensorFlow 2.",
  },
];

export default function Home() {
  return (
    <div className={`${styles.page} ${nunito.variable}`}>
      <div className={styles.toolbar}>
        <ThemeToggle />
      </div>
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
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cardMedia}
              >
                <Image
                  src="/home/wordsplaces-cover.webp"
                  alt="Three Words&Places screens: tracing the word WORDS in Traces, a Hide & Seek clue on a map of Peru, and the Machu Picchu result"
                  width={1200}
                  height={630}
                  className={styles.cover}
                />
              </a>
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

            {TOOLS.map((tool) => (
              <article key={tool.name} className={styles.card}>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cardMedia}
                >
                  <Image
                    src={tool.image}
                    alt={tool.imageAlt}
                    width={1200}
                    height={480}
                    className={styles.banner}
                  />
                </a>
                <div className={styles.cardBody}>
                  <div>
                    <h3 className={styles.cardTitle}>{tool.name}</h3>
                    <p className={styles.cardMeta}>{tool.meta}</p>
                  </div>
                  <p className={styles.cardText}>{tool.text}</p>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.button}
                  >
                    View on GitHub →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="more">
          <h2 id="more" className={styles.sectionLabel}>
            More on GitHub
          </h2>
          <ul className={styles.repoList}>
            {REPOS.map((repo) => (
              <li key={repo.name}>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.repo}
                >
                  <span className={styles.repoName}>{repo.name}</span>
                  <span className={styles.repoText}>{repo.text}</span>
                  <span className={styles.repoArrow} aria-hidden>
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
