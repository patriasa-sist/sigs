# SIGS Design System — "Petrol Corporate"

> A modern, refined, corporate, low-fatigue design language for an insurance management platform
> used 8+ hours daily by professionals aged 50+.

---

## 1. Design Principles

| Principle                 | Rule                                                                                                                                                     | Why                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Low-fatigue surfaces**  | Never use pure white (`#FFF`) as page background. Use a tinted off-white. Cards are near-white for subtle elevation.                                     | Reduces glare on long work sessions. The brain perceives depth without hard shadows.                                          |
| **Controlled contrast**   | Body text is dark slate (`~#1E293B`), not black. Muted text is medium slate (`~#64748B`).                                                                | WCAG AA compliant but avoids the harshness of `#000` on `#FFF`.                                                               |
| **Monochromatic accents** | Primary actions use **Petrol Teal** (`#004F69`). Success/positive states use **Teal** (`#0D9488`). These are the only two "branded" colors.              | A two-hue identity reads as intentional, not chaotic. Every other color is utilitarian.                                       |
| **Muted status palette**  | Status badges use desaturated pastels — never bright/neon backgrounds. Text inside badges is the darkest shade of the same hue.                          | Bright pills on white backgrounds create visual noise that accumulates over 8 hours.                                          |
| **No decorative pills**   | `rounded-full` is reserved for avatars and tiny dot indicators. All other elements use `rounded-lg` (cards) or `rounded-md` (badges, buttons, inputs).   | Pills draw attention. In a data-dense app, only the data should draw attention.                                               |
| **Consistent elevation**  | Three surface levels only: page → card → popover. Differentiated by background shade + optional subtle shadow. No colored card backgrounds for sections. | The rainbow module-cards pattern (blue for clients, green for policies...) creates visual overload. Use icon + label instead. |
| **Uniform spacing scale** | Use Tailwind's 4px grid: `gap-3` (12px), `gap-4` (16px), `gap-6` (24px). Card padding is always `p-5` or `p-6`.                                          | Consistent rhythm reduces cognitive load.                                                                                     |

---

## 2. Color System

### 2.1 Core Palette

```
ROLE              HEX        OKLCH (for globals.css)           USAGE
─────────────────────────────────────────────────────────────────────────────
Background        #F1F4F9    oklch(0.965 0.005 260)            Page background
Card / Surface    #FAFBFD    oklch(0.988 0.003 260)            Cards, panels, modals
Foreground        #1E293B    oklch(0.27 0.03 265)              Primary text
Muted FG          #64748B    oklch(0.555 0.025 260)            Secondary text, labels
Subtle FG         #94A3B8    oklch(0.695 0.015 260)            Timestamps, metadata, placeholders

Primary           #004F69    oklch(0.37 0.065 225)             CTAs, active nav, links
Primary FG        #F0F9FF    oklch(0.975 0.01 225)             Text on primary bg

Secondary BG      #EDF0F5    oklch(0.950 0.006 260)            Subtle backgrounds, hover states
Secondary FG      #475569    oklch(0.446 0.022 260)            Secondary button text

Accent            #0D9488    oklch(0.575 0.1 175)              Success, positive, active badges
Accent BG         #EEFBFA    oklch(0.965 0.02 180)             Light teal tint surfaces

Destructive       #DC2626    oklch(0.55 0.2 25)                Errors, delete actions
Warning           #D97706    oklch(0.65 0.16 70)               Pending, attention
Info              #2563EB    oklch(0.52 0.14 260)              Informational, links

Border            #E2E8F0    oklch(0.925 0.008 260)            Card/section borders
Input Border      #CBD5E1    oklch(0.875 0.012 260)            Form input borders
Ring              primary/35%                                   Focus outlines
```

### 2.2 Status Badge Colors

Every status uses a **3-color tuple**: background, text, border.
All backgrounds are pastel (L ≥ 0.92). All text is the darkest shade of the same hue (L ≤ 0.40).

```
STATUS        BG               TEXT             BORDER           SEMANTIC
──────────────────────────────────────────────────────────────────────────
pendiente     amber-50  #FFFBEB  amber-800 #92400E  amber-200 #FDE68A    ⏳ Awaiting action
activa        teal-50   #F0FDFA  teal-800  #115E59  teal-200  #99F6E4    ✓  Active/approved
vencida       rose-50   #FFF1F2  rose-800  #9F1239  rose-200  #FECDD3    ✗  Expired
cancelada     slate-100 #F1F5F9  slate-600 #475569  slate-200 #E2E8F0    —  Neutral/cancelled
renovada      sky-50    #F0F9FF  sky-800   #075985  sky-200   #BAE6FD    ↻  Renewed
anulada       red-50    #FEF2F2  red-800   #991B1B  red-200   #FECACA    ✗  Voided
rechazada     orange-50 #FFF7ED  orange-800#9A3412  orange-200#FED7AA    ✗  Rejected
```

