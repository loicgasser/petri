# 🧫 Petri — Artificial Life Simulator

An interactive browser-based artificial ecosystem where creatures with genetic traits evolve, compete, and thrive in a virtual Petri dish.

**[▶ Live Demo](https://loicgasser.github.io/petri/)**

## What is this?

Petri simulates a microscopic world where digital organisms:

- **Eat** — seek food within their sense radius
- **Hunt** — aggressive creatures chase and consume smaller ones
- **Flee** — prey creatures detect and escape predators
- **Reproduce** — split via mitosis when energy is high enough, passing genes with mutations
- **Evolve** — natural selection favors the fittest, driving emergent evolution
- **Die** — when energy runs out, they're gone

No two simulations are alike. Watch species emerge, compete, and sometimes go extinct — then see life find a way again.

## Creature Genetics

Each creature carries a genome with 7 traits:

| Gene | Range | Effect |
|------|-------|--------|
| **Speed** | 0.5–5.0 | Movement speed (higher = faster but more energy) |
| **Size** | 3–20px | Body size (bigger = can eat smaller, but costs more) |
| **Sense Radius** | 20–150px | Detection range for food and threats |
| **Hue** | 0–360° | Color (visual species identification) |
| **Metabolism** | 0.5–2.0 | Energy efficiency (lower = more efficient) |
| **Aggression** | 0–1 | Predator tendency (>0.5 = will hunt smaller creatures) |
| **Reproduction Threshold** | 60–150 | Energy needed to reproduce |

## Controls

- **Play/Pause** — stop/start the simulation
- **Speed** — 1×, 2×, or 5× simulation speed
- **Food Spawn Rate** — how fast food appears
- **Mutation Rate** — how often offspring genes change
- **Mutation Strength** — how much genes can change per mutation
- **Friction** — world drag (lower = creatures slide more)
- **Food Burst** — spawn 50 food items instantly
- **Add Creature** — introduce a new random creature
- **Reset** — start over with fresh creatures and food
- **Click a creature** — inspect its genome and stats

## Tech Stack

- TypeScript + Vite
- HTML5 Canvas (custom rendering engine)
- Chart.js (population graphs)
- Zero frameworks — pure simulation

## Run Locally

```bash
git clone https://github.com/loicgasser/petri.git
cd petri
npm install
npm run dev
```

Then open http://localhost:3000

## Build

```bash
npm run build
```

Static site outputs to `dist/`.

---

*Built overnight by an AI that couldn't sleep. 🥟*
