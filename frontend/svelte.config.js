import adapter from '@sveltejs/adapter-auto'; // Vercel ho detekuje automaticky
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Tohle zajisti, ze Svelte bude rozumet tvemu CSS a modernimu zapisu
	preprocess: vitePreprocess(),

	kit: {
		// Tady rikas Sveltu: "Pouzij ten auto adapter, ktery jsem nainstaloval"
		adapter: adapter()
	}
};

export default config;
