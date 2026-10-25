import type { Lang } from "@moventis/shared";

const ca = {
  title: "privadesa",
  description:
    "què desa aquest lloc al teu navegador, què no en surt mai, i com pots canviar-ho.",
  updated: "última actualització: setembre del 2026",
};

export type PrivacyCopy = typeof ca;

const es: PrivacyCopy = {
  title: "privacidad",
  description:
    "qué guarda este sitio en tu navegador, qué no sale nunca de él y cómo puedes cambiarlo.",
  updated: "última actualización: septiembre de 2026",
};

export const privacyCopy: Record<Lang, PrivacyCopy> = { ca, es };
