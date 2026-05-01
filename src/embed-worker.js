import { pipeline, env } from '@xenova/transformers';

// Load ONNX Runtime WASM from CDN so we don't bundle ~8MB of binary
env.backends.onnx.wasm.wasmPaths =
  'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/';

// Cache the downloaded model in IndexedDB so subsequent page loads are instant
env.allowRemoteModels = true;
env.useBrowserCache   = true;

let embedder = null;

async function loadModel() {
  embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    {
      quantized: true,
      progress_callback: ({ status, file, progress }) => {
        if (status === 'progress') {
          self.postMessage({ type: 'progress', file, progress: Math.round(progress) });
        }
      },
    }
  );
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async ({ data }) => {
  // Preload the model eagerly so the first real embed is fast
  if (data.type === 'init') {
    try {
      self.postMessage({ type: 'loading' });
      await loadModel();
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
    return;
  }

  // Embed a batch of texts starting at a given index in the conversation
  if (data.type === 'embed') {
    const { texts, startIdx } = data;
    try {
      if (!embedder) await loadModel();

      const embeddings = [];
      for (const text of texts) {
        // Truncate to keep inference fast; MiniLM is trained on short passages
        const out = await embedder(text.slice(0, 512), {
          pooling:   'mean',
          normalize: true,
        });
        embeddings.push(Array.from(out.data));
      }

      self.postMessage({ type: 'embeddings', startIdx, embeddings });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }
};
