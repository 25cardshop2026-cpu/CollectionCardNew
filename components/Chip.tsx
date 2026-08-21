export function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  const styles =
    tone === "accent"
      ? "border-accent bg-accent-soft text-accent"
      : "border-line-strong text-ink-2";

  return (
    <span
      className={`inline-block rounded-[3px] border px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.06em] whitespace-nowrap ${styles}`}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
      {children}
      <span className="h-px flex-1 bg-line" />
    </p>
  );
}
