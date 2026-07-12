import type { Metadata } from "next";
import styles from "../traces.module.css";
import ContactEmail from "../ContactEmail";
import { LegalPageHeader, LegalSection } from "../LegalSection";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Traces, the word puzzle game — what information the app handles and how.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className={styles.card}>
      <LegalPageHeader title="Privacy Policy" effectiveDate="July 12, 2026" />

      <p className={styles.intro}>
        Traces is a word puzzle game. This Privacy Policy explains what
        information the app handles and how. We built Traces to need as
        little of your data as possible.
      </p>

      <LegalSection number={1} title="Information we handle">
        <ul className={styles.list}>
          <li>
            <strong>Anonymous account:</strong> When you first open Traces,
            the app creates an anonymous account identified by a random
            identifier. It is not linked to your name, email address, phone
            number, or Apple ID. We never ask you to create an account or
            provide personal details.
          </li>
          <li>
            <strong>Gameplay data:</strong> We store your puzzle progress and
            results — which puzzles you’ve completed, your completion times,
            streaks, and statistics — associated with your anonymous
            identifier so your progress works across sessions.
          </li>
          <li>
            <strong>Purchase information:</strong> If you subscribe to Traces
            Pro, your payment is processed by Apple. We use RevenueCat to
            manage and verify subscription status. RevenueCat receives a
            pseudonymous app user identifier and purchase/receipt information
            from Apple; it does not receive your name or payment card
            details. See{" "}
            <a
              href="https://www.revenuecat.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              RevenueCat’s Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="https://www.apple.com/legal/privacy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple’s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Feedback:</strong> If you send feedback through the app,
            we receive the message you write. Please don’t include sensitive
            personal information in feedback.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={2} title="Information we do not collect">
        <ul className={styles.list}>
          <li>
            We do not collect your name, email, address, phone number, or
            precise location.
          </li>
          <li>We do not show third-party advertising.</li>
          <li>We do not sell or rent your data to anyone.</li>
        </ul>
      </LegalSection>

      <LegalSection number={3} title="Notifications">
        <p>
          Traces can send an optional daily reminder notification. These are
          scheduled locally on your device and can be turned off at any time
          in the app’s settings or in iOS Settings. Enabling reminders does
          not send any data to us.
        </p>
      </LegalSection>

      <LegalSection number={4} title="How your information is used">
        <p>
          Solely to operate the game: save your progress, show your
          statistics, provide and verify your subscription, and respond to
          your feedback.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Data retention and deletion">
        <p>
          Because your account is anonymous, the simplest way to delete your
          data is to delete the app. To request deletion of gameplay data
          associated with your device, contact us at{" "}
          <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Children’s privacy">
        <p>
          Traces is not directed to children under 13, and we do not
          knowingly collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Security">
        <p>
          We use reputable service providers (Convex for backend and storage;
          RevenueCat and Apple for subscriptions) and industry-standard
          measures to protect the limited data we handle.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Changes will
          be posted on this page with an updated effective date.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Contact">
        <p>
          Questions? Email <ContactEmail />.
        </p>
      </LegalSection>
    </article>
  );
}
