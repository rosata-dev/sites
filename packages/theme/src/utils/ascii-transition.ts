/**
 * ASCII waterfall page transition — a port of the character-grid sweep from
 * the careers deck (AsciiTransition.tsx + wipe.ts), adapted for Swup.
 *
 * The deck stacked both scenes and clip-pathed between them: unswept area
 * shows the old scene, swept area shows the new one. Swup swaps the DOM in
 * place, so the moment a visit starts we clone the outgoing main/toc into a
 * fixed snapshot overlay stacked above the page — restoring the deck's
 * two-scene setup. The DOM swap then happens underneath the untouched
 * snapshot, and a single downward sweep clips the snapshot away along a
 * horizontal line (the wipe.ts geometry, angle 0) while the wavy character
 * band rides the wipe edge, revealing the new page directly behind it.
 *
 * The band math (wave, reach, squeeze, sparkle, re-roll) is 1:1 from the
 * source; ink/tile colors follow the active theme instead of hard black.
 */

import { sweep } from "./audio";

const CELL = 12;
/* overshoot so the wavy band fully enters/exits the viewport */
const PAD = 220;
/* single sweep at half the original speed; must match the is-rendering
   duration in src/styles/transition.css */
const SWEEP_MS = 1040;

export const CHARSET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";
const INK_DARK = [
	"rgb(255, 255, 255)",
	"rgb(150, 150, 150)",
	"rgb(80, 80, 80)",
];
const INK_LIGHT = [
	"rgb(24, 24, 27)",
	"rgb(110, 110, 118)",
	"rgb(180, 180, 186)",
];

interface Cell {
	char: string;
	ink: string;
	threshold: number;
	edgeOffset: number;
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function smooth(value: number): number {
	const t = clamp01(value);
	return t * t * (3 - 2 * t);
}

function easeInOut(value: number): number {
	const t = clamp01(value);
	return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/* the wavy center line of the band — shared by the cell math, the snapshot
   clip polygon, and the sweep-frame subscribers (decrypt-text.ts) */
function waveAt(x: number, center: number): number {
	return (
		center +
		38 * Math.sin(0.013 * x + 0.9 * visitCount) * 0.6 +
		38 * Math.sin(0.041 * x + 1.7 * visitCount) * 0.4
	);
}

const WIPE_SAMPLES = 48;

/* keep-below region along the wave, so the wipe edge flows with the band
   instead of guillotining the page along a straight line */
function wipePolygon(center: number, width: number, height: number): string {
	const pts: string[] = [];
	for (let i = 0; i <= WIPE_SAMPLES; i++) {
		const x = (i / WIPE_SAMPLES) * width;
		pts.push(`${x.toFixed(1)}px ${waveAt(x, center).toFixed(1)}px`);
	}
	pts.push(`${width}px ${height}px`, `0px ${height}px`);
	return `polygon(${pts.join(", ")})`;
}

type SweepFrameCallback = (wipeY: ((x: number) => number) | null) => void;
const frameCallbacks = new Set<SweepFrameCallback>();

/** Subscribe to sweep frames. The callback receives a function giving the
 *  wavy wipe-line Y at a viewport x, or null when the sweep ends. */
export function onSweepFrame(cb: SweepFrameCallback): () => void {
	frameCallbacks.add(cb);
	return () => {
		frameCallbacks.delete(cb);
	};
}

function emitSweepFrame(center: number | null) {
	for (const cb of frameCallbacks) {
		cb(center === null ? null : (x: number) => waveAt(x, center));
	}
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let snapshot: HTMLElement | null = null;
const cells = new Map<string, Cell>();
let cols = 0;
let rows = 0;
let frame = 0;
let rafId = 0;
let armed = false;
let sweepStart = 0;
let visitCount = 0;
let tileColor = "rgb(255, 255, 255)";
let ink = INK_LIGHT;

const keyOf = (x: number, y: number) => `${x},${y}`;

function makeCell(): Cell {
	return {
		char: CHARSET[Math.floor(Math.random() * CHARSET.length)],
		ink: ink[Math.floor(Math.random() * ink.length)],
		threshold: Math.random(),
		edgeOffset: 2 * Math.random() - 1,
	};
}

function rebuildCells() {
	cells.clear();
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			cells.set(keyOf(col, row), makeCell());
		}
	}
}

function resizeCanvas() {
	if (!canvas) return;
	const dpr = window.devicePixelRatio || 1;
	canvas.width = window.innerWidth * dpr;
	canvas.height = window.innerHeight * dpr;
	const nextCols = Math.ceil(window.innerWidth / CELL);
	const nextRows = Math.ceil(window.innerHeight / CELL);
	if (nextCols !== cols || nextRows !== rows) {
		cols = nextCols;
		rows = nextRows;
		rebuildCells();
	}
}

function draw(progress: number) {
	if (!canvas || !ctx) return;
	const dpr = window.devicePixelRatio || 1;
	const height = canvas.height / dpr;
	const width = canvas.width / dpr;
	frame += 1;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	/* the band slides in fully formed — no fade-in dead time after the
	   click; it only dissolves over the last stretch of the sweep */
	const fade = smooth((1 - progress) / 0.12);
	const bandCenter = -PAD + easeInOut(progress) * (height + 2 * PAD);

	emitSweepFrame(bandCenter);
	/* the wipe edge rides the band's wave: the old-page snapshot keeps the
	   bottom piece, the new page shows through above it */
	if (snapshot) {
		snapshot.style.clipPath = wipePolygon(bandCenter, width, height);
	}
	if (fade <= 0) return;

	ctx.font = `${CELL * dpr}px 'JetBrains Mono Variable', monospace`;
	ctx.textBaseline = "top";

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const cell = cells.get(keyOf(col, row));
			if (!cell) continue;
			const centerX = (col + 0.5) * CELL;
			const centerY = (row + 0.5) * CELL;
			const inCore = Math.abs(centerY - bandCenter) <= 72;
			const wavyCenter = waveAt(centerX, bandCenter);
			const belowSpan = height - wavyCenter;
			const topSqueeze = Math.max(0, 130 - wavyCenter);
			const bottomSqueeze = Math.max(0, 130 - belowSpan);
			const offset = centerY - wavyCenter;
			const reach = offset < 0 ? 130 + bottomSqueeze : 130 + topSqueeze;
			const wobble = 0.22 * Math.sin(0.07 * frame + 7.3 * cell.edgeOffset);
			const edgeDistance =
				Math.abs(offset) - (0.55 * cell.edgeOffset + wobble) * 130;
			let visibility: number;
			if (inCore) {
				visibility = fade;
			} else {
				if (edgeDistance > reach) continue;
				visibility = 0.94 * (1 - clamp01(edgeDistance / reach)) ** 1.7 * fade;
			}
			const sparkle =
				0.5 +
				0.5 *
					Math.sin(
						0.18 * frame + 10.7 * cell.threshold + (0.31 * col + 0.17 * row),
					);
			if (sparkle > visibility) continue;
			if (sparkle > 0.85 && (frame + col + row) % 7 === 0) {
				cell.char = CHARSET[Math.floor(Math.random() * CHARSET.length)];
				cell.ink = ink[Math.floor(Math.random() * ink.length)];
			}
			const deviceX = CELL * col * dpr;
			const deviceY = CELL * row * dpr;
			ctx.fillStyle = tileColor;
			ctx.fillRect(deviceX, deviceY, CELL * dpr, CELL * dpr);
			ctx.fillStyle = cell.ink;
			ctx.fillText(cell.char, deviceX, deviceY);
		}
	}
}

