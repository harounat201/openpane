/**
 * injected.js — Runs in the *page* context (not the extension sandbox).
 * Wraps window.fetch to intercept Claude API request payloads and relay
 * them to the content script via window.postMessage.
 *
 * Injected by content.js via a &lt;script src="..."&gt; element so it has access
 * to the page's own fetch/XHR and can read request bodies before they fly.
 */
(function () {
  if (window.__openPaneInjected) return;
  window.__openPaneInjected = true;

  const originalFetch = window.fetch.bind(window);

  function looksLikeClaudePayload(obj, url) {
    if (!obj || typeof obj !== 'object') return false;
    // Standard Anthropic API format
    if (Array.isArray(obj.messages) || typeof obj.system !== 'undefined') return true;
    // Claude.ai frontend sends prompt text + conversation_id
    if (typeof obj.prompt === 'string' && obj.prompt.length > 20) return true;
    if (typeof obj.text === 'string' && obj.conversation_id) return true;
    // Any request to a chat/completion/message endpoint
    if (url && /\/(completion|append_message|chat|messages?)(\/|$|\?)/.test(url)) return true;
    return false;
  }

  function broadcast(payload, url) {
    window.postMessage(
      {
        source: 'openpane',
        type: 'context-update',
        payload: {
          system: payload.system ?? null,
          messages: payload.messages ?? [],
          tools: payload.tools ?? [],
          model: payload.model ?? null,
          max_tokens: payload.max_tokens ?? null,
          url,
          timestamp: Date.now(),
        },
      },
      '*'
    );
  }

  async function tryReadBody(body) {
    if (!body) return null;
    try {
      if (typeof body === 'string') return JSON.parse(body);
      if (body instanceof ArrayBuffer)
        return JSON.parse(new TextDecoder().decode(body));
      if (body instanceof Blob) return JSON.parse(await body.text());
      if (body instanceof Uint8Array)
        return JSON.parse(new TextDecoder().decode(body));
    } catch {
      /* not JSON */
    }
    return null;
  }

  window.fetch = async function (resource, options = {}) {
    const url =
      resource instanceof Request
        ? resource.url
        : typeof resource === 'string'
        ? resource
        : String(resource);

    let passOptions = options;

    if (options.body instanceof ReadableStream) {
      // Tee the stream so the original request is unaffected
      try {
        const [s1, s2] = options.body.tee();
        passOptions = { ...options, body: s1 };

        const reader = s2.getReader();
        const chunks = [];
        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
            const merged = new Uint8Array(
              chunks.reduce((acc, c) => acc + c.length, 0)
            );
            let offset = 0;
            for (const c of chunks) {
              merged.set(c, offset);
              offset += c.length;
            }
            const parsed = JSON.parse(new TextDecoder().decode(merged));
            if (looksLikeClaudePayload(parsed, url)) broadcast(parsed, url);
          } catch {
            /* ignore parse errors */
          }
        })();
      } catch {
        /* stream tee failed — pass through unchanged */
      }
    } else if (options.body) {
      const parsed = await tryReadBody(options.body);
      if (parsed && looksLikeClaudePayload(parsed, url)) broadcast(parsed, url);
    }

    return originalFetch(resource, passOptions);
  };

  // Also cover legacy XHR paths
  const NativeXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new NativeXHR();
    const origOpen = xhr.open.bind(xhr);
    const origSend = xhr.send.bind(xhr);
    let _url = '';

    xhr.open = function (method, url, ...rest) {
      _url = String(url);
      return origOpen(method, url, ...rest);
    };

    xhr.send = function (body) {
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          if (looksLikeClaudePayload(parsed, _url)) broadcast(parsed, _url);
        } catch {
          /* not JSON */
        }
      }
      return origSend(body);
    };

    return xhr;
  };
  window.XMLHttpRequest.prototype = NativeXHR.prototype;
})();