### 2.3 Chart Colors

For Recharts dashboards. Five distinguishable, muted hues:

```
Chart 1   Petrol Teal    oklch(0.37 0.065 225)   — Primary metric
Chart 2   Teal           oklch(0.575 0.098 175)  — Secondary metric
Chart 3   Warm Amber     oklch(0.70 0.11 80)     — Tertiary metric
Chart 4   Soft Coral     oklch(0.62 0.12 25)     — Quaternary metric
Chart 5   Muted Indigo   oklch(0.55 0.08 280)    — Quinary metric
```

---

## 3. Typography

### Font Stack

**Keep Geist Sans.** It's optimized for interfaces, has excellent readability at small sizes,
and renders well on Windows (the primary platform for this userbase).

### Scale

| Token       | Size | Weight  | Line-height | Usage                                    |
| ----------- | ---- | ------- | ----------- | ---------------------------------------- |
| `text-xs`   | 12px | 400     | 1.5         | Timestamps, metadata, table footnotes    |
| `text-sm`   | 14px | 400–500 | 1.5         | Table cells, form labels, secondary text |
| `text-base` | 16px | 400     | 1.6         | Body text, form inputs                   |
| `text-lg`   | 18px | 500     | 1.5         | Section headings inside cards            |
| `text-xl`   | 20px | 600     | 1.4         | Page section titles                      |
| `text-2xl`  | 24px | 600     | 1.3         | Page titles                              |

### Rules

- **Minimum readable size**: `text-sm` (14px). Never use smaller for content a user needs to read.
- **Bold sparingly**: Only for headings and key data points. Avoid `font-bold` on regular text.
- **Text color hierarchy**: `text-foreground` → `text-muted-foreground` → `text-subtle` (3 levels max).

---

## 4. Spacing & Layout

### Spacing Scale (used consistently)

```
4px   → gap-1, p-1        Tight: icon-to-text spacing
8px   → gap-2, p-2        Compact: badge padding, inline spacing
12px  → gap-3, p-3        Standard: between related items
16px  → gap-4, p-4        Default: card content padding (compact cards)
20px  → gap-5, p-5        Comfortable: card content padding (standard)
24px  → gap-6, p-6        Spacious: section spacing, large card padding
32px  → gap-8, p-8        Section separation
```

### Page Layout

```
Page Container:  max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Page Top:        pt-6 pb-8  (breathing room from navbar)
Section Gap:     space-y-6  (between major sections)
Card Padding:    p-5 or p-6 (ALWAYS consistent within a view)
```

### Card Rules

- **Always** use the `<Card>` component. Never use bare `<div className="rounded-lg border ...">`.
- Card background is always `bg-card`. Never use colored card backgrounds (no `bg-blue-50`, etc.).
- Use `shadow-sm` for standard cards, `shadow-md` for popovers/dropdowns.
- **No double borders**: if a card has a border, its children don't add their own.

---

## 5. Component Patterns

### 5.1 Buttons

| Variant       | Visual                                   | When to use                                     |
| ------------- | ---------------------------------------- | ----------------------------------------------- |
| `default`     | Petrol teal bg, white text               | Primary action per section (1 per view ideally) |
| `secondary`   | Light slate bg, slate text               | Secondary actions, filters, cancel              |
| `outline`     | Transparent bg, slate border, slate text | Tertiary actions, less emphasis                 |
| `ghost`       | No bg, slate text                        | Toolbar actions, icon buttons                   |
| `destructive` | Muted red bg, white text                 | Delete, cancel (destructive)                    |
| `link`        | No bg, primary text, underline           | Inline text links                               |

**Rules:**

- Max 1 `default` (primary) button per logical section.
- Group related actions: primary on the right, secondary/cancel on the left.
- Icon buttons use `size="icon"` variant. Include `aria-label`.
- Button radius: `rounded-md` (NOT `rounded-full`).

### 5.2 Badges

| Variant     | Visual                          | When to use                    |
| ----------- | ------------------------------- | ------------------------------ |
| `default`   | Primary bg, white text          | Active selection, current tab  |
| `secondary` | Light slate bg, slate text      | Counts, tags, metadata         |
| `outline`   | Transparent, border, slate text | Neutral labels                 |
| `status-*`  | Pastel bg, dark text (per §2.2) | Policy/annex status indicators |

**Rules:**

- Badge radius: `rounded-md` (NOT `rounded-full` — no pills).
- Status badges must use the centralized `<StatusBadge>` component (to be created).
- Never hard-code status colors inline. Always reference the status map.

### 5.3 Forms

- Label: `text-sm font-medium text-foreground` — always above the input, never floating.
- Input: `bg-card border-input rounded-md` — card-white background on the gray page.
- Helper text: `text-xs text-muted-foreground` below input.
- Error text: `text-xs text-destructive` below input.
- Focus ring: `ring-2 ring-ring` (primary at 35% opacity).
- Input height: `h-10` (40px) for comfortable click targets.

