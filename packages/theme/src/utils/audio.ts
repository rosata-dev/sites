/**
 * Featherweight Web Audio micro-interactions.
 *
 * - Off by default; the navbar toggle persists the choice in localStorage
 * - The AudioContext is created lazily on the first enabled interaction
 *   (satisfies autoplay policies: creation always follows a user gesture)
 * - Sounds are sub-30ms synthetic ticks at very low gain — texture, not music
 */

let ctx: AudioContext | null = null;
let enabled =
	typeof localStorage !== "undefined" && localStorage.getItem("sound") === "on";

export const soundEnabled = () => enabled;

export function setSound(on: boolean) {
	enabled = on;
	try {
		localStorage.setItem("sound", on ? "on" : "off");
	} catch {
		// private mode etc. — sound just stays session-scoped
	}
	if (!on && ctx) {
		ctx.close().catch(() => {});
		ctx = null;
	}
}

function ensureCtx(): AudioContext | null {
	if (!enabled) return null;
	if (!ctx) {
		try {
			ctx = new AudioContext();
		} catch {
			return null;
		}
	}
	if (ctx.state === "suspended") {
		ctx.resume().catch(() => {});
	}
	return ctx;
}

function blip(
	freq: number,
	duration: number,
	gain: number,
	type: OscillatorType,
) {
	const ac = ensureCtx();
	if (!ac) return;
	const osc = ac.createOscillator();
	const amp = ac.createGain();
	osc.type = type;
	osc.frequency.value = freq;
	const now = ac.currentTime;
	amp.gain.setValueAtTime(gain, now);
	amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
	osc.connect(amp).connect(ac.destination);
	osc.start(now);
	osc.stop(now + duration + 0.02);
	osc.onended = () => {
		osc.disconnect();
		amp.disconnect();
	};
}

/** Short high tick for hover-enter on interactive elements. */
export function tick() {
	blip(2200, 0.035, 0.012, "sine");
}

/** Soft low thock for primary activations (theme toggle, search). */
export function thock() {
	blip(160, 0.09, 0.03, "triangle");
}

let noiseBuffer: AudioBuffer | null = null;

/** Breathy bandpass whoosh for page transitions — air, not a beep. */
export function sweep() {
	const ac = ensureCtx();
	if (!ac) return;
	if (!noiseBuffer) {
		const len = Math.floor(ac.sampleRate * 0.3);
		noiseBuffer = ac.createBuffer(1, len, ac.sampleRate);
		const data = noiseBuffer.getChannelData(0);
		for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
	}
	const src = ac.createBufferSource();
	src.buffer = noiseBuffer;
	const filter = ac.createBiquadFilter();
	filter.type = "bandpass";
	filter.Q.value = 1.2;
	const amp = ac.createGain();
	const now = ac.currentTime;
	filter.frequency.setValueAtTime(420, now);
	filter.frequency.exponentialRampToValueAtTime(1600, now + 0.22);
	amp.gain.setValueAtTime(0.0001, now);
	amp.gain.exponentialRampToValueAtTime(0.02, now + 0.06);
	amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
	src.connect(filter).connect(amp).connect(ac.destination);
	src.start(now);
	src.stop(now + 0.26);
	src.onended = () => {
		src.disconnect();
		filter.disconnect();
		amp.disconnect();
	};
}
