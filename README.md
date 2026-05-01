# OpenPane

A Chrome extension that gives you full visibility and control over Claude's context window — live token counts, semantic block structure, priority controls, and (planned) active context reconstruction.

---

## Overview

Claude's context window is a black box. OpenPane cracks it open. It injects a collapsible sidebar into `claude.ai` that reads every turn of the conversation, groups turns into semantically coherent chunks using on-device embeddings, and lets you pin, drop, and prioritize those chunks to shape what actually reaches Claude on your next message.

---

## Architecture

```
chrome extension (MV3)
├── content.js          — Shadow DOM sidebar injected into claude.ai
├── embed-worker.js     — Web worker running transformers.js (all-MiniLM-L6-v2)
├── background.js       — Service worker (storage init; context reconstruction planned)
├── popup.{html,js}     — Extension popup: token stats + sidebar toggle
└── manifest.json
```

**Data flow (current):**

```
DOM mutation → scrapeDOM() → estimateTokens()
                           → requestEmbeddings() → Worker (ONNX inference)
                                                 → cosineSim() → recomputeChunks()
                                                               → render()
```

The sidebar lives in a Shadow DOM root attached to a zero-size host element so it never conflicts with claude.ai's own styles or layout. Page body margin adjusts via a separate injected `<style>` tag (`margin-right: 320px`) coordinated with the `openpane-open` class on `<html>`.

---

## Implemented Features

### Blocks View

The primary view. Every semantic chunk of the conversation is rendered as a stacked card in document order.

- **Block types:** `system`, `conversation`, `memory`, `tool-results`, `tools`, `docs` — each with a distinct icon
- **Per-block token estimate** — `length / 4` heuristic, displayed in a monospace badge
- **Content preview** — first 180 characters of block text, two-line clamp
- **Pinned / dropped state** — pinned blocks render with accent border and background; dropped blocks render at 45% opacity and are grouped below a collapsible toggle
- **Overrides persist** across page refreshes via `chrome.storage.local`

### Semantic Chunking

Adjacent conversation turns are embedded on-device and grouped by cosine similarity.

- **Model:** `Xenova/all-MiniLM-L6-v2` running in a Web Worker via `transformers.js` (ONNX Runtime Web, WebAssembly backend). Embeddings are L2-normalised so dot product equals cosine similarity.
- **Worker loading:** Content scripts can't construct `Worker(chrome-extension://…)` directly due to same-origin restrictions. The worker script is fetched via `chrome.runtime.getURL`, converted to a `blob:` URL, then the URL is immediately revoked after `new Worker()` to avoid leaks.
- **Incremental embedding:** Only newly appended messages are sent to the worker; existing embeddings are cached in `state.embedCache` by message ID and reused across re-renders.
- **Threshold mapping:** Slider position maps linearly to a cosine similarity threshold in `[0.20, 0.85]`. Turns with similarity below threshold become a new chunk boundary.
- **Fallback:** While the model loads (or if it fails), each message is shown as its own block with recency-based priority (`high` for last 2 turns, `medium` for last 6, `low` for the rest).
- **Model status indicator:** Displays `Loading…` / `Semantic chunking active` / `Model unavailable — showing per-turn` below the slider.

### Granularity Slider

Controls `state.threshold` — the cosine similarity cutoff for chunk boundaries.

| Slider position | Threshold | Effect |
|---|---|---|
| Far left (Fine) | ~0.85 | Nearly every turn is its own chunk |
| Center | ~0.525 | Default: natural topic groups |
| Far right (Coarse) | ~0.20 | Whole conversation collapses into a few large chunks |

### Block Controls

Each block has three interactive controls:

**Priority dots** — Three colour-coded pips: red (high), amber (medium), slate (low). Clicking a pip sets that block's priority level. The active pip fills with its colour; inactive pips are outlined. Priority label updates in sync.

**Pin** — Floats a block to the top of the active section regardless of drag order. Pinned blocks render with an indigo border and accent background. Clicking again unpins.

**Drop** — Marks a block as excluded. Dropped blocks are removed from the active token sum and hidden behind a collapsible "Show N dropped blocks" row. Clicking the trash icon again restores the block.

### Drag to Reorder

Every block card is `draggable`. The drag handle (six-dot grid icon) provides a grab target. Dragging a block over another highlights the target with an accent ring; dropping reorders `state.blocks` in-place.

Current limitation: the drop target is a block itself. A dedicated trash/remove drop zone is planned (see Roadmap).

### Token Budget

- **Per-block:** Token count badge on every card, formatted as `1.2k` above 999.
- **Total:** Live aggregate in the header badge, updated on every render.
- The count only sums `activeBlocks()` (dropped blocks are excluded), so dropping a block immediately reduces the total.

No colour-state budget bar yet — that's on the roadmap.

### Popup

The extension action popup queries the active tab's content script for current stats and shows:

- Total tokens in active blocks
- Block count
- Model name (stripped of `claude-` prefix and date suffix)
- Last-updated timestamp
- Toggle Sidebar button (sends `toggle-sidebar` message to content script)
- Open claude.ai button

### SPA Navigation

`claude.ai` is a single-page app. A `MutationObserver` watches `document.body` for URL changes (`location.href` diff). On navigation:

