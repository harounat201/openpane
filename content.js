/**
 * content.js — OpenPane sidebar injected into claude.ai.
 * Creates a Shadow DOM sidebar that visualises the context window
 * intercepted by injected.js.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const OP_ID = 'openpane-host';

const SVG = {
  system: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>`,
  conversation: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  memory: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  'tool-results': `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  tools: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  docs: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  dragHandle: `<svg width="10" height="15" viewBox="0 0 10 15" fill="currentColor"><circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/><circle cx="2.5" cy="7.5" r="1.5"/><circle cx="7.5" cy="7.5" r="1.5"/><circle cx="2.5" cy="12.5" r="1.5"/><circle cx="7.5" cy="12.5" r="1.5"/></svg>`,
  pin: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>`,
  drop: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  chevronRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  chevronLeft: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
};

const DEFAULT_PRIORITY = { system: 'high', memory: 'high', conversation: 'medium', 'tool-results': 'medium', tools: 'low', docs: 'medium' };

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:host {
  --bg: #ffffff;
  --surface: #f8fafc;
  --surface-hover: #f1f5f9;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --text: #0f172a;
  --text-muted: #64748b;
  --text-subtle: #94a3b8;
  --accent: #6366f1;
  --accent-bg: #eef2ff;
  --high: #ef4444;
  --high-bg: #fef2f2;
  --medium: #f59e0b;
  --medium-bg: #fffbeb;
  --low: #94a3b8;
  --low-bg: #f8fafc;
  --pinned: #6366f1;
  --radius: 6px;
  --transition: 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.op-outer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2147483647;
  display: flex;
  align-items: stretch;
  pointer-events: none;
}

/* ── Toggle tab ── */
.op-tab {
  align-self: center;
  width: 24px;
  height: 56px;
  background: var(--accent);
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
  color: #fff;
  border: none;
  box-shadow: -3px 0 12px rgba(99,102,241,0.3);
  transition: background var(--transition), box-shadow var(--transition);
  flex-shrink: 0;
}
.op-tab:hover { background: #4f46e5; box-shadow: -3px 0 16px rgba(99,102,241,0.45); }

/* ── Sidebar panel ── */
.op-sidebar {
  width: 320px;
  background: var(--bg);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  pointer-events: all;
  box-shadow: -6px 0 24px rgba(0,0,0,0.06);
  overflow: hidden;
  transition: width var(--transition), opacity var(--transition), transform var(--transition);
  transform-origin: right;
}
.op-outer.collapsed .op-sidebar {
  width: 0;
  opacity: 0;
  pointer-events: none;
}

/* ── Header ── */
.op-header {
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  background: var(--bg);
}
.op-header-logo {
  width: 20px;
  height: 20px;
  background: var(--accent);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.op-header-logo svg { width: 11px; height: 11px; }
.op-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
  letter-spacing: -0.01em;
  flex: 1;
}
.op-total-tokens {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0;
}
.op-total-tokens.flash {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}

/* ── Block list ── */
.op-blocks {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 10px 16px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.op-blocks::-webkit-scrollbar { width: 4px; }
.op-blocks::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* ── Empty state ── */
.op-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 20px;
  color: var(--text-subtle);
  text-align: center;
}
.op-empty-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-subtle);
}
.op-empty p { font-size: 12.5px; line-height: 1.6; max-width: 200px; }

/* ── Section label ── */
.op-section-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-subtle);
  padding: 8px 6px 4px;
}

/* ── Context block ── */
.op-block {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 9px 10px 9px 6px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg);
  margin-bottom: 6px;
  cursor: default;
  transition: border-color var(--transition), box-shadow var(--transition), opacity var(--transition);
  position: relative;
}
.op-block:hover { border-color: var(--border-strong); box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.op-block.pinned { border-color: var(--accent); background: var(--accent-bg); }
.op-block.dropped { opacity: 0.45; }
.op-block.drag-over { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-bg); }
.op-block.dragging { opacity: 0.4; }

