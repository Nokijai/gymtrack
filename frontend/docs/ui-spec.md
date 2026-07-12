# UI Spec: GymTrack — Linear-Inspired Design System

## 1. Target Users
- Noki, Dennis, Cyrus — 3-person gym team tracking progress together
- Primarily desktop (1440px), secondary mobile (390px)

## 2. Primary Task
- Log workouts, view dashboard stats, track progress, check leaderboard

## 3. Visual Direction
- **Linear-inspired dark theme**: near-black backgrounds, ultra-thin borders, precise typography
- **Design keywords**: precise, minimal, dark, data-dense, athletic

## 4. Color System

### Backgrounds
- `--bg-base: #090a0b` — deepest canvas
- `--bg-surface: #0f1011` — panel/card background
- `--bg-elevated: #191a1b` — elevated surfaces, dropdowns, modals
- `--bg-hover: rgba(255,255,255,0.04)` — hover state

### Borders
- `--border: rgba(255,255,255,0.06)` — default
- `--border-accent: rgba(99,102,241,0.3)` — focused/active

### Text
- `--text: #f7f8f8` — primary (near-white, not pure white)
- `--text-secondary: #a0a5b0` — body, descriptions
- `--text-muted: #6b7080` — metadata, timestamps, placeholders

### Accent
- `--accent: #5e6ad2` — brand indigo (CTA buttons, active states)
- `--accent-hover: #7170ff` — hover
- `--accent-subtle: rgba(94,106,210,0.12)` — subtle bg for active nav items

### Status
- `--green: #22a645` — success, completed
- `--orange: #f59e0b` — warning, XP
- `--red: #ef4444` — destructive, sign out

## 5. Typography
- Font: Inter (system-ui fallback)
- Weights: 400 (body), 500 (emphasis), 600 (strong)
- Body: 14px/1.5
- Small: 13px/1.5
- Caption: 12px/1.4
- Heading: 16px/1.3 weight 600
- Title: 20px/1.3 weight 600

## 6. Spacing & Radius
- Base unit: 4px
- Container max-width: 960px (dashboard), 1200px (programs)
- Card radius: 8px
- Button radius: 6px
- Input radius: 6px
- Modal radius: 12px
- Pill radius: 9999px

## 7. Component Inventory
- Nav: sticky top bar with logo + route links + avatar right
- Cards: subtle border, 8px radius, no glow/gradient
- Buttons: ghost (default), primary (accent bg), subtle danger (red text)
- Inputs: elevated bg, subtle border, focus ring
- Modals: centered overlay, elevated bg, 12px radius
- Tabs: underline style, 14px weight 500
- Badges: small pill, 12px, muted text

## 8. Layout Rules
- Dashboard: max-w-3xl, centered single column
- Programs: max-w-5xl, grid of cards
- Login: centered card, max-w-sm
- Nav: h-12, border-bottom only
- Page padding: 24px top, 32px bottom

## 9. Prohibited
- No emoji in UI chrome (buttons, nav, headers)
- No gradients/glows on cards
- No glassmorphism
- No purple-blue default AI schemes
- No oversized hero headings
- No random decorative elements
- No bottom nav bar
- No `var(--bg)` — always use explicit tokens

## 10. Implementation Order
1. CSS variables + globals rewrite
2. Nav component overhaul
3. Login page polish
4. Dashboard page polish
5. Programs page polish
6. Other pages consistency pass