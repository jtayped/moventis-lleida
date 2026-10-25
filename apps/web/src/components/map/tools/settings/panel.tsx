"use client";

import { Link } from "@/i18n/link";
import {
  Clock,
  FlaskConical,
  Info,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { LangSwitch } from "@/components/lang-switch";
import { Label } from "@/components/ui/label";
import { MAX_PREDICTED_LINES } from "@/lib/live-buses";
import { Switch } from "@/components/ui/switch";
import { useBusFinder } from "@/context/buses";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { useSettings, type ThemeSetting } from "@/hooks/use-settings";
import { track } from "@/lib/analytics";
import { AuthorCard } from "@/components/content/author-card";
import { SiteLinks } from "@/components/content/site-links";
import { useLang } from "@/i18n/lang-context";
import { settingsCopy } from "@/i18n/copy/settings";
import { mapCopy } from "@/i18n/copy/map";

const THEME_OPTIONS: {
  value: ThemeSetting;
  icon: LucideIcon;
}[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
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
 * Everything here is device-local: the `moventis:settings` values, the answer to
 * the storage notice, and the saved stops. Nothing on this panel travels with
 * an account, because there are no accounts.
 */
const SettingsPanel = () => {
  const {
    settings,
    setAnalytics,
    setArrivalDrift,
    setStopEtas,
    setLiveBusPrediction,
    setTheme,
  } = useSettings();
  const { status: consent, accept, decline } = useCookieConsent();
  const lang = useLang();
  const t = settingsCopy[lang];
  const consentCopy = mapCopy[lang].consent;
  const { preferidesCount, clearPreferides } = useBusFinder();

  // Every handler here reports before it writes. It has to for the analytics
  // switch — turning it off is the last thing this device will ever send, and
  // running the setter first would silence the event that says so — and the
  // others follow the same shape so the rule is one rule.
  //
  // The cost is that turning analytics back *on* isn't counted: at the moment
  // of that click the device still hasn't opted in, and `track` is right to
  // refuse it. An opt-in shows up as the visits that follow it.
  const handleTheme = (theme: ThemeSetting) => {
    track("setting changed", { setting: "theme", value: theme });
    setTheme(theme);
  };

  const handleArrivalDrift = (enabled: boolean) => {
    track("setting changed", {
      setting: "arrivalDrift",
      value: enabled ? "on" : "off",
    });
    setArrivalDrift(enabled);
  };

  const handleStopEtas = (enabled: boolean) => {
    track("setting changed", {
      setting: "stopEtas",
      value: enabled ? "on" : "off",
    });
    setStopEtas(enabled);
  };

  const handleLiveBusPrediction = (enabled: boolean) => {
    track("setting changed", {
      setting: "liveBusPrediction",
      value: enabled ? "on" : "off",
    });
    setLiveBusPrediction(enabled);
  };

  const handleAnalytics = (enabled: boolean) => {
    track("setting changed", {
      setting: "analytics",
      value: enabled ? "on" : "off",
    });
    setAnalytics(enabled);
  };

  // `unset` behaves like `accepted` everywhere else in the app (see
  // `use-cookie-consent.ts`), so it has to read that way here too — saying
  // "desactivat" for a device that is in fact saving stops would be a lie.
  const storageEnabled = consent !== "declined";

  return (
    <div className="space-y-6">
      <Section title={t.experimental.title} icon={FlaskConical}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="live-bus-prediction" className="flex-wrap">
              {t.experimental.busPosition}
              <Badge variant="secondary">{t.experimental.badge}</Badge>
            </Label>
            <p
              id="live-bus-prediction-help"
              className="text-muted-foreground text-xs leading-relaxed"
            >
              {t.experimental.busPositionHelp(MAX_PREDICTED_LINES)}
            </p>
          </div>
          <Switch
            id="live-bus-prediction"
            checked={settings.liveBusPrediction}
            onCheckedChange={handleLiveBusPrediction}
            aria-describedby="live-bus-prediction-help"
            className="mt-0.5"
          />
        </div>
      </Section>

      <Section title={t.schedules.title} icon={Clock}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="stop-etas">{t.schedules.stopEtas}</Label>
            <p
              id="stop-etas-help"
              className="text-muted-foreground text-xs leading-relaxed"
            >
              {t.schedules.stopEtasHelp}
            </p>
          </div>
          <Switch
            id="stop-etas"
            checked={settings.stopEtas}
            onCheckedChange={handleStopEtas}
            aria-describedby="stop-etas-help"
            className="mt-0.5"
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="arrival-drift">{t.schedules.drift}</Label>
            <p
              id="arrival-drift-help"
              className="text-muted-foreground text-xs leading-relaxed"
            >
              {t.schedules.driftHelp}
            </p>
          </div>
          <Switch
            id="arrival-drift"
            checked={settings.arrivalDrift}
            onCheckedChange={handleArrivalDrift}
            aria-describedby="arrival-drift-help"
            className="mt-0.5"
          />
        </div>
      </Section>

      <Section title={t.appearance.title} icon={Palette}>
        <div className="space-y-2">
          <span className="text-sm font-medium">{t.appearance.theme}</span>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, icon: Icon }) => {
              const isActive = settings.theme === value;
              return (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => handleTheme(value)}
                  aria-pressed={isActive}
                  className="flex-1 gap-1.5"
                >
                  <Icon />
                  {t.themes[value]}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{t.language.title}</span>
          <LangSwitch
            className={buttonVariants({ variant: "outline", size: "sm" })}
          />
        </div>
      </Section>

      <Section title={t.privacy.title} icon={ShieldCheck}>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t.privacy.storage}{" "}
              <span
                className={
                  storageEnabled ? "text-foreground" : "text-muted-foreground"
                }
              >
                {storageEnabled ? t.privacy.enabled : t.privacy.disabled}
              </span>
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t.privacy.storageHelp}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={accept}
                aria-label={consentCopy.acceptLabel}
              >
                {consentCopy.accept}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={decline}
                aria-label={consentCopy.declineLabel}
              >
                {consentCopy.decline}
              </Button>
              <Link
                href="/privadesa"
                className="text-muted-foreground hover:text-foreground ml-auto text-xs underline underline-offset-4 transition-colors"
              >
                {consentCopy.more}
              </Link>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="analytics">{t.privacy.analytics}</Label>
              <p
                id="analytics-help"
                className="text-muted-foreground text-xs leading-relaxed"
              >
                {t.privacy.analyticsHelp}
              </p>
            </div>
            <Switch
              id="analytics"
              checked={settings.analytics}
              onCheckedChange={handleAnalytics}
              aria-describedby="analytics-help"
              className="mt-0.5"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{t.privacy.clearSaved}</p>
              <p className="text-muted-foreground text-xs">
                {t.privacy.savedCount(preferidesCount)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={clearPreferides}
              disabled={preferidesCount === 0}
              aria-label={t.privacy.clearSaved}
              className="text-destructive hover:text-destructive"
            >
              {t.privacy.clear}
            </Button>
          </div>
        </div>
      </Section>

      {/* Every content page, on any screen. The map's bars link only some:
          línies and parades on a phone, plus tarifes and informació on
          desktop. Privadesa is reached from here and the footer. */}
      <Section title={t.more.title} icon={Info}>
        <SiteLinks label={t.more.pagesLabel} className="-mx-2" />
        <AuthorCard compact />
      </Section>
    </div>
  );
};

export default SettingsPanel;