1. All conversation state is reset (`blocks`, `allMessages`, `embedCache`, `model`).
2. The sidebar is re-injected if the host element was removed; otherwise an empty-state render is triggered immediately.
3. A 1.5 s debounced scrape fires once the new page's DOM has settled.

---

## Planned Features

### Map View

A force-directed layout where each chunk is rendered as an orb. Node size scales with token count; colour encodes block type. The orb graph gives a spatial overview of context weight distribution — useful for spotting which topic clusters dominate the window.

Implementation path: D3 force simulation inside a `<canvas>` element rendered in the sidebar, toggled from a view-switcher tab in the header.

### Drop Zone

A dedicated trash region at the bottom of the block list. Dragging a block onto it marks the block as dropped without requiring a click on the drop button. Provides faster pruning when the context is long.

### Token Budget Bar

A horizontal progress bar in the header below the total-token badge with three colour states:

| Fill | Threshold |
|---|---|
| Green | < 70% of model max |
| Amber | 70–90% |
| Red | > 90% |

The bar updates in real time as blocks are dropped, restored, or reordered. Max token values will be keyed to the detected model string.

### Context Reconstruction

The highest-impact planned feature. The service worker will register a `fetch` event listener for requests to `api.anthropic.com`. Before forwarding each request, it will:

1. Parse the outgoing `messages` array from the request body.
2. Apply the current block state: dropped blocks are removed, priority sets ordering (high-priority blocks near the front and end; low-priority blocks buried in the middle or omitted if over budget).
3. Rebuild the `messages` array and forward the modified request.

This closes the loop: OpenPane will not only visualise the context window but actively reshape it on every message.

**Priority → position mapping (planned):**

| Priority | Placement |
|---|---|
| High | Anchored near the top and tail of the messages array |
| Medium | Middle region, unmodified order |
| Low | Compressed toward the centre or dropped if over budget |

### Skills / Presets

Save and restore named snapshots of block state (which blocks are pinned, dropped, and at what priority).

- **Save preset:** names the current overrides object and writes it to `chrome.storage.sync`
- **Load preset:** replaces `state.overrides` and re-renders all blocks
- **Sync:** `chrome.storage.sync` means presets follow the user across Chrome profiles and signed-in devices
- **UI:** Dropdown in the sidebar footer; save button opens an inline text input for the preset name

### Manual Chunk Creation

Select text in a claude.ai message, right-click (or use a floating toolbar), name the selection, assign a priority, and it becomes a named block in the sidebar. Useful for extracting a critical decision buried in a long assistant turn and elevating it independently.

Implementation requires injecting a selection-aware floating toolbar into the host page and mapping text ranges back to DOM positions.

### Transparency Layer

The sidebar will expose context that Anthropic injects outside the conversation turns:

- **System prompt block** — read-only card showing the current system prompt (sourced from the API request body via the fetch interceptor). Marked with a lock icon and distinct border.
- **Claude memory blocks** — injected memories from Anthropic's memory feature rendered as individual blocks, flagged as Anthropic-controlled. Users can see them but not drop them.

Clear visual distinction between user-controllable blocks and Anthropic-injected ones.

---

## Design System

| Token | Value |
|---|---|
| Primary font | DM Sans (400, 500, 600; optical size 9–40) |
| Monospace font | JetBrains Mono 400 (token counts, model badge) |
| Accent | `#6366f1` (indigo-500) |
| High priority | `#ef4444` (red-500) |
| Medium priority | `#f59e0b` (amber-400) |
| Low priority | `#94a3b8` (slate-400) |
| Surface | `#f8fafc` |
| Border | `#e2e8f0` |
| Sidebar width | 320px |
| Body offset | `margin-right: 320px` injected via `<style>` |
| Z-index | `2147483647` (max) |
| Transition | `0.18s cubic-bezier(0.4, 0, 0.2, 1)` |

Aesthetic references: Figma, Linear — flat, minimal, no decorative gradients.

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persist sidebar collapsed state, block overrides, and (planned) presets |
| `activeTab` | Read the active tab URL to determine if on claude.ai |
| `https://claude.ai/*` | Inject content script and sidebar |
| `https://*.huggingface.co/*` | Download embedding model weights for transformers.js |
| `https://cdn.jsdelivr.net/*` | Alternative model CDN (transformers.js fallback) |

---

## Development

```bash
npm install          # install build deps
node build.js        # bundle embed-worker.js (transformers.js + ONNX)
```

Load the extension in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select this directory.

After any change to `content.js`, `popup.js`, or `background.js`, click the reload icon in `chrome://extensions`. Changes to `embed-worker.js` require re-running `node build.js` first.

---

## Roadmap

| Feature | Status |
|---|---|
| Blocks view + drag/priority/pin/drop | Done |
| Semantic chunking (transformers.js, cosine sim) | Done |
| Granularity slider | Done |
| Popup stats | Done |
| SPA navigation handling | Done |
| Token budget bar (green/amber/red) | Planned |
| Drop-zone drag target | Planned |
| Map view (force-directed orb layout) | Planned |
| Context reconstruction (fetch intercept) | Planned |
| Transparency layer (system prompt, memories) | Planned |
| Skills / presets (chrome.storage.sync) | Planned |
| Manual chunk creation (text selection) | Planned |
