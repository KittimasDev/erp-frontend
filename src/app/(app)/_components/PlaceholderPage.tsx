import styles from "../page.module.css";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className={styles.dashboard}>
      <div className={styles.heroCard}>
        <p className={styles.eyebrow}>Inventory Management</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
    </section>
  );
}