/* ── Drag handle ── */
.op-drag {
  cursor: grab;
  color: var(--text-subtle);
  padding: 2px 2px;
  flex-shrink: 0;
  margin-top: 1px;
  border-radius: 3px;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition);
}
.op-drag:hover { color: var(--text-muted); background: var(--surface); }
.op-drag:active { cursor: grabbing; }

/* ── Block body ── */
.op-block-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }

/* ── Block header row ── */
.op-block-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.op-block-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-muted);
  background: var(--surface);
}
.op-block.pinned .op-block-icon { background: rgba(99,102,241,0.12); color: var(--accent); }
.op-block-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.op-block-tokens {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 10.5px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
  letter-spacing: 0;
  flex-shrink: 0;
}

/* ── Block meta ── */
.op-block-meta {
  font-size: 11px;
  color: var(--text-subtle);
  padding-left: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.op-block-preview {
  font-size: 11.5px;
  color: var(--text-muted);
  padding-left: 26px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* ── Controls row ── */
.op-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 26px;
}

/* ── Priority dots ── */
.op-priority {
  display: flex;
  align-items: center;
  gap: 3px;
}
.op-priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--border-strong);
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: all 0.12s;
  flex-shrink: 0;
}
.op-priority-dot:hover { transform: scale(1.25); }
.op-priority-dot.active[data-p="high"]   { background: var(--high);   border-color: var(--high);   }
.op-priority-dot.active[data-p="medium"] { background: var(--medium); border-color: var(--medium); }
.op-priority-dot.active[data-p="low"]    { background: var(--low);    border-color: var(--low);    }
.op-priority-dot[data-p="high"]:hover   { border-color: var(--high);   }
.op-priority-dot[data-p="medium"]:hover { border-color: var(--medium); }
.op-priority-dot[data-p="low"]:hover    { border-color: var(--low);    }

/* ── Priority label ── */
.op-priority-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.03em;
  color: var(--text-subtle);
  text-transform: uppercase;
  min-width: 32px;
}
.op-priority-label[data-p="high"]   { color: var(--high);   }
.op-priority-label[data-p="medium"] { color: var(--medium); }
.op-priority-label[data-p="low"]    { color: var(--low);    }

/* ── Action buttons (pin / drop) ── */
.op-actions { margin-left: auto; display: flex; gap: 3px; }
.op-action-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-subtle);
  transition: background var(--transition), color var(--transition);
  flex-shrink: 0;
}
.op-action-btn:hover { background: var(--surface-hover); color: var(--text-muted); }
.op-action-btn.pin-active { color: var(--pinned); }
.op-action-btn.drop-active { color: var(--high); }

/* ── Footer ── */
.op-footer {
  padding: 8px 14px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.op-footer-updated {
  font-size: 11px;
  color: var(--text-subtle);
}
.op-footer-model {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-subtle);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: -0.01em;
}

