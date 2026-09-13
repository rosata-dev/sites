/**
 * Programmatic OG cards (1200×630) — editorial typography rendered to SVG
 * and rasterized with sharp at build time. Chinese glyphs come from the
 * system font "Noto Serif CJK SC" via fontconfig/pango, so the build
 * machine needs that family installed (no webfont is embedded).
 */
import sharp from "sharp";

const W = 1200;
const H = 630;

export interface OgCardOptions {
	title: string;
	kicker: string;
	meta: string;
	footer: string;
}

const esc = (s: string) =>
	s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

// visual width budget: CJK/full-width counts 1em, ASCII roughly half
const charUnits = (ch: string) => (/[^\x00-\xff]/.test(ch) ? 1 : 0.52);

const charUnitsSum = (s: string) =>
	[...s].reduce((n, ch) => n + charUnits(ch), 0);

function breakLines(
	text: string,
	maxUnits: number,
	maxLines: number,
): string[] {
	const lines: string[] = [];
	let cur = "";
	let curU = 0;
	for (const ch of text) {
		const u = charUnits(ch);
		if (curU + u > maxUnits && cur !== "") {
			lines.push(cur);
			if (lines.length === maxLines) {
				// overflow: walk the last line back until the ellipsis fits
				let last = lines[maxLines - 1];
				while (last.length > 0 && charUnitsSum(`${last}…`) > maxUnits) {
					last = last.slice(0, -1);
				}
				lines[maxLines - 1] = `${last}…`;
				return lines;
			}
			cur = ch === " " ? "" : ch;
			curU = cur === "" ? 0 : u;
		} else {
			cur += ch;
			curU += u;
		}
	}
	if (cur !== "") lines.push(cur);
	return lines;
}

const SIGIL = `<g stroke="#84c5f2" stroke-width="1.6" stroke-linecap="round">
	<line x1="9" y1="1" x2="9" y2="17"/>
	<line x1="1" y1="9" x2="17" y2="9"/>
	<line x1="3.4" y1="3.4" x2="14.6" y2="14.6"/>
	<line x1="14.6" y1="3.4" x2="3.4" y2="14.6"/>
</g>`;

export function buildOgSvg({ title, kicker, meta, footer }: OgCardOptions): string {
	const lines = breakLines(title, 14.5, 3);
	const fontSize = lines.length >= 3 ? 60 : 68;
	const lineHeight = fontSize * 1.42;
	const firstBaseline = 348 + (3 - lines.length) * 34;

	const titleTspans = lines
		.map(
			(line, i) =>
				`<text x="88" y="${firstBaseline + i * lineHeight}" font-family="Noto Serif CJK SC" font-weight="700" font-size="${fontSize}" fill="#f3ead9">${esc(line)}</text>`,
		)
		.join("\n	");

	return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
	<linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
		<stop offset="0" stop-color="#161b23"/>
		<stop offset="1" stop-color="#0f131a"/>
	</linearGradient>
	<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
		<stop offset="0" stop-color="#84c5f2" stop-opacity="0.14"/>
		<stop offset="1" stop-color="#84c5f2" stop-opacity="0"/>
	</radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="1000" cy="60" r="430" fill="url(#glow)"/>
<circle cx="1080" cy="700" r="320" fill="none" stroke="#84c5f2" stroke-opacity="0.16" stroke-width="1.5"/>
<circle cx="1080" cy="700" r="240" fill="none" stroke="#84c5f2" stroke-opacity="0.10" stroke-width="1"/>
<rect x="36" y="36" width="${W - 72}" height="${H - 72}" fill="none" stroke="#f3ead9" stroke-opacity="0.10"/>
<g transform="translate(88 92)">${SIGIL}</g>
<text x="122" y="106" font-family="Noto Serif CJK SC" font-size="22" letter-spacing="6" fill="#8fa3b8">我的生活随笔手札 · ROSATA.CN</text>
<text x="88" y="266" font-family="Noto Serif CJK SC" font-size="25" letter-spacing="9" fill="#84c5f2">${esc(kicker)}</text>
<rect x="88" y="288" width="72" height="3" fill="#84c5f2"/>
	${titleTspans}
<text x="88" y="552" font-family="Noto Serif CJK SC" font-size="24" fill="#a9b8c6">${esc(meta)}</text>
<text x="1112" y="552" text-anchor="end" font-family="Noto Serif CJK SC" font-size="21" letter-spacing="6" fill="#5f7186">${esc(footer)}</text>
</svg>`;
}

export async function renderOgPng(
	opts: OgCardOptions,
): Promise<Uint8Array<ArrayBuffer>> {
	const buf = await sharp(Buffer.from(buildOgSvg(opts)))
		.png({ compressionLevel: 9 })
		.toBuffer();
	// copy into a fresh ArrayBuffer-backed view so the value satisfies
	// Response/Blob's BodyInit typing (sharp's Buffer is ArrayBufferLike)
	const out = new Uint8Array(buf.byteLength);
	out.set(buf);
	return out;
}
