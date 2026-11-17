// SVGO config (npm run images, npm run vectorize). Keeps viewBox so SVGs scale with CSS.

export default {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Keep ids: pages may reference SVG fragments.
          cleanupIds: false,
        },
      },
    },
  ],
};
