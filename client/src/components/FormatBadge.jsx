export default function FormatBadge({ name, color, muted }) {
  if (!name) return <span className="badge badge-muted">TBD</span>;
  return (
    <span className="badge">
      <span className="badge-dot" style={{ background: muted ? "var(--muted)" : color }} />
      {name}
    </span>
  );
}
