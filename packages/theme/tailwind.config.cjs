/** @type {import('tailwindcss').Config} */
// Content globs are resolved from the consuming app's root:
//   ./src/**                    — the app's own sources (pages, content)
//   ../../packages/theme/src/** — theme sources (apps/* is two levels deep)
//   ./node_modules/@rosata/theme/src/** — same files via the pnpm symlink,
//     kept as a fallback in case the workspace layout ever changes
const defaultTheme = require("tailwindcss/defaultTheme");
module.exports = {
	content: [
		"./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}",
		"../../packages/theme/src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}",
		"./node_modules/@rosata/theme/src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}",
	],
	darkMode: "class", // allows toggling dark mode manually
	theme: {
		extend: {
			fontFamily: {
				sans: ["Roboto", "sans-serif", ...defaultTheme.fontFamily.sans],
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
