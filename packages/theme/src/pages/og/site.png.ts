import { siteConfig } from "@site/config";
import type { APIRoute } from "astro";
import { renderOgPng } from "../../utils/og-image";

export const GET: APIRoute = async ({ site }) => {
	const host = site ? new URL(site).hostname.toUpperCase() : "";
	const png = await renderOgPng({
		title: siteConfig.title,
		kicker: siteConfig.og?.kicker ?? "PERSONAL JOURNAL",
		meta: siteConfig.subtitle,
		footer: siteConfig.og?.footer ?? host,
	});
	return new Response(new Blob([png], { type: "image/png" }));
};

export const prerender = true;
