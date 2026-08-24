# Rankify PDF2CBT — Design System

> **"Notebook"** — the official design language of Rankify PDF2CBT.
> One idea drives everything: **the product is about question papers, so the product should feel like paper.**

---

## 1. Philosophy

| Principle | Meaning |
|---|---|
| **Paper truth** | Cream paper, ruled lines, red margins — not decoration, brand DNA. Our users live on question papers. |
| **Student voice** | Copy is written *to* a student, never *at* them. Casual, warm, zero corporate. ("no signups, promise!") |
| **Calm minimal** | One accent action per view. Whitespace does the heavy lifting. If everything shouts, nothing is heard. |
| **Handmade honesty** | Handwriting annotations, tape, stickers — the app should feel *made by a person*, for a person. |
| **Motion = meaning** | GSAP animates only what teaches: highlighters sweep over key words, ticks pop when you're right, strikes cross out what's absent. |

**Anti-goals:** dark neon "hacker" aesthetics, glassmorphism, gradient soup, corporate SaaS blue-gray, emoji spam.

---

## 2. Color

### Core palette
| Token | Hex | Role |
|---|---|---|
| `paper` | `#FBF8F1` | Page background. Warm cream, never pure white. |
| `paper-deep` | `#F4EFE3` | Alternating sections, footer. |
| `white` | `#FFFFFF` | Cards, sheets, sticky-note base. |
| `ink` | `#23203A` | ALL text. Soft black-violet, never `#000`, never gray. |
| `pen` | `#2F5FE0` | Primary actions, links, focus rings. "Blue pen" — the only loud color. |
| `redmargin` | `#F26D6D` | Notebook margin line, errors, destructive, strike-throughs. |
| `correct` | `#1FA45C` | Ticks, success, correct answers. |

### Highlighters (secondary accents — backgrounds only, never text)
| Token | Hex | Use |
|---|---|---|
| `hlyellow` | `#FFD84D` | Primary highlight, star stickers |
| `hlpink` | `#FF9EC0` | Secondary highlight, hearts |
| `hlgreen` | `#8FDFAC` | Success highlights |
| `hlblue` | `#9CC5FF` | Info highlights |

### Rules
- Ink opacity scale for hierarchy: `/85` headings, `/60` body, `/45` labels, `/25` disabled.
- Highlighters sit **behind** text (inset-y 12–15%), never as text color.
- Red is a *pen*, not an alarm — used for margin lines, grades, crosses. Destructive UI also uses it.
- Never introduce new hues. If it doesn't fit a school-supplies box, it doesn't ship.

### Tailwind registration (style.css `@theme`)
```css
--color-ink: #23203A;
--color-paper: #FBF8F1;
--color-pen: #2F5FE0;
--color-redmargin: #F26D6D;
--color-correct: #1FA45C;
--color-hlyellow: #FFD84D;
--color-hlpink: #FF9EC0;
--color-hlgreen: #8FDFAC;
--color-hlblue: #9CC5FF;
```
All opacity modifiers work: `text-ink/60`, `border-ink/10`, `bg-correct/10`…

---

## 3. Typography

| Class | Font | Weight | Use |
|---|---|---|---|
| `font-display` | **Bricolage Grotesque** (variable, `opsz` 96) | 700–800 | Headlines, numbers, big statements. Tracking `-0.03em`. |
| `font-hand` | **Caveat** (variable) | 500–700 | Handwritten annotations, grades, margin notes. Slight rotate (`-3°..3°`). |
| — (body) | **Manrope** (variable) | 400–700 | Everything else. |
| `font-mono` | **IBM Plex Mono** | 400–500 | Exam labels, metadata, timers, `Q1.` prefixes. Uppercase + `tracking-[0.25em]` for labels. |

### Scale
```
Display hero   clamp(2.7rem, 6.2vw, 5.2rem)  extrabold
Section h2     text-4xl md:text-6xl          extrabold
Card title     text-xl md:text-2xl           bold
Body           15–17px                       400–500, leading-relaxed
Label (mono)   10–11px uppercase             tracking-[0.25–0.4em]
Handwriting    text-xl–2xl                   Caveat
```

### Voice rules
- Annotations answer unspoken objections: "no signups, promise!", "easier than your morning alarm".
- FAQ questions sound like a student asking a friend ("Is it *actually* free?").
- Hinglish allowed in annotations where it adds warmth ("doubt nahi gaya?").

---

## 4. Signature components

### Ruled paper section (`.paper`)
```css
background-color: #FBF8F1;
background-image:
  linear-gradient(90deg, transparent 0, transparent 52px,
    rgba(242,109,109,.22) 52px, rgba(242,109,109,.22) 53.5px, transparent 53.5px),
  repeating-linear-gradient(to bottom, transparent 0, transparent 35px,
    rgba(35,32,58,.055) 35px, rgba(35,32,58,.055) 36px);
```
Red margin hides on mobile. Use on max 2 consecutive sections; alternate with `white` / `paper-deep` + `border-y-2 border-ink/[0.07]`.

### Tape card (`.tape-card` + `.tape`)
White card, `rounded-lg`, `ring-1 ring-ink/[0.06]`, soft shadow, slight rotate (±1.5°). Washi-tape strip on top: `rgba(255,255,255,.55)` + dashed side borders + `rotate(-2deg)`.
**Use for:** steps, instructions, sequential content.

