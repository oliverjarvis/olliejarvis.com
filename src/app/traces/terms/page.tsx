import type { Metadata } from "next";
import styles from "../traces.module.css";
import { LegalPageHeader, LegalSection } from "../LegalSection";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of Use for Traces, the word puzzle game — subscriptions, license, and acceptable use.",
};

export default function TermsOfUsePage() {
  return (
    <article className={styles.card}>
      <LegalPageHeader title="Terms of Use" effectiveDate="July 12, 2026" />

      <p className={styles.intro}>
        These Terms of Use (“Terms”) govern your use of the Traces app. By
        downloading or using Traces, you agree to these Terms.
      </p>

      <LegalSection number={1} title="License">
        <p>
          We grant you a personal, non-transferable, non-exclusive license to
          use Traces on Apple devices that you own or control, in accordance
          with Apple’s App Store Terms of Service.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Subscriptions (Traces Pro)">
        <p>
          Traces offers an auto-renewable subscription, Traces Pro, which
          unlocks the full puzzle archive and additional features.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Pricing:</strong> Traces Pro is available as a monthly
            subscription ($2.99/month) or an annual subscription
            ($29.99/year). Prices may vary by region and are shown in the app
            before you purchase.
          </li>
          <li>
            <strong>Free trial:</strong> New subscribers may be offered a
            free trial. If you don’t cancel before the trial ends, it
            automatically converts to a paid subscription. Any unused portion
            of a free trial is forfeited when you purchase a subscription.
          </li>
          <li>
            <strong>Auto-renewal:</strong> Subscriptions automatically renew
            unless auto-renew is turned off at least 24 hours before the end
            of the current period. Your Apple ID account is charged for
            renewal within 24 hours before the end of the current period.
          </li>
          <li>
            <strong>Managing your subscription:</strong> You can manage or
            cancel your subscription in your Apple ID account settings
            (Settings → your name → Subscriptions). Deleting the app does not
            cancel your subscription.
          </li>
          <li>
            <strong>Payment:</strong> Payment is charged to your Apple ID
            account at confirmation of purchase.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={3} title="Acceptable use">
        <p>
          You agree not to reverse engineer, modify, or misuse the app, or
          use it in any unlawful way.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Intellectual property">
        <p>
          Traces, including its puzzles, design, and content, is owned by us
          and protected by applicable laws. These Terms do not grant you any
          ownership rights.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Disclaimer">
        <p>
          Traces is provided “as is” without warranties of any kind. We do
          not guarantee that it will be uninterrupted or error-free.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, we are not liable for any
          indirect, incidental, or consequential damages arising from your
          use of the app.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Changes">
        <p>
          We may update these Terms from time to time. Continued use of the
          app after changes constitutes acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a href="mailto:oliversimonjarvis@gmail.com">
            oliversimonjarvis@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </article>
  );
}
