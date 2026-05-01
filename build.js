const esbuild = require('esbuild');

const opts = {
  entryPoints: ['src/embed-worker.js'],
  bundle:   true,
  outfile:  'embed-worker.js',
  format:   'iife',
  platform: 'browser',
  target:   ['chrome120'],
  define: {
    'process.env.NODE_ENV': '"production"',
    'global': 'globalThis',
  },
  minify: false,
};

if (process.argv.includes('--watch')) {
  esbuild.context(opts).then(ctx => {
    ctx.watch();
    console.log('Watching src/embed-worker.js…');
  });
} else {
  esbuild.build(opts)
    .then(() => console.log('✓  embed-worker.js built'))
    .catch(() => process.exit(1));
}
