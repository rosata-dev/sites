/**
 * Page-scoped motion effects, built on GSAP + ScrollTrigger.
 *
 * All effects are registered through the motion bus so they are torn down
 * before Swup swaps the page (no leaked ScrollTriggers, tweens or listeners).
 * Everything is a no-op under prefers-reduced-motion.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { thock, tick } from "./audio";
import {
	getLenis,
	isTouch,
	motionOK,
	onPageView,
	registerPageCleanup,
} from "./motion";

gsap.registerPlugin(ScrollTrigger);

let initialized = false;
let lenisSynced = false;
let pageActive = false;

function syncLenis() {
	const lenis = getLenis();
	if (lenis && !lenisSynced) {
		lenis.on("scroll", ScrollTrigger.update);
		lenisSynced = true;
	}
}

/**
 * Scroll-linked reveal: elements tagged `data-reveal` fade/rise in when
 * entering the viewport. Optional `data-reveal-delay` (seconds).
 * Must be called inside a gsap.context callback so tweens are recorded.
 */
function setupReveals() {
	/* Swup-swapped pages render settled (see transition.css .swup-swapped):
	   rising cards under the ASCII sweep read as a bounce after the wipe. */
	if (document.documentElement.classList.contains("swup-swapped")) return;
	const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
	// blur is a GPU-heavy filter; touch devices get a lighter rise-only reveal
	const blur = isTouch() ? "blur(0px)" : "blur(6px)";
	for (const el of targets) {
		gsap.fromTo(
			el,
			{ y: 44, autoAlpha: 0, filter: blur },
			{
				y: 0,
				autoAlpha: 1,
				filter: "blur(0px)",
				duration: 1.15,
				ease: "expo.out",
				delay: Number.parseFloat(el.dataset.revealDelay || "0"),
				scrollTrigger: {
					trigger: el,
					start: "top 88%",
					once: true,
				},
			},
		);
	}
}

/**
 * Magnetic pull for `data-magnetic` elements (buttons, nav links).
 * `data-magnetic="0.4"` tunes the strength. Desktop pointers only.
 */
function setupMagnetic(cleanups: Array<() => void>) {
	if (isTouch()) return;
	for (const el of gsap.utils.toArray<HTMLElement>("[data-magnetic]")) {
		const strength = Number.parseFloat(el.dataset.magnetic || "0.35");
		const xTo = gsap.quickTo(el, "x", {
			duration: 0.9,
			ease: "elastic.out(1, 0.35)",
		});
		const yTo = gsap.quickTo(el, "y", {
			duration: 0.9,
			ease: "elastic.out(1, 0.35)",
		});
		const onMove = (e: PointerEvent) => {
			const r = el.getBoundingClientRect();
			xTo((e.clientX - (r.left + r.width / 2)) * strength);
			yTo((e.clientY - (r.top + r.height / 2)) * strength);
		};
		const onEnter = () => tick();
		const onLeave = () => {
			xTo(0);
			yTo(0);
		};
		el.addEventListener("pointermove", onMove, { passive: true });
		el.addEventListener("pointerenter", onEnter, { passive: true });
		el.addEventListener("pointerleave", onLeave);
		cleanups.push(() => {
			el.removeEventListener("pointermove", onMove);
			el.removeEventListener("pointerenter", onEnter);
			el.removeEventListener("pointerleave", onLeave);
			gsap.set(el, { x: 0, y: 0 });
		});
	}
}

/**
 * Reading progress bar for article pages. The bar element lives in the
 * root layout (outside the Swup containers); it is only activated when
 * the current page actually contains article markup.
 */
function setupReadingProgress(cleanups: Array<() => void>) {
	const bar = document.getElementById("reading-progress");
	const article = document.querySelector(".custom-md");
	if (!bar || !article) return;
	bar.classList.add("is-active");
	gsap.fromTo(
		bar,
		{ scaleX: 0 },
		{
			scaleX: 1,
			ease: "none",
			scrollTrigger: {
				trigger: article,
				start: "top 75%",
				end: "bottom 85%",
				scrub: 0.4,
			},
		},
	);
	cleanups.push(() => {
		bar.classList.remove("is-active");
		gsap.set(bar, { scaleX: 0 });
	});
}

