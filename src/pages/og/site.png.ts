import { siteConfig } from "@/config";
import { renderOgPng } from "@utils/og-image";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
	const png = await renderOgPng({
		title: siteConfig.title,
		kicker: "PERSONAL JOURNAL",
		meta: siteConfig.subtitle,
		footer: "ROSATA.CN",
	});
	return new Response(new Blob([png], { type: "image/png" }));
};

export const prerender = true;
