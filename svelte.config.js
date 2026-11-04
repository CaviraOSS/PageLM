import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// adapter-static outputs prerendered HTML and assets.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter({
			pages: 'build',   // directory for HTML files
            assets: 'build',  // directory for JS/CSS assets
			fallback: 'index.html',
            precompress: false,
            strict: true
		}),
		prerender: {
			entries: ['*'],
			handleHttpError: 'ignore'
		},
		files: {
			routes: './views/pages',
			appTemplate: './views/app.html',
			lib: './views'
		}
	}

};

export default config;
