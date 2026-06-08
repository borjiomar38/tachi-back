import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import cpy from 'cpy';
import { Nitro } from 'nitro/types';
import { nitro } from 'nitro/vite';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

const { nitroRetrieveServerDirHook, prismaCopyBinariesPlugin } =
  createPrismaCopyBinariesPlugin();

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    server: {
      port: env.VITE_PORT ? Number(env.VITE_PORT) : 3009,
      strictPort: true,
    },
    plugins: [
      devtools(),
      tsConfigPaths(),
      tanstackStart(),
      nitro({
        modules: [
          (nitro) => {
            nitro.hooks.hook('build:before', () => {
              nitroRetrieveServerDirHook(nitro);
            });
          },
        ],
        routeRules: {
          '/storybook': { redirect: '/storybook/' },
          '/tachiyomiat': {
            redirect: { status: 301, to: '/guides/mihon-tachiyomiat-setup' },
          },
          '/tachiyomi-at': {
            redirect: { status: 301, to: '/guides/mihon-tachiyomiat-setup' },
          },
          '/tachiyomi': {
            redirect: { status: 301, to: '/guides/mihon-tachiyomiat-setup' },
          },
          '/mihon': {
            redirect: { status: 301, to: '/guides/mihon-nayovi-setup' },
          },
          '/tachiyomiat-download': {
            redirect: { status: 301, to: '/download' },
          },
          '/download-tachiyomiat': {
            redirect: { status: 301, to: '/download' },
          },
          '/tachiyomi-download': {
            redirect: { status: 301, to: '/download' },
          },
          '/download-tachiyomi': {
            redirect: { status: 301, to: '/download' },
          },
        },
      }),
      // react's vite plugin must come after start's vite plugin
      viteReact({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
      // Copy prisma binaries at the end
      prismaCopyBinariesPlugin(),
    ],
  };
});

function createPrismaCopyBinariesPlugin() {
  let serverDir = '';
  return {
    nitroRetrieveServerDirHook: (nitro: Nitro) => {
      serverDir = nitro.options.output.serverDir.replace(resolve('.'), '.');
    },
    prismaCopyBinariesPlugin: () => ({
      name: 'prisma-copy-binaries',
      writeBundle: async (outputOptions: { dir?: string }) => {
        const outputDir = outputOptions.dir?.replace(resolve('.'), '.');
        if (outputDir === serverDir) {
          await cpy('./src/server/db/generated/**/*.node', resolve(serverDir));
        }
      },
    }),
  };
}