### 5.4 Tables

- Header: `bg-secondary text-secondary-foreground text-sm font-medium`
- Rows: `bg-card` with `hover:bg-muted/50` for hover state.
- Borders: horizontal only (`border-b border-border`), no vertical lines.
- Cell padding: `px-4 py-3` for comfortable reading.
- **Zebra striping: OFF.** The low-contrast hover is sufficient. Zebra adds visual noise.

### 5.5 Navigation (Navbar)

- Background: `bg-card border-b border-border` (white strip on gray page).
- Active link: `text-primary font-medium` with subtle `bg-primary/8` background.
- Inactive link: `text-muted-foreground hover:text-foreground`.
- Height: `h-14` (56px).
- Logo area uses the petrol teal brand color.

### 5.6 Module Cards (Home Page)

**Current problem**: Each module has a different colored background (blue, green, orange, purple, red...).

**New approach**:

- All module cards use `bg-card` (white).
- Each module has a **small icon** in the petrol teal or accent teal color.
- Differentiation via icon + label, NOT via background color.
- Hover: `hover:shadow-md hover:border-primary/20` (subtle teal tint on border).
- This creates a calm, uniform grid instead of a rainbow.

---

## 6. Shadow System

```
shadow-none    → Flat elements (badges, within cards)
shadow-sm      → Cards, panels (default)
shadow-md      → Dropdowns, popovers, modals (elevated)
shadow-lg      → Never used (too dramatic for corporate)
```

Shadow color should be slightly tinted toward slate, not pure black:

```css
--tw-shadow-color: oklch(0.27 0.03 265 / 0.06);
```

---

## 7. Iconography

- **Library**: Lucide React (already configured).
- **Size**: `16px` (`w-4 h-4`) in buttons/badges, `20px` (`w-5 h-5`) in navigation, `24px` (`w-6 h-6`) in headers/empty states.
- **Color**: `text-muted-foreground` by default. `text-primary` for active/branded contexts.
- **Stroke**: Default (2px). Never change stroke width for consistency.

---

## 8. Implementation Roadmap

### Phase 1: Foundation (this step)

- [x] Define design system document
- [x] Update `globals.css` with new color palette
- [x] User validates palette visually

### Phase 2: Core Components

- [x] Create `<StatusBadge>` component with centralized status-color mapping (`components/ui/status-badge.tsx`)
- [x] Update `<Card>` usage — replace bare `div` in `GerenciaDashboard.tsx`
- [x] Standardize button usage — no violations found across main modules
- [x] Standardize form input styles — `input.tsx`: `h-9→h-10`, `bg-transparent→bg-card`

> **Remaining**: 7 files still use inline status colors (PolicyCard, PolicyTable, AnexoDetalleSection,
> AnexosPendientesTable, SiniestrosTable, ExportarSiniestros, polizas/[id]/page.tsx). Migrate to
> `<StatusBadge>` as each module is touched in Phase 3.

### Phase 3: Page-by-page Redesign

- [x] Home page (module grid)

- [x] Navbar
- [x] Polizas listing

- [x] Polizas modals
- [x] Nueva Poliza form

- [x] Clientes listing
- [x] Clientes modal
- [x] New client form

- [x] Gerencia 3 dashboards
- [x] Gerencia reportes
- [x] Gerencia nuevas metricas

- [x] Cobranzas listing
- [x] Cobranzas modals
- [x] Cobranzas payment modals

- [x] Gerencia validacion

- [x] Siniestros listing
- [x] Siniestros modals
- [x] New siniestros form

- [x] Login
- [x] Register

- [ ] Administración

### Phase 4: Polish

- [ ] Subtle hover/focus transitions (`transition-colors duration-150`)
- [ ] Loading skeletons match new palette
- [ ] Toast/notification styling
- [ ] Print styles for PDFs

---

## 9. Anti-patterns (DO NOT)

| Don't                                      | Do instead                                               |
| ------------------------------------------ | -------------------------------------------------------- |
| `bg-blue-50`, `bg-green-50` etc. for cards | `bg-card` for all cards, differentiate with icons        |
| `rounded-full` on badges/buttons           | `rounded-md`                                             |
| `text-black` or `text-gray-900`            | `text-foreground`                                        |
| `border-gray-200`                          | `border-border`                                          |
| Hard-coded status colors inline            | `<StatusBadge status={...}>` component                   |
| `shadow-lg` or `shadow-xl`                 | `shadow-sm` (cards) or `shadow-md` (popovers)            |
| `font-bold` on regular body text           | `font-medium` for emphasis, `font-semibold` for headings |
| Neon/bright accent colors                  | Muted pastels from the status palette                    |
| More than 3 text color levels              | `foreground` → `muted-foreground` → (rarely) `subtle`    |
