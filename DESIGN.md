---
name: Bus Urbà Lleida
description: Real-time urban bus arrival viewer for Lleida, Spain
colors:
  lleida-blue: "oklch(0.546 0.229 263)"
  ink: "oklch(0.145 0 0)"
  ink-muted: "oklch(0.556 0 0)"
  surface: "oklch(1 0 0)"
  surface-raised: "oklch(0.97 0 0)"
  border: "oklch(0.922 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lleida-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "oklch(0.48 0.22 263)"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  badge-line:
    backgroundColor: "[per-line transit color]"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
---

# Design System: Bus Urbà Lleida

## 1. Overview

**Creative North Star: "The Transit Board"**

This is a precision instrument. Every element is designed for one primary context: a phone in someone's hand at a bus stop, likely in daylight, with 30 seconds before the bus arrives. The visual language is borrowed from real-time departure boards — information-forward, legible at a glance, with no surface area wasted on decoration. Lleida Blue anchors interactive chrome; per-line transit colors carry route identity. Everything else is neutral and gets out of the way.

The system explicitly rejects government-style transit design: heavy institutional color blocks, all-caps hierarchy, and the visual weight of civic obligation. It also rejects generic SaaS product aesthetics: card grids with identical content, blue everywhere, "seamless" experience language. This tool is a specific object for a specific place, and the design should feel like both.

**Key Characteristics:**
- Single geometric sans (Geist) across all roles — weight and size alone carry hierarchy
- Lleida Blue reserved strictly for interactive chrome; never decorative
- Per-line transit colors are categorical identifiers, not palette elements
- Flat surfaces by default; minimal shadow-sm appears only on floating chrome (filter panel)
- High contrast ratios — body text targets 5:1 minimum for outdoor readability

## 2. Colors: The Lleida Palette

A near-monochromatic neutral foundation with one named accent and a categorical transit layer.

### Primary
- **Lleida Blue** (`oklch(0.546 0.229 263)` / `#2563eb`): The single interactive accent. Used on primary buttons, focus rings, links, and active states. Absent from decorative surfaces. Its rarity signals action.

### Neutral
- **Ink** (`oklch(0.145 0 0)` / `#181818`): All primary text. Also used as the default button background before the brand blue is established in the CSS tokens.
- **Ink Muted** (`oklch(0.556 0 0)` / `#696969`): Secondary text — timestamps, labels, supporting copy. Must pass 4.5:1 against Surface.
- **Surface** (`oklch(1 0 0)` / `#ffffff`): Page background, card background, primary surface.
- **Surface Raised** (`oklch(0.97 0 0)` / `#f7f7f7`): Subtle elevation step for chips and secondary backgrounds.
- **Border** (`oklch(0.922 0 0)` / `#eaeaea`): Dividers, card outlines, input strokes. Never used for color interest.
- **Destructive** (`oklch(0.577 0.245 27.325)` / `#e54040`): Error states and destructive actions only.

### Transit Colors (categorical, not palette)
Per-line colors (line 1 yellow `#FFFF18`, line 2 red `#FF134A`, line 4 blue `#1571FD`, etc.) are fixed identifiers from the transit authority. They are used ONLY on line number badges and map pins. They never appear as background tints, gradient accents, or decorative fills outside of their line context.

### Named Rules
**The One Blue Rule.** Lleida Blue (`#2563eb`) is the only color that communicates "interact with me." If it appears decoratively, the signal breaks. Keep it out of illustrations, backgrounds, borders, and any surface not tied to an action or link.

**The Line Color Sovereignty Rule.** Per-line transit colors are categorical identifiers, not palette elements. Never use a line color for a UI purpose it wasn't meant for (section backgrounds, highlights, call-to-action buttons). The yellow of Line 1 means "Line 1," full stop.

## 3. Typography

**Display / Body / Label Font:** Geist Sans (with `system-ui, sans-serif` fallback)

**Character:** Geometric sans with technical precision. Reads at 12px in bright sunlight; feels native to modern screens. Single-family system: no serif display, no decorative script. Hierarchy is expressed entirely through scale and weight contrast.

### Hierarchy
- **Display** (700, clamp(1.5rem → 2rem), line-height 1.2, tracking −0.02em): Stop name headings in the arrival drawer. Two lines maximum.
- **Body** (400, 0.875rem / 14px, line-height 1.5): Arrival times, journey names, supporting text. Max line length 65ch; never full-width prose.
- **Label** (500, 0.75rem / 12px, line-height 1.4): Timestamps, route codes in text context, section labels. Not uppercase — lowercase label text at 12px reads faster at a glance.

### Named Rules
**The Single Family Rule.** One font family across all roles. Weight contrast (400 ↔ 700) and scale steps (12px ↔ 14px ↔ 24px) carry the full hierarchy. Introducing a second family — serif display, mono timestamps — adds cognitive overhead without serving the use case.

