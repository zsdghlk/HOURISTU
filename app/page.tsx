import Link from "next/link";
import { ROKUPO } from "@/lib/rokupo";

export default function Home() {
  return (
    <main className="section">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {ROKUPO.map((law) => (
          <Link
            key={law.lawId}
            href={`/law/${law.lawId}`}
            className="card"
            style={{
              display: "block",
              padding: "16px",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              textDecoration: "none",
            }}
          >
            <h2 style={{ marginBottom: 8 }}>{law.title}</h2>
            <p className="muted">法令番号: {law.lawNo}</p>
            <p className="muted">Law ID: {law.lawId}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
