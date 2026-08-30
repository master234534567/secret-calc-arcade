/* Tab cloaking: swap the browser tab favicon + title instantly.
   All icons are inline SVG data URIs, so nothing is fetched from the network. */

export interface CloakPreset {
  id: string;
  label: string;
  title: string;
  /** Inline SVG favicon (data URI). */
  icon: string;
}

function svg(body: string, bg = "#ffffff") {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${bg}"/>${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(doc)}`;
}

const glyph = (t: string, color: string, size = 38) =>
  `<text x="32" y="34" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="central">${t}</text>`;

export const CLOAK_PRESETS: CloakPreset[] = [
  {
    id: "default",
    label: "Calculator",
    title: "Calculator",
    icon: svg(
      `<rect x="16" y="10" width="32" height="44" rx="5" fill="#111827"/><rect x="21" y="15" width="22" height="10" rx="2" fill="#9ca3af"/><g fill="#6b7280"><circle cx="25" cy="33" r="3"/><circle cx="32" cy="33" r="3"/><circle cx="39" cy="33" r="3"/><circle cx="25" cy="42" r="3"/><circle cx="32" cy="42" r="3"/><circle cx="39" cy="42" r="3"/></g>`,
      "#e5e7eb",
    ),
  },
  {
    id: "docs",
    label: "Google Docs",
    title: "Untitled document - Google Docs",
    icon: svg(
      `<path d="M18 6h20l10 10v42H18z" fill="#4285f4"/><path d="M38 6l10 10H38z" fill="#a1c2fa"/><g fill="#fff"><rect x="24" y="26" width="18" height="3"/><rect x="24" y="34" width="18" height="3"/><rect x="24" y="42" width="12" height="3"/></g>`,
    ),
  },
  {
    id: "classroom",
    label: "Google Classroom",
    title: "Classes",
    icon: svg(
      `<rect x="8" y="14" width="48" height="36" rx="4" fill="#0f9d58"/><circle cx="32" cy="28" r="6" fill="#fff"/><path d="M20 44c0-6 5-10 12-10s12 4 12 10z" fill="#fff"/>`,
    ),
  },
  {
    id: "drive",
    label: "Google Drive",
    title: "My Drive - Google Drive",
    icon: svg(
      `<path d="M24 8h16l16 28H40z" fill="#ffcf63"/><path d="M24 8L8 36l8 14 16-28z" fill="#4a8bf5"/><path d="M16 50h40l8-14H24z" fill="#2f9e5f"/>`,
    ),
  },
  {
    id: "canvas",
    label: "Canvas LMS",
    title: "Dashboard",
    icon: svg(`<circle cx="32" cy="32" r="22" fill="#e13b2f"/>${glyph("C", "#fff", 26)}`),
  },
  {
    id: "gmail",
    label: "Gmail",
    title: "Inbox (3) - Gmail",
    icon: svg(
      `<rect x="8" y="16" width="48" height="32" rx="4" fill="#fff" stroke="#e5e7eb" stroke-width="2"/><path d="M8 20l24 18 24-18" fill="none" stroke="#ea4335" stroke-width="5"/>`,
    ),
  },
  {
    id: "wikipedia",
    label: "Wikipedia",
    title: "Wikipedia, the free encyclopedia",
    icon: svg(glyph("W", "#111827", 40), "#f8f9fa"),
  },
  {
    id: "khan",
    label: "Khan Academy",
    title: "Khan Academy | Free Online Courses",
    icon: svg(glyph("K", "#ffffff", 36), "#14bf96"),
  },
  {
    id: "schoology",
    label: "Schoology",
    title: "Home | Schoology",
    icon: svg(glyph("S", "#ffffff", 38), "#0677ba"),
  },
  {
    id: "clever",
    label: "Clever",
    title: "Clever | Portal",
    icon: svg(glyph("c", "#ffffff", 42), "#4274f6"),
  },
];

const STORAGE_KEY = "cloak-preset";

export function applyCloak(preset: CloakPreset) {
  if (typeof document === "undefined") return;
  document.title = preset.title;
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>("link[rel~='icon'], link[rel='shortcut icon']"),
  );
  links.forEach((l) => l.parentNode?.removeChild(l));
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = preset.icon;
  document.head.appendChild(link);
  try {
    localStorage.setItem(STORAGE_KEY, preset.id);
  } catch {
    /* storage unavailable */
  }
}

export function loadSavedCloak(): CloakPreset | null {
  if (typeof window === "undefined") return null;
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return CLOAK_PRESETS.find((p) => p.id === id) ?? null;
  } catch {
    return null;
  }
}