/* ── Dropped section toggle ── */
.op-show-dropped {
  font-size: 11.5px;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  transition: background var(--transition);
}
.op-show-dropped:hover { background: var(--accent-bg); }
`;

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  blocks: [],
  collapsed: false,
  showDropped: false,
  dragSrcIndex: null,
  lastUpdated: null,
  model: null,
  // persisted overrides: { [blockId]: { priority, pinned, dropped } }
  overrides: {},
};

let shadow = null;   // ShadowRoot reference
let outer = null;    // .op-outer element

// ─── Token helpers ────────────────────────────────────────────────────────────

function estimateTokens(text) {
  if (!text) return 0;
  if (typeof text !== 'string') text = JSON.stringify(text);
  return Math.ceil(text.length / 4);
}

function fmtTokens(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function fmtTime(ts) {
  if (!ts) return 'Never';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Context parser ───────────────────────────────────────────────────────────

function parseContext(payload) {
  const blocks = [];

  // 1. System prompt
  if (payload.system) {
    const txt =
      typeof payload.system === 'string'
        ? payload.system
        : Array.isArray(payload.system)
        ? payload.system.map((s) => s.text ?? JSON.stringify(s)).join('\n')
        : JSON.stringify(payload.system);

    blocks.push({
      id: 'system',
      type: 'system',
      label: 'System Prompt',
      content: txt,
      tokens: estimateTokens(txt),
      priority: DEFAULT_PRIORITY.system,
      pinned: true,
      dropped: false,
    });
  }

  // 2. Walk messages — separate turns from tool results
  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    const conversationParts = [];
    const toolResultParts = [];

    for (const msg of payload.messages) {
      const role = msg.role;
      const content = msg.content;

      if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === 'tool_result') {
            const inner =
              typeof part.content === 'string'
                ? part.content
                : Array.isArray(part.content)
                ? part.content.map((c) => c.text ?? JSON.stringify(c)).join('\n')
                : JSON.stringify(part.content ?? '');
            toolResultParts.push(inner);
          } else if (part.type === 'text') {
            conversationParts.push(`${role}: ${part.text}`);
          } else if (part.type === 'tool_use') {
            conversationParts.push(`assistant [tool_use:${part.name}]: ${JSON.stringify(part.input)}`);
          } else {
            conversationParts.push(`${role}: ${JSON.stringify(part)}`);
          }
        }
      } else if (typeof content === 'string') {
        conversationParts.push(`${role}: ${content}`);
      }
    }

    // Conversation history block
    if (conversationParts.length > 0) {
      const txt = conversationParts.join('\n');
      const turnCount = payload.messages.filter(
        (m) => m.role === 'user' && (
          typeof m.content === 'string' ||
          (Array.isArray(m.content) && m.content.some((c) => c.type === 'text'))
        )
      ).length;

      blocks.push({
        id: 'conversation',
        type: 'conversation',
        label: 'Conversation History',
        content: txt,
        tokens: estimateTokens(txt),
        priority: DEFAULT_PRIORITY.conversation,
        pinned: false,
        dropped: false,
        meta: `${turnCount} turn${turnCount !== 1 ? 's' : ''} · ${payload.messages.length} message${payload.messages.length !== 1 ? 's' : ''}`,
      });
    }

    // Tool results block
    if (toolResultParts.length > 0) {
      const txt = toolResultParts.join('\n─────\n');
      blocks.push({
        id: 'tool-results',
        type: 'tool-results',
        label: 'Tool Results',
        content: txt,
        tokens: estimateTokens(txt),
        priority: DEFAULT_PRIORITY['tool-results'],
        pinned: false,
        dropped: false,
        meta: `${toolResultParts.length} result${toolResultParts.length !== 1 ? 's' : ''}`,
      });
    }
  }

  // 3. Available tools
  if (Array.isArray(payload.tools) && payload.tools.length > 0) {
    const txt = JSON.stringify(payload.tools);
    blocks.push({
      id: 'tools',
      type: 'tools',
      label: 'Available Tools',
      content: txt,
      tokens: estimateTokens(txt),
      priority: DEFAULT_PRIORITY.tools,
      pinned: false,
      dropped: false,
      meta: `${payload.tools.length} tool${payload.tools.length !== 1 ? 's' : ''}`,
    });
  }

  // Apply persisted overrides (priority, pinned, dropped)
  return blocks.map((b) => ({ ...b, ...(state.overrides[b.id] ?? {}) }));
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function el(tag, className, attrs = {}) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function svgBtn(className, svgStr, title) {
  const btn = el('button', className);
  btn.title = title;
  btn.innerHTML = svgStr;
  return btn;
}

// ─── Block rendering ──────────────────────────────────────────────────────────

function buildBlock(block, index) {
  const wrap = el('div', 'op-block' + (block.pinned ? ' pinned' : '') + (block.dropped ? ' dropped' : ''));
  wrap.dataset.id = block.id;
  wrap.dataset.index = index;
  wrap.draggable = true;

  // Drag handle
  const drag = el('button', 'op-drag');
  drag.title = 'Drag to reorder';
  drag.innerHTML = SVG.dragHandle;
  drag.setAttribute('aria-label', 'Drag handle');
  wrap.appendChild(drag);

  // Body
  const body = el('div', 'op-block-body');

  // Header row
  const head = el('div', 'op-block-head');

  const iconWrap = el('div', 'op-block-icon');
  iconWrap.innerHTML = SVG[block.type] ?? SVG.docs;
  head.appendChild(iconWrap);

  const label = el('span', 'op-block-label');
  label.textContent = block.label;
  head.appendChild(label);

  const tokBadge = el('span', 'op-block-tokens');
  tokBadge.textContent = fmtTokens(block.tokens);
  head.appendChild(tokBadge);
  body.appendChild(head);

  // Preview line
  if (block.content) {
    const preview = el('div', 'op-block-preview');
    preview.textContent = block.content.slice(0, 180).replace(/\s+/g, ' ').trim();
    body.appendChild(preview);
  }

  // Meta line
  if (block.meta) {
    const meta = el('div', 'op-block-meta');
    meta.textContent = block.meta;
    body.appendChild(meta);
  }

  // Controls row
  const controls = el('div', 'op-controls');

  // Priority dots
  const prioGroup = el('div', 'op-priority');
  prioGroup.setAttribute('role', 'group');
  prioGroup.setAttribute('aria-label', 'Priority');
  for (const level of ['high', 'medium', 'low']) {
    const dot = el('button', 'op-priority-dot' + (block.priority === level ? ' active' : ''));
    dot.dataset.p = level;
    dot.title = `${level.charAt(0).toUpperCase() + level.slice(1)} priority`;
    dot.addEventListener('click', () => onPriorityClick(block.id, level));
    prioGroup.appendChild(dot);
  }
  controls.appendChild(prioGroup);

  // Priority label
  const prioLabel = el('span', 'op-priority-label');
  prioLabel.dataset.p = block.priority;
  prioLabel.textContent = block.priority;
  controls.appendChild(prioLabel);

  // Pin / Drop buttons
  const actions = el('div', 'op-actions');

  const pinBtn = svgBtn(
    'op-action-btn' + (block.pinned ? ' pin-active' : ''),
    SVG.pin,
    block.pinned ? 'Unpin block' : 'Pin block to top'
  );
  pinBtn.addEventListener('click', () => onPinToggle(block.id));
  actions.appendChild(pinBtn);

  const dropBtn = svgBtn(
    'op-action-btn' + (block.dropped ? ' drop-active' : ''),
    SVG.drop,
    block.dropped ? 'Restore block' : 'Drop block from context'
  );
  dropBtn.addEventListener('click', () => onDropToggle(block.id));
  actions.appendChild(dropBtn);

  controls.appendChild(actions);
  body.appendChild(controls);
  wrap.appendChild(body);

  // Drag events
  wrap.addEventListener('dragstart', (e) => {
    state.dragSrcIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    wrap.classList.add('dragging');
  });
  wrap.addEventListener('dragend', () => {
    wrap.classList.remove('dragging');
    shadow.querySelectorAll('.op-block').forEach((b) => b.classList.remove('drag-over'));
  });
  wrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    shadow.querySelectorAll('.op-block').forEach((b) => b.classList.remove('drag-over'));
    wrap.classList.add('drag-over');
  });
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    wrap.classList.remove('drag-over');
    const targetIndex = parseInt(wrap.dataset.index, 10);
    if (state.dragSrcIndex !== null && state.dragSrcIndex !== targetIndex) {
      const active = activeBlocks();
      const moved = active.splice(state.dragSrcIndex, 1)[0];
      active.splice(targetIndex, 0, moved);
      state.blocks = [
        ...active,
        ...state.blocks.filter((b) => b.dropped),
      ];
      render();
    }
    state.dragSrcIndex = null;
  });

  return wrap;
}

// ─── Active / dropped split ───────────────────────────────────────────────────

function activeBlocks() {
  return state.blocks.filter((b) => !b.dropped);
}

function droppedBlocks() {
  return state.blocks.filter((b) => b.dropped);
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  if (!shadow) return;

  const blocksContainer = shadow.querySelector('.op-blocks');
  if (!blocksContainer) return;

  // Update outer collapsed state
  outer.classList.toggle('collapsed', state.collapsed);

  // Update tab chevron
  const tab = shadow.querySelector('.op-tab');
  tab.innerHTML = state.collapsed ? SVG.chevronLeft : SVG.chevronRight;

  // Update total tokens + flash
  const active = activeBlocks();
  const totalTokens = active.reduce((s, b) => s + b.tokens, 0);
  const tokEl = shadow.querySelector('.op-total-tokens');
  tokEl.textContent = fmtTokens(totalTokens) + ' tok';

  // Footer
  shadow.querySelector('.op-footer-updated').textContent =
    state.lastUpdated ? 'Updated ' + fmtTime(state.lastUpdated) : 'Waiting for message…';

  const modelEl = shadow.querySelector('.op-footer-model');
  if (state.model) {
    modelEl.textContent = state.model.replace(/^claude-/, '').replace(/-\d{8}$/, '');
    modelEl.style.display = '';
  } else {
    modelEl.style.display = 'none';
  }

  // Clear and repopulate blocks
  blocksContainer.innerHTML = '';

  if (active.length === 0 && droppedBlocks().length === 0) {
    const empty = el('div', 'op-empty');
    empty.innerHTML = `
      <div class="op-empty-icon">${SVG.conversation}</div>
      <p>Send a message to Claude to see the context window breakdown.</p>
    `;
    blocksContainer.appendChild(empty);
    return;
  }

  // Pinned first, then rest
  const pinned = active.filter((b) => b.pinned);
  const unpinned = active.filter((b) => !b.pinned);
  const ordered = [...pinned, ...unpinned];

  if (pinned.length > 0) {
    const lbl = el('div', 'op-section-label');
    lbl.textContent = 'Pinned';
    blocksContainer.appendChild(lbl);
    pinned.forEach((b, i) => blocksContainer.appendChild(buildBlock(b, i)));
  }

  if (unpinned.length > 0) {
    const lbl = el('div', 'op-section-label');
    lbl.textContent = pinned.length > 0 ? 'Context' : 'Context Blocks';
    blocksContainer.appendChild(lbl);
    unpinned.forEach((b, i) => blocksContainer.appendChild(buildBlock(b, i + pinned.length)));
  }

  // Dropped section
  const dropped = droppedBlocks();
  if (dropped.length > 0) {
    const showBtn = el('button', 'op-show-dropped');
    showBtn.innerHTML = `${SVG.drop} ${state.showDropped ? 'Hide' : 'Show'} ${dropped.length} dropped block${dropped.length !== 1 ? 's' : ''}`;
    showBtn.addEventListener('click', () => {
      state.showDropped = !state.showDropped;
      render();
    });
    blocksContainer.appendChild(showBtn);

    if (state.showDropped) {
      dropped.forEach((b, i) =>
        blocksContainer.appendChild(buildBlock(b, ordered.length + i))
      );
    }
  }

  // Push stats to background
  chrome.runtime.sendMessage({
    type: 'stats-update',
    stats: {
      totalTokens,
      blockCount: active.length,
      model: state.model,
      lastUpdated: state.lastUpdated,
    },
  }).catch(() => {});
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onPriorityClick(blockId, level) {
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return;
  block.priority = level;
  state.overrides[blockId] = { ...state.overrides[blockId], priority: level };
  persistOverrides();
  render();
}

function onPinToggle(blockId) {
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return;
  block.pinned = !block.pinned;
  state.overrides[blockId] = { ...state.overrides[blockId], pinned: block.pinned };
  persistOverrides();
  render();
}

function onDropToggle(blockId) {
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return;
  block.dropped = !block.dropped;
  if (block.dropped) block.pinned = false;
  state.overrides[blockId] = { ...state.overrides[blockId], dropped: block.dropped };
  persistOverrides();
  render();
}

function toggleCollapse() {
  state.collapsed = !state.collapsed;
  chrome.storage.local.set({ collapsed: state.collapsed }).catch(() => {});
  render();
}

function persistOverrides() {
  chrome.storage.local.set({ blockOverrides: state.overrides }).catch(() => {});
}

// ─── Context update handler ───────────────────────────────────────────────────

function handleContextUpdate(payload) {
  state.blocks = parseContext(payload);
  state.lastUpdated = payload.timestamp;
  state.model = payload.model;

  // Flash token counter
  const tokEl = shadow?.querySelector('.op-total-tokens');
  if (tokEl) {
    tokEl.classList.add('flash');
    setTimeout(() => tokEl.classList.remove('flash'), 900);
  }

  render();
}

// ─── Sidebar DOM creation ─────────────────────────────────────────────────────

function createSidebar() {
  const host = document.createElement('div');
  host.id = OP_ID;
  document.body.appendChild(host);

  shadow = host.attachShadow({ mode: 'open' });

  // Fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400&display=swap';
  shadow.appendChild(fontLink);

  // Styles
  const style = document.createElement('style');
  style.textContent = CSS;
  shadow.appendChild(style);

  // Outer container
  outer = el('div', 'op-outer' + (state.collapsed ? ' collapsed' : ''));
  shadow.appendChild(outer);

  // Tab (toggle) button
  const tab = svgBtn('op-tab', SVG.chevronRight, 'Toggle OpenPane');
  tab.addEventListener('click', toggleCollapse);
  outer.appendChild(tab);

  // Sidebar panel
  const sidebar = el('div', 'op-sidebar');

  // Header
  const header = el('div', 'op-header');
  const logo = el('div', 'op-header-logo');
  logo.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
  header.appendChild(logo);
  const title = el('span', 'op-title');
  title.textContent = 'OpenPane';
  header.appendChild(title);
  const tokTotal = el('span', 'op-total-tokens');
  tokTotal.textContent = '0 tok';
  header.appendChild(tokTotal);
  sidebar.appendChild(header);

  // Blocks list
  const blocksList = el('div', 'op-blocks');
  sidebar.appendChild(blocksList);

  // Footer
  const footer = el('div', 'op-footer');
  const updated = el('span', 'op-footer-updated');
  updated.textContent = 'Waiting for message…';
  footer.appendChild(updated);
  const modelBadge = el('span', 'op-footer-model');
  modelBadge.style.display = 'none';
  footer.appendChild(modelBadge);
  sidebar.appendChild(footer);

  outer.appendChild(sidebar);

  // Initial render (empty state)
  render();
}

// ─── Inject page-context script ───────────────────────────────────────────────

function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => script.remove();
  (document.head ?? document.documentElement).appendChild(script);
}

// ─── Message listeners ────────────────────────────────────────────────────────

window.addEventListener('message', (event) => {
  if (
    event.source === window &&
    event.data?.source === 'openpane' &&
    event.data?.type === 'context-update'
  ) {
    handleContextUpdate(event.data.payload);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'toggle-sidebar') toggleCollapse();
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // Don't inject twice (SPA navigation re-uses same page context)
  if (document.getElementById(OP_ID)) return;

  const stored = await chrome.storage.local.get(['collapsed', 'blockOverrides']).catch(() => ({}));
  state.collapsed = stored.collapsed ?? false;
  state.overrides = stored.blockOverrides ?? {};

  injectPageScript();
  createSidebar();
}

// Handle SPA navigations on claude.ai
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // Re-inject if the sidebar host was removed during navigation
    if (!document.getElementById(OP_ID)) {
      state.blocks = [];
      state.lastUpdated = null;
      state.model = null;
      createSidebar();
    }
  }
}).observe(document.body, { childList: true, subtree: true });

init();
