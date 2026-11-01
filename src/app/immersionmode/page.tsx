import Image from "next/image";
import Link from "next/link";
import styles from "./immersionmode.module.css";

type Step = {
  title: string;
  body: React.ReactNode;
  images: { src: string; alt: string; width: number; height: number }[];
  wide?: boolean;
};

const steps: Step[] = [
  {
    title: "Every line, on the bottom screen",
    body: (
      <p>
        Whenever a character speaks, the same line also appears on the touch
        screen below, ready to be poked at. The game itself carries on exactly
        as normal on the top screen.
      </p>
    ),
    images: [
      {
        src: "/immersionmode/tap.webp",
        alt: "Professor Kukui speaking on the top screen, with his line copied onto the bottom screen",
        width: 746,
        height: 880,
      },
    ],
  },
  {
    title: "Tap a word to look it up",
    body: (
      <>
        <p>
          Don&apos;t know <span lang="ja">ふしぎ</span>? Tap it. The meaning
          pops up straight away, without putting the console down or reaching
          for a phone.
        </p>
        <p>
          Words I&apos;m already learning are underlined, so I can see at a
          glance which ones are new.
        </p>
      </>
    ),
    images: [
      {
        src: "/immersionmode/word.webp",
        alt: "The word ふしぎ tapped on the bottom screen, showing its meanings: wonderful, mysterious, strange",
        width: 746,
        height: 880,
      },
    ],
  },
  {
    title: "Stuck on a sentence? Ask Claude",
    body: (
      <p>
        Knowing every word doesn&apos;t always mean you understand the
        sentence. Pressing <strong>Grammar</strong>{" "}asks Claude, Anthropic&apos;s
        AI, to explain it: a plain English translation first, then the
        sentence piece by piece, with what each part is doing.
      </p>
    ),
    images: [
      {
        src: "/immersionmode/grammar.webp",
        alt: "Claude's explanation: a translation, then the first chunk of the sentence explained",
        width: 746,
        height: 880,
      },
      {
        src: "/immersionmode/grammar2.webp",
        alt: "Further down the explanation: the sentence-ending particle ね explained",
        width: 746,
        height: 880,
      },
    ],
  },
  {
    title: "Hear every line",
    body: (
      <p>
        Pokémon has no voice acting, which is a shame when you&apos;re trying
        to learn how Japanese sounds. So I gave it some: over 10,000 lines are
        voiced, with a different voice for each character. You can replay a
        line, or slow it down until you can catch every word.
      </p>
    ),
    wide: true,
    images: [
      {
        src: "/immersionmode/voice.jpg",
        alt: "A 3DS showing the replay and slow-down buttons on the bottom screen",
        width: 1200,
        height: 675,
      },
    ],
  },
  {
    title: "Keep the words for later",
    body: (
      <p>
        Found a word worth remembering? <strong>+ Add to kokoro</strong>{" "}sends
        it to kokoro, the flashcard app I built for my own Japanese study. It
        turns up in my reviews on my phone the next day, so the words from
        the game actually stick.
      </p>
    ),
    images: [
      {
        src: "/immersionmode/phone.webp",
        alt: "The word 不思議 in the kokoro flashcard app on an iPhone, waiting for its first review",
        width: 402,
        height: 874,
      },
    ],
  },
];

const stats = [
  { value: "16,000+", label: "lines of story text it can read" },
  { value: "10,029", label: "lines with a voice" },
  { value: "Real 3DS", label: "runs on the actual console" },
];

export default function ImmersionModePage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>A Pokémon mod for learning Japanese</p>
        <h1 className={styles.title}>
          I turned Pokémon into a <span className={styles.accent}>Japanese tutor</span>
        </h1>
        <p className={styles.lede}>
          <strong>ImmersionMode</strong>{" "}is a mod for the Japanese version of
          Pokémon Ultra Moon. It runs on a real Nintendo 3DS and uses the
          console&apos;s second screen to help you read every line of the
          game.
        </p>
        <div className={styles.videoFrame}>
          <video
            className={styles.video}
            src="/immersionmode/ad.mp4"
            poster="/immersionmode/poster.jpg"
            controls
            playsInline
            preload="metadata"
          />
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.prose}>
          <h2 className={styles.h2}>The idea</h2>
          <p>
            Playing games in Japanese is a great way to learn, in theory. In
            practice you hit a word you don&apos;t know every few seconds, put
            the console down, try to type something you can&apos;t read into a
            dictionary app… and ten minutes later the fun has gone.
          </p>
          <p>
            Meanwhile the 3DS has a whole second screen that spends most of
            the game showing nothing very important. So I put a reading
            assistant there.
          </p>
        </section>

        <h2 className={`${styles.h2} ${styles.howTitle}`}>How it works</h2>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li
              key={step.title}
              className={`${styles.step} ${step.wide ? styles.stepWide : ""} ${
                step.images.length > 1 ? styles.stepPair : ""
              }`}
            >
              <div className={styles.stepText}>
                <span className={styles.stepNumber}>{i + 1}</span>
                <h3 className={styles.h3}>{step.title}</h3>
                {step.body}
              </div>
              <div
                className={`${styles.stepImages} ${
                  step.images.length > 1 ? styles.stepImagesPair : ""
                }`}
              >
                {step.images.map((img) => (
                  <Image
                    key={img.src}
                    src={img.src}
                    alt={img.alt}
                    width={img.width}
                    height={img.height}
                    className={`${styles.shot} ${
                      img.src.endsWith("phone.webp") ? styles.phone : ""
                    } ${step.wide ? styles.shotWide : ""}`}
                    sizes="(max-width: 760px) 90vw, 380px"
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>

        <section className={styles.stats} aria-label="In numbers">
          {stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <p className={styles.statValue}>{s.value}</p>
              <p className={styles.statLabel}>{s.label}</p>
            </div>
          ))}
        </section>

        <section className={styles.prose}>
          <h2 className={styles.h2}>How do you mod a 3DS game?</h2>
          <p>
            Nintendo doesn&apos;t publish the game&apos;s code, so there was
            nothing to simply edit. Instead, the mod is a small program that
            slips into the game while it runs. It notices whenever text is
            about to appear on screen, makes a copy, and draws its own panel
            on the bottom screen alongside the game.
          </p>
          <p>
            Most of the work was detective work: figuring out where the game
            keeps its text, who says each line, and how to play sound through
            the game&apos;s own audio. I built it together with Claude Code as
            my pair programmer, and tested it on my own 3DS.
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          Made by <Link href="/">Oliver Jarvis</Link>.
        </p>
        <p className={styles.disclaimer}>
          ImmersionMode is a personal fan project. It isn&apos;t affiliated
          with or endorsed by Nintendo, Game Freak or The Pokémon Company, and
          no game files are shared here.
        </p>
      </footer>
    </div>
  );
}
