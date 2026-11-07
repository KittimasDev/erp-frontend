"use client";

import { Empty } from "antd";

import { useT } from "@/lib/i18n/useT";

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
};

export default function PlaceholderPage({
  eyebrow,
  title,
  description,
}: Props) {
  const t = useT();
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <header
        style={{
          padding: "18px 22px",
          border: "1px solid #e8eaed",
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 8px 24px rgba(47, 52, 58, 0.05)",
        }}
      >
        <p
          style={{
            margin: "0 0 4px",
            color: "#6f9720",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {t(eyebrow)}
        </p>
        <h1
          style={{
            margin: 0,
            color: "#2f343a",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {t(title)}
        </h1>
      </header>

      <section
        style={{
          padding: "48px 22px",
          border: "1px solid #e8eaed",
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 8px 24px rgba(47, 52, 58, 0.05)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: "#8a9199" }}>
              {t(description ?? "อยู่ระหว่างพัฒนา")}
            </span>
          }
        />
      </section>
    </div>
  );
}
