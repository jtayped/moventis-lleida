import type { Lang } from "@moventis/shared";

const ca = {
  title: "privadesa",
  description:
    "què desa aquest lloc al teu navegador, què no en surt mai, i com pots canviar-ho.",
  updated: "última actualització: setembre del 2026",
};

export type PrivacyCopy = typeof ca;

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: PrivacyCopy = ca;

export const privacyCopy: Record<Lang, PrivacyCopy> = { ca, es };