**The Label Case Rule.** No all-caps labels. At 12px in outdoor light, all-caps labels reduce legibility. Use medium weight (500) and size contrast for label distinction instead.

## 4. Elevation

Flat by default. This is a transit board, not a layered product interface.

Cards on the map (the filter panel) receive a single `box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` to lift them off the map surface. The arrival drawer has a top border stroke, not a shadow, to delineate it from the page background. No floating tooltips, no stacked modals, no ambient glows.

### Shadow Vocabulary
- **Floating card** (`box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`): Filter panel on map only. No other surface uses this.

### Named Rules
**The Flat Default Rule.** Every surface starts at ground level. Shadow appears only when a UI element physically floats above the map. The arrival drawer is not floating — it slides from the bottom and uses a border, not a shadow.

## 5. Components

### Buttons
Functional and direct. No decorative border-radius extremes.

- **Shape:** Gently curved (8px radius / `rounded-md`)
- **Primary:** Lleida Blue background (`#2563eb`), white text, 36px height, 16px horizontal padding. Transitions to `oklch(0.48 0.22 263)` on hover over 150ms ease.
- **Focus:** 3px ring using `oklch(0.546 0.229 263 / 0.5)` — visible in sunlight without being aggressive.
- **Outline:** White background, ink border (1px `#eaeaea`), ink text. Hover reveals surface-raised background. Used for secondary map controls.
- **Ghost:** No border, no background. Ink text. Used for the refresh and close actions inside the arrival drawer. Muted-foreground color at rest.

### Route Filter Badges (Signature Component)
The horizontal scrollable list of line toggles above the map. Each badge shows a color swatch + line code. Selected state uses the default (filled) variant; unselected uses outline. Sorted with selected first.

- **Shape:** Gently curved (6px radius / `rounded-sm`)
- **Unselected:** Outline variant — border, white background, ink text
- **Selected:** Default variant — ink background (transitioning to Lleida Blue), white text
- **Line swatch:** 20×20px square with 4px radius inside the badge, always in the line's transit color

### Line Number Badges
Standalone line identifiers in the arrival drawer header and schedule rows.

- **Shape:** 32×32px square with 8px radius
- **Background:** Per-line transit color (from `LINE_COLORS` map)
- **Text:** White, 14px, weight 600
- **Usage:** Stop details header only and line rows. Never repurposed as interactive elements.

### Cards / Containers
- **Corner Style:** Generously curved (14px radius / `rounded-xl`)
- **Background:** White surface
- **Shadow:** Floating card shadow only when overlaid on the map
- **Border:** 1px border (`#eaeaea`) when not floating
- **Internal Padding:** 24px default

### Arrival Time Cards
Small dense tiles showing individual arrival times. The closest next arrival renders a live countdown timer; others show relative offset ("5 min").

- **Style:** Card container with reduced padding (8px), flex column, center-aligned
- **Typography:** Bold 14px for the time value, mono 12px for the clock time below
- **Closest indicator:** No additional visual treatment beyond the countdown timer — the live ticking is the signal

### Search Input
- **Style:** Standard input, 1px border (`#eaeaea`), white background, 8px radius
- **Focus:** Border shifts to Lleida Blue with 3px focus ring
- **Placeholder:** Ink Muted (`#696969`) — must pass 4.5:1 contrast

## 6. Do's and Don'ts

### Do:
- **Do** use Lleida Blue exclusively for interactive affordances: buttons, links, focus rings, and active chip states.
- **Do** keep body text in Ink (`#181818`) and target 5:1 contrast minimum for all text used outdoors. Ink Muted (`#696969`) is the floor for secondary text.
- **Do** use per-line transit colors only on line number badges and map pins — their role is categorical, not decorative.
- **Do** keep surfaces flat by default. Add the floating card shadow only when an element physically overlays the map.
- **Do** size tap targets to at minimum 44×44px for all interactive elements, given the outdoor mobile primary use context.
- **Do** use `text-wrap: balance` on stop name headings to prevent awkward two-word widows.

### Don't:
- **Don't** use government-style transit design: heavy institutional color blocks, all-caps headers, high-contrast bordered boxes that read as signage rather than UI.
- **Don't** introduce a second typeface. A serif display or a contrasting body font adds visual weight without serving legibility at the bus stop.
- **Don't** use Lleida Blue (`#2563eb`) decoratively — not as a section background, a highlight tint, a gradient, or a border stripe. One blue means "action"; two blues means "decoration."
- **Don't** reuse per-line transit colors for UI purposes unrelated to their line. Line 4's blue (`#1571FD`) is not a secondary accent; it is "Line 4."
- **Don't** add border-left stripes as colored accents on cards or list items. Never.
- **Don't** use identical card grids for arrival times. The auto-fill grid with varied content density is correct; a rigid 3-column of identical cards is not.
- **Don't** use placeholder text below 4.5:1 contrast. The default gray on white is illegal here.
- **Don't** add glassmorphism, gradient fills, or background-blur as visual decoration. The map behind the filter panel is enough visual complexity.
