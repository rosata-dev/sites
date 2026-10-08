/**
 * Sweep-synced shuffle decode — order follows the wipe.
 *
 * Instead of substituting foreign characters (the careers deck's
 * DecryptedText), the displayed text is always a PERMUTATION of its own
 * characters: slots start shuffled and settle by selection sort — each
 * tick swaps the glyph that belongs at slot s back home, so the invariant
 * "on-screen text = an anagram of the original" holds at every frame.
 * CJK glyphs are full-width, so swaps cause no reflow for Chinese text:
 * a shuffled sentence reads as a stranger made of the same characters,
 * then finds its meaning as the wipe passes.
 *
 * Scope: every text node inside the swapped main container — titles,
 * metadata, descriptions, paragraphs — excluding code blocks, heading
 * anchors, buttons and sr-only text, capped per page and limited to the
 * first viewport. Each block starts settling once the wavy wipe edge has
 * passed it, so the unrest always plays out in the revealed area.
 * Everything restores to plain text nodes on completion, and before the
 * next visit snapshots the page.
 *
 * While a slot is unsettled it may briefly show a foreign ASCII glyph
 * (visual noise — the anagram invariant only holds at rest), and the post
 * title's per-char rise animation is replayed at the exact tick each slot
 * settles: decoding and rising are one cascade, not two effects in a row.
 */

import { CHARSET, onSweepFrame } from "./ascii-transition";

const EXCLUDE =
	"pre, code, .expressive-code, .anchor, .katex, svg, button, select, input, textarea, script, style, noscript, .sr-only";
const MAX_CHARS = 1600;
const TICK_MS = 36;
const SETTLE_TICKS = 26;
/* start settling just after the wipe edge has passed the block top, so
   the scramble plays in the revealed new-page area, not under the snapshot */
const LEAD_PX = -8;
/* random swaps among unsettled slots per tick, keeps the unrest alive */
const FLICKER_SWAPS = 3;
/* foreign-glyph substitutions per tick — makes the chaos legible at a
   glance for CJK text, where a pure self-permutation still reads as prose */
const GLITCH_SUBS = 2;

interface Unit {
	/** slot spans in document order */
	spans: HTMLSpanElement[];
	/** original char per slot */
	orig: string[];
	/** slot -> index of the orig char currently displayed there */
	arr: number[];
	/** element whose live position schedules the settle */
	host: HTMLElement;
	started: boolean;
	cursor: number;
	timer: ReturnType<typeof setInterval> | null;
	/** fired the tick a slot settles (title uses it to replay the rise) */
	onSettle?: (span: HTMLSpanElement, slot: number) => void;
	/** put the original DOM back */
	restore: () => void;
}

let active: Unit[] = [];
let unsubscribe: (() => void) | null = null;
let charBudget = 0;

const shuffled = (n: number): number[] => {
	const arr = Array.from({ length: n }, (_, i) => i);
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	/* a permutation that changes nothing is no shuffle */
	if (n > 1 && arr.every((v, i) => v === i))
		[arr[0], arr[1]] = [arr[1], arr[0]];
	return arr;
};

function paint(unit: Unit, slot: number) {
	const span = unit.spans[slot];
	span.textContent = unit.orig[unit.arr[slot]];
	span.classList.toggle("shuffle-pending", unit.arr[slot] !== slot);
}

function settle(unit: Unit) {
	if (unit.started) return;
	unit.started = true;
	const n = unit.spans.length;
	const step = Math.max(1, Math.ceil(n / SETTLE_TICKS));
	unit.timer = setInterval(() => {
		for (let k = 0; k < step && unit.cursor < n; k++) {
			const s = unit.cursor;
			/* selection sort: find the slot holding the char that belongs at s */
			const j = unit.arr.indexOf(s, s);
			[unit.arr[s], unit.arr[j]] = [unit.arr[j], unit.arr[s]];
			paint(unit, s);
			paint(unit, j);
			unit.cursor++;
			unit.onSettle?.(unit.spans[s], s);
		}
		for (let k = 0; k < FLICKER_SWAPS && unit.cursor < n; k++) {
			const a = unit.cursor + Math.floor(Math.random() * (n - unit.cursor));
			const b = unit.cursor + Math.floor(Math.random() * (n - unit.cursor));
			if (a !== b) {
				[unit.arr[a], unit.arr[b]] = [unit.arr[b], unit.arr[a]];
				paint(unit, a);
				paint(unit, b);
			}
		}
		/* foreign-glyph noise on unsettled slots: pure CJK self-permutations
		   still read as prose, so a few alien glyphs mark the chaos zone.
		   Only slots ahead of the cursor — they get repainted correctly
		   before the cursor passes them */
		for (let k = 0; k < GLITCH_SUBS && unit.cursor < n; k++) {
			const s = unit.cursor + Math.floor(Math.random() * (n - unit.cursor));
			const span = unit.spans[s];
			span.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
			span.classList.add("shuffle-pending");
		}
		if (unit.cursor >= n && unit.timer) {
			clearInterval(unit.timer);
			unit.timer = null;
			unit.restore();
		}
	}, TICK_MS);
}

function makeUnit(
	host: HTMLElement,
	spans: HTMLSpanElement[],
	orig: string[],
	restore: () => void,
	onSettle?: (span: HTMLSpanElement, slot: number) => void,
): Unit | null {
	if (orig.length < 2 || charBudget + orig.length > MAX_CHARS) return null;
	/* layout is in flux right after the swap (banner collapse, reveals), so
	   a strict viewport check here misfires — collect generously and let
	   the trigger re-measure live */
	const rect = host.getBoundingClientRect();
	if (rect.top > window.innerHeight * 1.5 || rect.bottom < 0) return null;
	charBudget += orig.length;
	const arr = shuffled(orig.length);
	for (let slot = 0; slot < arr.length; slot++) {
		spans[slot].textContent = orig[arr[slot]];
		spans[slot].classList.add("shuffle-pending");
		spans[slot].setAttribute("aria-hidden", "true");
	}
	return {
		spans,
		orig,
		arr,
		host,
		started: false,
		cursor: 0,
		timer: null,
		onSettle,
		restore,
	};
}

