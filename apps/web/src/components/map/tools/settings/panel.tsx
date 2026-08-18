"use client";

import Link from "next/link";
import {
  FlaskConical,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBusFinder } from "@/context/buses";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { useSettings, type ThemeSetting } from "@/hooks/use-settings";

const THEME_OPTIONS: {
  value: ThemeSetting;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "light", label: "Clar", icon: Sun },
  { value: "dark", label: "Fosc", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/**
 * One group of settings. No box around the rows: the panel already sits on its
 * own surface (a dialog or a drawer), and nesting a second bordered card inside
 * it is what makes a settings screen read as a generic form rather than as part
 * of this app.
 */
const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) => (
  <section className="space-y-3">
    <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
      <Icon size={14} />
      {title}
    </h3>
    {children}
  </section>
);

/**
 * The settings body, shared verbatim by the desktop dialog and the mobile drawer
 * (see `./index.tsx`) — the container changes with the viewport, the content
 * never does.
 *
 * Everything here is device-local: the two `moventis:settings` values, the answer
 * to the storage notice, and the saved stops. Nothing on this panel travels with
 * an account, because there are no accounts.
 */
const SettingsPanel = () => {
  const { settings, setLiveBusPrediction, setTheme } = useSettings();
  const { status: consent, accept, decline } = useCookieConsent();
  const { preferidesCount, clearPreferides } = useBusFinder();

  // `unset` behaves like `accepted` everywhere else in the app (see
  // `use-cookie-consent.ts`), so it has to read that way here too — saying
  // "desactivat" for a device that is in fact saving stops would be a lie.
  const storageEnabled = consent !== "declined";

  return (
    <div className="space-y-6">
      <Section title="funcions experimentals" icon={FlaskConical}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="live-bus-prediction" className="flex-wrap">
              Posició del bus en temps real
              <Badge variant="secondary">experimental</Badge>
            </Label>
            <p
              id="live-bus-prediction-help"
              className="text-muted-foreground text-xs leading-relaxed"
            >
              Estimació de la posició dels autobusos mentre circulen, calculada
              a partir de l&apos;horari. Encara s&apos;està ajustant i pot
              fallar.
            </p>
          </div>
          <Switch
            id="live-bus-prediction"
            checked={settings.liveBusPrediction}
            onCheckedChange={setLiveBusPrediction}
            aria-describedby="live-bus-prediction-help"
            className="mt-0.5"
          />
        </div>
      </Section>

      <Section title="aparença" icon={Palette}>
        <div className="space-y-2">
          <span className="text-sm font-medium">Tema</span>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
              const isActive = settings.theme === value;
              return (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setTheme(value)}
                  aria-pressed={isActive}
                  className="flex-1 gap-1.5"
                >
                  <Icon />
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="privadesa i dades" icon={ShieldCheck}>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Emmagatzematge local:{" "}
              <span
                className={
                  storageEnabled ? "text-foreground" : "text-muted-foreground"
                }
              >
                {storageEnabled ? "activat" : "desactivat"}
              </span>
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Les parades preferides es guarden al navegador, només en aquest
              dispositiu. No fem servir cookies de seguiment ni analítica de
              tercers.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={accept}
                aria-label="accepta l'ús de l'emmagatzematge local per a les preferides"
              >
                d&apos;acord
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={decline}
                aria-label="rebutja l'ús de l'emmagatzematge local per a les preferides"
              >
                rebutja
              </Button>
              <Link
                href="/privadesa"
                className="text-muted-foreground hover:text-foreground ml-auto text-xs underline underline-offset-4 transition-colors"
              >
                més informació
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">
                Esborra les parades preferides
              </p>
              <p className="text-muted-foreground text-xs">
                {preferidesCount === 1
                  ? "1 parada desada"
                  : `${preferidesCount} parades desades`}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={clearPreferides}
              disabled={preferidesCount === 0}
              aria-label="esborra les parades preferides"
              className="text-destructive hover:text-destructive"
            >
              esborra
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default SettingsPanel;
