import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  sourcemap: true,
  clean: true,
  // Runtime deps stay external (installed in the runtime image); only our code is bundled.
  skipNodeModulesBundle: true,
});