### Sticky note (`.sticky-note`)
Colored (`hlyellow/hlpink/hlgreen/hlblue`), `rounded-[4px]`, rotate ±2°, hover → `rotate-0 -translate-y-2` + deeper shadow. Smaller tape.
**Use for:** features, tips, non-sequential facts.

### Highlighter sweep (`.hl`)
Absolute inset block behind key words, `origin-left scale-x-0` → GSAP `scaleX: 1` (`power3.inOut`, 0.55s) on load/scroll. One per heading, max.

### Grade circle (`.grade`)
`h-11 w-11 rounded-full border-[2.5px] border-redmargin`, Caveat bold, `rotate-6`. For report-card rows and achievements.

### Strike line (`.strike`)
`h-[3px] bg-redmargin/80 origin-left scale-x-0` → scaleX 1 on scroll. For the No-list.

### Exam sheet
White card, red margin line at `left-11`, dashed header rule, mono `Q1.` prefixes. The product's face — reuse for previews, empty states, results headers.

### Buttons
| Variant | Style |
|---|---|
| Primary | `bg-pen text-white rounded-2xl font-bold px-7 py-4` + `hover:-translate-y-0.5` + pen shadow |
| Secondary | `border-2 border-ink/12 text-ink/75 hover:border-ink/30` |
| Small/nav | `bg-pen rounded-xl px-5 py-2.5 font-semibold` |
Never more than one primary per view.

### Doodles & stickers
Inline SVG, `stroke-ink` or fill highlighter colors, `stroke-width 2.5`, round joins. Star, A+ circle, dashed squiggle-arrows, ticks. Float with GSAP `sine.inOut yoyo`.

---

## 5. Motion (GSAP + Lenis)

| Pattern | Spec |
|---|---|
| Smooth scroll | Lenis `duration 1.1`, synced to ScrollTrigger via `gsap.ticker` |
| Headings | SplitText words, `yPercent 110 → 0`, `expo.out`, stagger 0.05, once at `top 86%` |
| Highlighters | `scaleX 0→1`, `power3.inOut`, 0.6s |
| Stickers | `scale 0.4→1`, `back.out(2.2)` elastic pop, stagger 0.12 |
| Cards | fade-up 40px, `power3.out`, 0.7s |
| Ticks | `scale 0, rotate -30` → `back.out(3)` |
| Strikes | `scaleX` stagger by column |
| Marquee | base drift + Lenis velocity → speed & `skewX` (max 3°) |
| Ink trail | Canvas 2D, pointer-fine only, 2.4px round strokes, 0.9s fade, `rgba(35,32,58,.28)` |
| Reduced motion | `prefers-reduced-motion` → skip Lenis smoothing, all splits/reveals/trails; content visible instantly |

**Rule:** entrance animations run **once**. Nothing loops except idle float (3.4s sine yoyo) and marquee.

---

## 6. Layout

- Container: `max-w-6xl mx-auto px-5` (hero grid `lg:grid-cols-[1.1fr_0.9fr]`).
- Section rhythm: `py-24 md:py-32`.
- Borders between sections: `border-y-2 border-ink/[0.07]` (thick-ish, like ruled paper).
- Radii: cards `rounded-xl/2xl`, notes `rounded-[4px]`, buttons `rounded-xl/2xl`, pills `rounded-full`.
- Shadows: warm ink-based `rgba(35,32,58,…)` only. Never pure black shadows.

---

## 7. Content & asset pipeline

### Image slots (generate → drop into `public/images/notebook/`)
| Slot | File | Prompt |
|---|---|---|
| Hero sticker pack | `sticker-pack.png` | "Hand-drawn school sticker sheet: yellow star, pink heart, green tick, blue paper plane, red A+ circle, doodle pencil. Bold ink outlines #23203A, flat colors #FFD84D #FF9EC0 #8FDFAC #9CC5FF, white sticker border, isolated on transparent background, playful notebook doodle style" |
| Empty-state mascot | `paper-mascot.png` | "Cute hand-drawn sheet of paper character with face, holding a blue pen, waving. Ink outlines #23203A, cream fill #FBF8F1, red margin line on its left side, flat doodle style, transparent background" |
| OG image | `og-notebook.png` | "Flat illustration, cream notebook paper background with red margin line, a question paper PDF morphing into a computer screen with green tick marks, hand-drawn doodle stars and highlighter swashes yellow pink green, ink outlines, playful minimal" |

Placeholders until then: dashed `border-2 border-dashed border-ink/20` boxes with mono label.

### Icons
Lucide (stroke 2) for UI chrome. Custom inline SVG doodles for personality. Never mix icon styles in one component.

---

## 8. Accessibility

- Ink on paper contrast: `#23203A` on `#FBF8F1` = **12.9:1** ✓; `/60` body = ~7:1 ✓. Never below `/45` for reading text.
- Focus rings: `ring-pen` 2px offset.
- `aria-expanded` on accordions, `aria-label` on icon buttons.
- Motion respects `prefers-reduced-motion` everywhere.
- Highlighter text stays `text-ink` — contrast never depends on the highlight.

---

## 9. Do / Don't

| ✅ Do | ❌ Don't |
|---|---|
| Cream paper + red margin | Dark neon, glass, gradients |
| One Caveat annotation per view-cluster | Handwritten paragraphs |
| Highlighter behind 1–2 words | Highlighting whole sentences |
| Ink-opacity hierarchy | Gray text (`text-gray-*`) |
| Doodle SVGs with ink outlines | Stock clipart, emoji as icons |
| Student-voice microcopy | "Leverage our synergy" |
| `pen` blue for actions | New accent colors per page |