/* the post title is already server-split into per-char spans — shuffle
   those in place, no DOM surgery needed. Its per-char rise animation is
   suppressed inline while shuffling and replayed (delay 0) at the exact
   tick each char settles, so decoding and rising are one cascade. */
function makeTitleUnit(h1: HTMLElement): Unit | null {
	const spans = Array.from(
		h1.querySelectorAll<HTMLSpanElement>(".post-title-char"),
	);
	const orig = spans.map((span) => span.textContent ?? "");
	if (orig.length < 2) return null;
	const prevAria = h1.getAttribute("aria-label");
	const prevStyles = spans.map((span) => span.getAttribute("style"));
	h1.setAttribute("aria-label", orig.join(""));
	for (const span of spans) span.style.animation = "none";
	return makeUnit(
		h1,
		spans,
		orig,
		() => {
			for (let i = 0; i < spans.length; i++) {
				spans[i].textContent = orig[i];
				spans[i].classList.remove("shuffle-pending");
				spans[i].removeAttribute("aria-hidden");
				const prev = prevStyles[i];
				if (prev === null) spans[i].removeAttribute("style");
				else spans[i].setAttribute("style", prev);
			}
			if (prevAria === null) h1.removeAttribute("aria-label");
			else h1.setAttribute("aria-label", prevAria);
		},
		(span) => {
			span.style.animation = "";
			span.style.animationDelay = "0ms";
		},
	);
}

const HOLD = /[\s\p{P}\p{S}]/u;

function makeTextUnit(textNode: Text): Unit | null {
	const host = textNode.parentElement;
	const text = textNode.textContent ?? "";
	if (!host || text.trim().length < 2) return null;

	/* spaces, punctuation and symbols hold their ground — only word
	   characters join the shuffle, so wrapping barely moves */
	const chars = [...text].filter((ch) => !HOLD.test(ch));
	if (chars.length < 2 || charBudget + chars.length > MAX_CHARS) return null;
	const rect = host.getBoundingClientRect();
	if (rect.top > window.innerHeight * 1.5 || rect.bottom < 0) return null;

	const wrapper = document.createElement("span");
	wrapper.className = "shuffle-unit";
	const spans: HTMLSpanElement[] = [];
	const orig: string[] = [];
	for (const ch of text) {
		if (HOLD.test(ch)) {
			wrapper.appendChild(document.createTextNode(ch));
			continue;
		}
		const span = document.createElement("span");
		span.textContent = ch;
		spans.push(span);
		orig.push(ch);
		wrapper.appendChild(span);
	}

	const prevAria = host.getAttribute("aria-label");
	host.setAttribute("aria-label", text);
	textNode.parentNode?.replaceChild(wrapper, textNode);
	return makeUnit(host, spans, orig, () => {
		wrapper.replaceWith(document.createTextNode(text));
		if (prevAria === null) host.removeAttribute("aria-label");
		else host.setAttribute("aria-label", prevAria);
	});
}

function collect(main: HTMLElement): Unit[] {
	const units: Unit[] = [];
	for (const h1 of main.querySelectorAll<HTMLElement>("h1.post-title")) {
		const unit = makeTitleUnit(h1);
		if (unit) units.push(unit);
	}
	/* collect first, mutate later: replacing the walker's current node
	   would detach it and end the traversal early */
	const nodes: Text[] = [];
	const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode();
	while (node) {
		const parent = node.parentElement;
		if (
			parent &&
			(node.textContent?.trim().length ?? 0) >= 2 &&
			!parent.closest(EXCLUDE) &&
			!parent.closest("h1.post-title")
		) {
			nodes.push(node as Text);
		}
		node = walker.nextNode();
	}
	for (const textNode of nodes) {
		const unit = makeTextUnit(textNode);
		if (unit) units.push(unit);
	}
	return units;
}

function cleanupAll() {
	unsubscribe?.();
	unsubscribe = null;
	for (const unit of active) {
		if (unit.timer) clearInterval(unit.timer);
		unit.restore();
	}
	active = [];
}

function begin() {
	cleanupAll();
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const main = document.getElementById("swup-container");
	if (!main) return;
	charBudget = 0;
	active = collect(main);
	if (active.length === 0) return;
	unsubscribe = onSweepFrame((wipeY) => {
		for (const unit of active) {
			if (unit.started) continue;
			/* wipeY null = sweep finished: never leave shuffled text behind */
			if (wipeY === null) {
				settle(unit);
				continue;
			}
			/* measure live: post-swap layout (banner collapse, reveals) is
			   still settling when the units are prepared */
			const rect = unit.host.getBoundingClientRect();
			if (wipeY(rect.left + rect.width / 2) >= rect.top - LEAD_PX) {
				settle(unit);
			}
		}
	});
}

export function initShuffleText() {
	const setup = () => {
		if (!window.swup) return;
		window.swup.hooks.on("animation:in:start", begin);
		/* restore before the next visit snapshots the current page */
		window.swup.hooks.on("visit:start", cleanupAll);
	};

	if (window.swup?.hooks) {
		setup();
	} else {
		document.addEventListener("swup:enable", setup, { once: true });
	}
}
