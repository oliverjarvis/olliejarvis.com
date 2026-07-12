import styles from "./traces.module.css";

export function LegalPageHeader({
  title,
  effectiveDate,
}: {
  title: string;
  effectiveDate: string;
}) {
  return (
    <header className={styles.pageHeader}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.effectiveDate}>Effective {effectiveDate}</p>
    </header>
  );
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionNumber}>{number}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