/**
 * Scroll-driven parallax on the home hero: the title drifts up and fades
 * while the generative canvas sinks slower, splitting the depth planes.
 */
function setupHeroParallax() {
	if (isTouch()) return;
	if (!document.body.classList.contains("lg:is-home")) return;
	const title = document.getElementById("hero-title");
	const fx = document.getElementById("hero-fx");
	if (!title || !fx) return;
	// the stylesheet fades the title with a CSS transition; scrub needs
	// direct control over opacity, so the transition is suspended here
	gsap.set(title, { transition: "none" });
	gsap.to(title, {
		yPercent: -22,
		autoAlpha: 0,
		ease: "none",
		scrollTrigger: {
			trigger: "#banner-wrapper",
			start: "top top",
			end: "bottom 40%",
			scrub: 0.6,
		},
	});
	gsap.to(fx, {
		yPercent: 10,
		ease: "none",
		scrollTrigger: {
			trigger: "#banner-wrapper",
			start: "top top",
			end: "bottom top",
			scrub: 0.8,
		},
	});
}

/**
 * 404 gravity well: particles orbit a central void on `#void-canvas`,
 * with a gentle inward pull, tangential drift and cursor repulsion.
 * Trails are produced by fading the previous frame with the page bg.
 */
function setupVoidField(cleanups: Array<() => void>) {
	const canvas = document.getElementById(
		"void-canvas",
	) as HTMLCanvasElement | null;
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const styles = getComputedStyle(document.documentElement);
	const hue = Number.parseFloat(styles.getPropertyValue("--hue")) || 205;
	const bg = styles.getPropertyValue("--page-bg").trim() || "#fff";
	const dark = document.documentElement.classList.contains("dark");
	const strokeColor = dark
		? `oklch(0.78 0.12 ${hue} / 0.55)`
		: `oklch(0.45 0.13 ${hue} / 0.5)`;

	const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
	const resize = () => {
		canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
		canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	};
	resize();
	const ro = new ResizeObserver(resize);
	ro.observe(canvas);

	interface Orbiter {
		angle: number;
		radius: number;
		speed: number;
		x: number;
		y: number;
		px: number;
		py: number;
		vx: number;
		vy: number;
	}
	const COUNT = Math.min(
		260,
		Math.floor((canvas.clientWidth * canvas.clientHeight) / 2600),
	);
	const orbiters: Orbiter[] = [];
	const maxR = () => Math.min(canvas.width, canvas.height) * 0.46;
	for (let i = 0; i < COUNT; i++) {
		orbiters.push({
			angle: Math.random() * Math.PI * 2,
			radius: (0.15 + Math.random() * 0.85) * maxR(),
			speed: (0.0016 + Math.random() * 0.0035) * (Math.random() < 0.5 ? 1 : -1),
			x: 0,
			y: 0,
			px: 0,
			py: 0,
			vx: 0,
			vy: 0,
		});
	}

	let cx = canvas.width / 2;
	let cy = canvas.height / 2;
	let mouseX = -9999;
	let mouseY = -9999;
	const onMove = (e: PointerEvent) => {
		const r = canvas.getBoundingClientRect();
		mouseX = (e.clientX - r.left) * dpr;
		mouseY = (e.clientY - r.top) * dpr;
	};
	const onLeave = () => {
		mouseX = -9999;
		mouseY = -9999;
	};
	canvas.parentElement?.addEventListener("pointermove", onMove, {
		passive: true,
	});
	canvas.parentElement?.addEventListener("pointerleave", onLeave);

	/* Pointer press detonates a radial shockwave through the field,
	   answered by a low thock. */
	const onPress = (e: PointerEvent) => {
		const r = canvas.getBoundingClientRect();
		const ox = (e.clientX - r.left) * dpr;
		const oy = (e.clientY - r.top) * dpr;
		const range = 340 * dpr;
		for (const o of orbiters) {
			const dx = o.x - ox;
			const dy = o.y - oy;
			const distSq = dx * dx + dy * dy;
			if (distSq < range * range && distSq > 0.01) {
				const dist = Math.sqrt(distSq);
				const force = (1 - dist / range) * 34 * dpr;
				o.vx += (dx / dist) * force;
				o.vy += (dy / dist) * force;
			}
		}
		thock();
	};
	canvas.parentElement?.addEventListener("pointerdown", onPress);

	let raf = 0;
	let running = true;
	const loop = () => {
		if (!running) return;
		cx += (canvas.width / 2 - cx) * 0.05;
		cy += (canvas.height / 2 - cy) * 0.05;
		ctx.fillStyle = bg;
		ctx.globalAlpha = 0.085;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = 1;
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = dpr;
		ctx.beginPath();
		for (const o of orbiters) {
			o.angle += o.speed;
			// slow breathing of the orbit radius + weak pull toward the void
			o.radius += Math.sin(o.angle * 3 + o.speed * 9000) * 0.12 * dpr;
			let x = cx + Math.cos(o.angle) * o.radius;
			let y = cy + Math.sin(o.angle) * o.radius * 0.62;
			// cursor repulsion
			const dx = x - mouseX;
			const dy = y - mouseY;
			const distSq = dx * dx + dy * dy;
			const range = 150 * dpr;
			if (distSq < range * range && distSq > 0.01) {
				const dist = Math.sqrt(distSq);
				const force = (1 - dist / range) * 26 * dpr;
				x += (dx / dist) * force;
				y += (dy / dist) * force;
			}
			if (o.px || o.py) {
				ctx.moveTo(o.px, o.py);
				ctx.lineTo(x, y);
			}
			// shockwave velocity, damped back into the orbit
			x += o.vx;
			y += o.vy;
			o.vx *= 0.93;
			o.vy *= 0.93;
			o.px = x;
			o.py = y;
			o.x = x;
			o.y = y;
		}
		ctx.stroke();
		raf = requestAnimationFrame(loop);
	};
	raf = requestAnimationFrame(loop);

	cleanups.push(() => {
		running = false;
		cancelAnimationFrame(raf);
		ro.disconnect();
		canvas.parentElement?.removeEventListener("pointermove", onMove);
		canvas.parentElement?.removeEventListener("pointerleave", onLeave);
		canvas.parentElement?.removeEventListener("pointerdown", onPress);
	});
}

