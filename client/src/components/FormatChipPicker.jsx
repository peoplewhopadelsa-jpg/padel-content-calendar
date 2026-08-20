export default function FormatChipPicker({ formatTypes, value, onChange, includeNone }) {
  return (
    <div className="chip-row">
      {includeNone && (
        <button
          type="button"
          className={`chip${value == null ? " selected" : ""}`}
          style={value == null ? { background: "var(--baseline)" } : undefined}
          onClick={() => onChange(null)}
        >
          TBD
        </button>
      )}
      {formatTypes.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`chip${value === f.id ? " selected" : ""}`}
          style={value === f.id ? { background: f.color } : undefined}
          onClick={() => onChange(f.id)}
        >
          <span className="chip-dot" style={{ background: f.color }} />
          {f.name}
        </button>
      ))}
    </div>
  );
}
