// Dark-only palette, matches the finance dashboard's visual identity.
export const colors = {
  surface: "#1a1a19",
  page: "#0d0d0d",
  textPrimary: "#ffffff",
  textSecondary: "#c3c2b7",
  muted: "#898781",
  gridline: "#2c2c2a",
  baseline: "#383835",
  border: "rgba(255,255,255,0.10)",
  good: "#0ca30c",
  bad: "#e66767",
  brand: "#abe349",
  brandOn: "#14210a",
};

// Fallback categorical palette offered when creating a new format type.
export const SWATCHES = [
  "#3987e5",
  "#199e70",
  "#d55181",
  "#c98500",
  "#9085e9",
  "#d95926",
  "#e66767",
  "#4fb8d9",
];

export const RESULT_TAGS = [
  { value: "worked_well", label: "Worked well" },
  { value: "mid", label: "Mid" },
  { value: "flopped", label: "Flopped" },
];

export const STATUS_LABELS = {
  needs_content: "Needs content",
  ready_to_post: "Ready to post",
  posted: "Posted",
};

export const BANK_STATUS_LABELS = {
  raw: "Raw",
  cut: "Cut",
  ready: "Ready",
};