/**
 * Archive timeline: dots along the spine light up as their row crosses
 * the reading line (55% viewport height) and stay lit afterwards.
 * Year numerals drift on a slow scrub parallax, so the spine feels like
 * it moves at a different depth than the rows.
 */
function setupArchiveTimeline() {
	const dots = gsap.utils.toArray<HTMLElement>(".archive-dot");
	for (const dot of dots) {
		ScrollTrigger.create({
			trigger: dot,
			start: "top 55%",
			end: "max",
			toggleClass: { targets: dot, className: "is-lit" },
		});
	}
	for (const year of gsap.utils.toArray<HTMLElement>(".archive-year")) {
		gsap.fromTo(
			year,
			{ y: 26 },
			{
				y: -26,
				ease: "none",
				scrollTrigger: {
					trigger: year,
					start: "top bottom",
					end: "bottom top",
					scrub: true,
				},
			},
		);
	}
}

/**
 * Velocity-reactive marquee: the word ticker takes over from its CSS
 * animation and is driven by GSAP instead. Scroll velocity scales the
 * loop's playback rate — scroll down hard and it surges, scroll up and
 * it runs backwards; it always relaxes back to cruising speed.
 */
function setupMarqueeVelocity() {
	const track = document.querySelector<HTMLElement>(".marquee-track");
	if (!track) return;
	track.style.animation = "none";
	const loop = gsap.to(track, {
		xPercent: -50,
		ease: "none",
		duration: 30,
		repeat: -1,
	});
	let settle: gsap.core.Tween | null = null;
	ScrollTrigger.create({
		onUpdate(self) {
			const boost = gsap.utils.clamp(-3, 3, self.getVelocity() / -900);
			loop.timeScale(1 + boost);
			settle?.kill();
			settle = gsap.to(loop, {
				timeScale: 1,
				duration: 1.4,
				delay: 0.1,
				ease: "power2.out",
			});
		},
	});
}

/**
 * Footer colophon reacts to scroll velocity: fast scrolling shears the
 * giant title and opens its letter-spacing, then it settles back with an
 * elastic ease — the page's full stop answers how hard you arrived.
 */
