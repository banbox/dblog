import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
		tailwindcss(),
		nodePolyfills({
			// 只 polyfill 需要的模块（仅客户端）
			include: ['buffer', 'events', 'stream', 'util', 'crypto', 'process'],
			globals: {
				Buffer: true,
				global: true,
				process: true
			},
			protocolImports: true,
		}),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['url', 'cookie', 'baseLocale']
		})
	],
	resolve: {
		alias: {
			// Polyfill Node.js core modules
			crypto: 'crypto-browserify',
			stream: 'stream-browserify',
			os: 'os-browserify/browser',
			path: 'path-browserify',
		},
	}
});
