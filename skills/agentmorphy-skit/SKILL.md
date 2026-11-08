---
name: agentmorphy-skit
description: 20-Rule Production Standard for @agentmorphy-Style Short-Form 9:16 3D Developer Skits Starring Nemo (AI Coding Agent) and Leo (Vibe Coder).
---

# @agentmorphy 3D Skit Production Standard (Nemo & Leo Edition)

This skill defines the 20 mandatory production rules for generating viral short-form 9:16 vertical 3D character animation skits inspired by `@agentmorphy`, starring **Nemo** (Autonomous AI Coding Agent) and **Leo** (Full-Stack Vibe Coder).

## 1. Cast & Visual Identity
1. **Nemo (`char-nemo`, `robot-companion`)**: Sleek expressive 3D AI Coding Agent companion with curved obsidian glass visor, glowing cyan LED ocular eyes, expressive LED brow bars, articulated glowing viseme mouth bar, acoustic ear pods, and floating harmonic halo ring.
2. **Leo (`char-leo`, `scholar-humanoid`)**: 20-year-old developer / vibe coder in an indigo hoodie jacket, sculpted layered hair with swept front fringe, studio headphones resting around his neck, jeans, and sneakers.
3. **True 3D Geometry Only**: Both characters and the war-room set must be rendered as real 3D geometry in Three.js (`StageScene3D`) and Blender (`scripts/blender/build_scene.py`). Never substitute 2D cutouts or SVG illustrations.
4. **3/4 Mutual Staging**: In two-shots, stage Nemo (`X = -0.62`) and Leo (`X = +0.62`) angled 3/4 toward both the camera and each other so both faces, eyes, and hand gestures read clearly inside a 9:16 vertical frame.

## 2. Environment & Set Dressing (`agent-command-desk`)
5. **The Coding War Room**: Anchor developer skits in `"agent-command-desk"` featuring the obsidian studio floor, glowing neon telemetry rings, rear developer command desk, RGB mechanical keyboard, and espresso mug.
6. **Dual Ultrawide Code Monitors**: Frame the angled 3D ultrawide monitors behind Nemo and Leo with glowing syntax-highlighted 3D code bars and crimson/amber usage alert bars.
7. **Floating 3D Token Usage Hologram**: Maintain the rotating 3D holographic rings and octahedron AI core in the upper-center midground between Nemo and Leo (`Y = 2.38m`) to fill vertical 9:16 headroom with depth.
8. **Background Server Monoliths**: Populate the background depth plane (`Z = -3.3m`) with server rack towers and animated LED status arrays for strong foreground/midground/background parallax.

## 3. Pacing, Camera Choreography & Acting
9. **3-Act 10-Second Vertical Skit Structure**:
   - **Shot 1 (0.0s–3.3s, Hook / Crisis)**: `"establishing-wide"` — Introduce the relatable dev crisis immediately (e.g., hitting the 98% usage limit, Friday 4:59 PM force push, or asking to center a div).
   - **Shot 2 (3.3s–6.7s, Escalation / Agent Overdrive)**: `"crash-zoom"` — Fast focal push onto Nemo taking over the terminal or spawning a sub-agent swarm.
   - **Shot 3 (6.7s–10.0s, Punchline / Payoff)**: `"shot-reverse-shot"` — Dynamic OTS lateral sweep as tests turn green and Leo reacts in disbelief.
10. **Zero Static Shots**: Every shot must have deliberate camera translation and look-at target interpolation driven deterministically by frame index.
11. **Expressive Developer Actions**: Use `"type-code"` (rapid alternating forearm typing), `"panic-react"` (hands raised by head + rapid head shake), `"gesture"` (open phrasing arcs), and `"celebrate"` (double-arm victory bounce).
12. **Active Listener Reactions**: When Nemo speaks, Leo must actively look at Nemo, nod, and react with eyebrows; when Leo speaks, Nemo's LED visor eyes and head track Leo.

## 4. Audio, Lip-Sync & Viral Reels Captions
13. **Phoneme-to-Viseme Lip-Sync**: Drive jaw drop, mouth width, and brow raise deterministically from the dialogue phoneme envelope (`dialogueLipSync` in Three.js and `VISEME_TARGETS` in Blender).
14. **Distinct Character Voices**: Pair Leo with an energetic young-adult male voice (`leo`, speed `1.18x`) and Nemo with a crisp, witty AI companion voice (`nemo`, speed `1.18x`).
15. **Top Status Callout Banner (`statusBadgeText`)**: Every shot in a viral skit must display a concise top-center status badge (e.g., `⚠️ CLAUDE / CODEX USAGE: 98%`, `⚡ SPAWNING 12 PARALLEL SUB-AGENTS`, `🚀 42/42 TESTS GREEN // SHIPPED TO MAIN`).
16. **Word-by-Word Kinetic Reels Captions (`captionStyle: "viral-reels"`)**: Highlight the currently spoken word in real time with a high-contrast pill pop (`#0891B2` for Nemo, `#D97706` for Leo) and speaker role header (`NEMO // AI CODING AGENT` vs `LEO // VIBE CODER`).

## 5. Deterministic Verification & Export Integrity
17. **Frame-Deterministic Math**: All camera paths, joint rotations, code-bar scrolling, and word highlights must be pure functions of `frame` and `fps`.
18. **9:16 Safe Frustum**: Keep both characters within `X ∈ [-0.70, +0.70]` so neither character is clipped on mobile 9:16 screens.
19. **Four-Keyframe Contact Sheet Audit**: Verify Shot 1, Shot 2, Shot 3, and Final Frame renders for non-blank framing, visible lighting, and zero mesh intersections.
20. **Real MP4 Multiplexing**: Final deliverables must be encoded to playable H.264 + AAC `.mp4` with synchronized dialogue audio.