function setupFooterVelocity(cleanups: Array<() => void>) {
	if (isTouch()) return;
	const title = document.querySelector<HTMLElement>(".footer-title");
	if (!title) return;
	const state = { skew: 0, track: 0 };
	const apply = () => {
		title.style.transform = `skewX(${state.skew}deg)`;
		title.style.letterSpacing = `${0.01 + state.track}em`;
	};
	cleanups.push(() => {
		title.style.transform = "";
		title.style.letterSpacing = "";
	});
	let rebound: gsap.core.Tween | null = null;
	ScrollTrigger.create({
		trigger: title,
		start: "top bottom",
		end: "bottom top",
		onUpdate(self) {
			const v = gsap.utils.clamp(-1, 1, self.getVelocity() / 2200);
			state.skew = v * -4.5;
			state.track = Math.abs(v) * 0.05;
			apply();
			rebound?.kill();
			rebound = gsap.to(state, {
				skew: 0,
				track: 0,
				duration: 1.1,
				delay: 0.08,
				ease: "elastic.out(1, 0.4)",
				onUpdate: apply,
			});
		},
	});
}

/**
 * Navigation click texture: a faint tick on TOC entries, prev/next post
 * navigation and pagination — the sound layer acknowledges wayfinding.
 */
function setupNavTicks(cleanups: Array<() => void>) {
	const targets = document.querySelectorAll<HTMLElement>(
		".toc-entry, .post-nav-link, .page-num",
	);
	for (const el of targets) {
		el.addEventListener("click", tick);
		cleanups.push(() => el.removeEventListener("click", tick));
	}
}

/**
 * Pointer-driven 3D tilt for `data-tilt` cards (sidebar profile): the
 * card leans toward the cursor with a soft power curve and settles flat
 * on leave. Desktop pointers only.
 */
function setupCardTilt(cleanups: Array<() => void>) {
	if (isTouch()) return;
	for (const el of gsap.utils.toArray<HTMLElement>("[data-tilt]")) {
		gsap.set(el, { transformPerspective: 800 });
		const rx = gsap.quickTo(el, "rotationX", {
			duration: 0.7,
			ease: "power3.out",
		});
		const ry = gsap.quickTo(el, "rotationY", {
			duration: 0.7,
			ease: "power3.out",
		});
		const onMove = (e: PointerEvent) => {
			const r = el.getBoundingClientRect();
			const px = (e.clientX - r.left) / r.width - 0.5;
			const py = (e.clientY - r.top) / r.height - 0.5;
			ry(px * 6);
			rx(-py * 6);
		};
		const onLeave = () => {
			rx(0);
			ry(0);
		};
		el.addEventListener("pointermove", onMove, { passive: true });
		el.addEventListener("pointerleave", onLeave);
		cleanups.push(() => {
			el.removeEventListener("pointermove", onMove);
			el.removeEventListener("pointerleave", onLeave);
			gsap.set(el, { rotationX: 0, rotationY: 0 });
		});
	}
}

function setupPage() {
	if (!motionOK() || pageActive) return;
	pageActive = true;
	syncLenis();

	const listenerCleanups: Array<() => void> = [];
	const ctx = gsap.context(() => {
		setupReveals();
		setupMagnetic(listenerCleanups);
		setupHeroParallax();
		setupReadingProgress(listenerCleanups);
		setupVoidField(listenerCleanups);
		setupArchiveTimeline();
		setupMarqueeVelocity();
		setupCardTilt(listenerCleanups);
		setupFooterVelocity(listenerCleanups);
		setupNavTicks(listenerCleanups);
	});

	// Layout has settled after the Swup swap; recalculate trigger positions
	requestAnimationFrame(() => ScrollTrigger.refresh());

	registerPageCleanup(() => {
		pageActive = false;
		ctx.revert();
		for (const fn of listenerCleanups) fn();
	});
}

export function initEffects() {
	if (initialized) return;
	initialized = true;
	if (motionOK()) {
		// gates the CSS pre-hidden state of [data-reveal] elements
		document.documentElement.classList.add("fx");
	}
	onPageView(setupPage);
	// the initial page:view may already have fired before this module
	// was dynamically imported — set up the current page directly
	setupPage();
	window.addEventListener("load", () => ScrollTrigger.refresh(), {
		once: true,
	});
}