function tick(now: number) {
	const progress = Math.min((now - sweepStart) / SWEEP_MS, 1);
	draw(progress);
	if (progress >= 1) {
		stop();
		return;
	}
	rafId = requestAnimationFrame(tick);
}

function removeSnapshot() {
	snapshot?.remove();
	snapshot = null;
}

function stop() {
	cancelAnimationFrame(rafId);
	armed = false;
	removeSnapshot();
	emitSweepFrame(null);
	if (canvas) canvas.style.visibility = "hidden";
}

/* Clone the outgoing swapped regions into a fixed overlay. Clones are
 * wrapped in plain divs so the page never holds two <main>/#toc elements
 * while Swup re-queries its containers. Transparent background on purpose:
 * everything outside the clones (navbar, banner, sidebar, page backdrop)
 * persists across the swap, so the live page underneath already looks
 * exactly like the old one there. */
function takeSnapshot() {
	removeSnapshot();
	const regions = [
		document.getElementById("swup-container"),
		document.getElementById("toc"),
	];
	const overlay = document.createElement("div");
	overlay.id = "ascii-wipe-snapshot";
	for (const region of regions) {
		if (!region) continue;
		const rect = region.getBoundingClientRect();
		const wrap = document.createElement("div");
		wrap.innerHTML = region.innerHTML;
		for (const node of wrap.querySelectorAll("[id]")) {
			node.removeAttribute("id");
		}
		Object.assign(wrap.style, {
			position: "absolute",
			left: `${rect.left}px`,
			top: `${rect.top}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`,
			margin: "0",
			overflow: "hidden",
		});
		overlay.appendChild(wrap);
	}
	document.body.appendChild(overlay);
	snapshot = overlay;
}

/* Freeze the old page exactly as the user saw it at click time, before
 * Swup's visit hooks start mutating layout (banner height, body classes)
 * and before the fetch wait begins. */
function arm() {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	if (!canvas) {
		canvas = document.getElementById(
			"ascii-transition",
		) as HTMLCanvasElement | null;
		if (!canvas) return;
		ctx = canvas.getContext("2d");
	}
	const dark = document.documentElement.classList.contains("dark");
	ink = dark ? INK_DARK : INK_LIGHT;
	tileColor = getComputedStyle(document.documentElement).backgroundColor;
	visitCount += 1;
	frame = 0;
	resizeCanvas();
	takeSnapshot();
	armed = true;
}

function startSweep() {
	if (!armed || !canvas) return;
	sweep();
	canvas.style.visibility = "visible";
	sweepStart = performance.now();
	cancelAnimationFrame(rafId);
	rafId = requestAnimationFrame(tick);
}

export function initAsciiTransition() {
	const setup = () => {
		if (!window.swup) return;
		window.swup.hooks.on("animation:out:start", arm);
		window.swup.hooks.on("animation:in:start", startSweep);
		window.swup.hooks.on("visit:end", stop);
	};

	if (window.swup?.hooks) {
		setup();
	} else {
		document.addEventListener("swup:enable", setup, { once: true });
	}

	window.addEventListener("resize", () => {
		if (armed) resizeCanvas();
	});
}
