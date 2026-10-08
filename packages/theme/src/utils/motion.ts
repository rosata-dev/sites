/**
 * Global motion infrastructure.
 *
 * - prefers-reduced-motion / touch detection (live, class-gated on <html>)
 * - Lenis smooth-scroll singleton (desktop wheel smoothing; touch stays native)
 * - Swup-aware lifecycle: per-page setup callbacks and cleanup registry
 *
 * Everything exported here is safe to import from any component script.
 */
import Lenis from "lenis";

let lenis: Lenis | null = null;
let rafId = 0;
let coreInitialized = false;

const reduceMotionQuery =
	typeof window !== "undefined"
		? window.matchMedia("(prefers-reduced-motion: reduce)")
		: null;

export const reducedMotion = () => reduceMotionQuery?.matches ?? true;

export const isTouch = () =>
	typeof window !== "undefined" &&
	(navigator.maxTouchPoints > 0 ||
		window.matchMedia("(pointer: coarse)").matches);

/** True when rich motion is allowed for the current user/device. */
export const motionOK = () => !reducedMotion();

export const getLenis = () => lenis;

/* ------------------------------------------------------------------ */
/* Swup-aware lifecycle                                                */
/* ------------------------------------------------------------------ */

const pageCleanups = new Set<() => void>();
const pageViewListeners = new Set<() => void>();

/**
 * Register a teardown callback for page-scoped effects (GSAP timelines,
 * ScrollTriggers, observers, rAF loops...). Runs once, right before Swup
 * swaps the page content, or when manually invoked via the returned
 * unsubscribe function.
 */
export function registerPageCleanup(fn: () => void): () => void {
	pageCleanups.add(fn);
	return () => {
		pageCleanups.delete(fn);
	};
}

/**
 * Register a callback fired on the initial load and after every Swup
 * navigation (`page:view`). Use together with registerPageCleanup.
 */
export function onPageView(fn: () => void): () => void {
	pageViewListeners.add(fn);
	return () => {
		pageViewListeners.delete(fn);
	};
}

function runPageCleanups() {
	for (const fn of [...pageCleanups]) {
		try {
			fn();
		} catch (e) {
			console.error("[motion] cleanup failed", e);
		}
	}
	pageCleanups.clear();
}

function emitPageView() {
	for (const fn of [...pageViewListeners]) {
		try {
			fn();
		} catch (e) {
			console.error("[motion] page:view listener failed", e);
		}
	}
}

/* ------------------------------------------------------------------ */
/* Smooth scrolling                                                    */
/* ------------------------------------------------------------------ */

const lenisRaf = (time: number) => {
	lenis?.raf(time);
	rafId = requestAnimationFrame(lenisRaf);
};

function startLenis() {
	if (lenis || reducedMotion()) return;
	lenis = new Lenis({
		duration: 1.15,
		easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
		smoothWheel: true,
		// Touch devices keep their native scroll physics
		syncTouch: false,
		anchors: { offset: -80 },
	});
	document.documentElement.classList.add("lenis-active");
	rafId = requestAnimationFrame(lenisRaf);
}

/* Same-page anchor clicks (TOC, heading anchors, skip link): take
   deterministic ownership in the capture phase so neither Swup's
   link:anchor handling nor Lenis' anchor delegation can race us. */
function initAnchorLinks() {
	document.addEventListener(
		"click",
		(event) => {
			const anchor = (event.target as Element | null)?.closest?.(
				'a[href^="#"]',
			);
			if (!anchor) return;
			const hash = anchor.getAttribute("href") ?? "";
			if (hash.length <= 1) return;
			const target = document.getElementById(decodeURIComponent(hash.slice(1)));
			if (!target) return;
			event.preventDefault();
			event.stopPropagation();
			scrollToTarget(target, { offset: -80 });
			history.pushState(null, "", hash);
		},
		{ capture: true },
	);
}

function stopLenis() {
	if (!lenis) return;
	cancelAnimationFrame(rafId);
	lenis.destroy();
	lenis = null;
	document.documentElement.classList.remove("lenis-active");
}

/**
 * Scroll helper that respects the current motion mode: buttery Lenis
 * scroll when available, instant native jump otherwise.
 */
export function scrollToTarget(
	target: number | string | HTMLElement,
	options: { offset?: number; immediate?: boolean } = {},
) {
	if (lenis) {
		lenis.scrollTo(target, {
			offset: options.offset ?? -80,
			immediate: options.immediate ?? false,
		});
		return;
	}
	const offset = options.offset ?? -80;
	if (typeof target === "number") {
		window.scrollTo({ top: target, behavior: "auto" });
		return;
	}
	const el =
		typeof target === "string" ? document.querySelector(target) : target;
	if (el instanceof HTMLElement) {
		const top = el.getBoundingClientRect().top + window.scrollY + offset;
		window.scrollTo({ top, behavior: "auto" });
	}
}

/* ------------------------------------------------------------------ */
/* Core init (called once from Layout)                                 */
/* ------------------------------------------------------------------ */

function applyEnvironmentClasses() {
	document.documentElement.classList.toggle("reduced-motion", reducedMotion());
	document.documentElement.classList.toggle("is-touch", isTouch());
}

export function initMotionCore() {
	if (coreInitialized) return;
	coreInitialized = true;

	applyEnvironmentClasses();
	startLenis();
	initAnchorLinks();

	reduceMotionQuery?.addEventListener("change", () => {
		applyEnvironmentClasses();
		if (reducedMotion()) {
			stopLenis();
		} else {
			startLenis();
		}
	});

	const setup = () => {
		if (!window.swup) return;
		// Kill page-scoped effects right before the DOM is swapped
		window.swup.hooks.on("content:replace", runPageCleanups, {
			before: true,
		});
		window.swup.hooks.on("page:view", emitPageView);
		// Land at the top of the next page while the transition field
		// still fully covers the viewport
		window.swup.hooks.on("content:replace", () => {
			lenis?.scrollTo(0, { immediate: true, force: true });
		});
	};

	if (window.swup?.hooks) {
		setup();
	} else {
		document.addEventListener("swup:enable", setup, { once: true });
	}

	// First paint counts as a page view for pages that never navigate
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", emitPageView, {
			once: true,
		});
	} else {
		emitPageView();
	}
}
