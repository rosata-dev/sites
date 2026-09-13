import { formatDateToYYYYMMDD } from "@utils/date-utils";
import { getSortedPosts } from "@utils/content-utils";
import { renderOgPng } from "@utils/og-image";
import type { APIRoute, GetStaticPaths } from "astro";

export const getStaticPaths: GetStaticPaths = async () => {
	const posts = await getSortedPosts();
	return posts.map((post) => ({
		params: { slug: post.slug },
		props: {
			title: post.data.title,
			date: formatDateToYYYYMMDD(post.data.published),
			category: post.data.category || "随笔",
			tags: post.data.tags ?? [],
		},
	}));
};

interface Props {
	title: string;
	date: string;
	category: string;
	tags: string[];
}

export const GET: APIRoute = async ({ props }) => {
	const { title, date, category, tags } = props as Props;
	const meta = [date, ...tags.slice(0, 3).map((t) => `#${t}`)].join(" · ");
	const png = await renderOgPng({
		title,
		kicker: category,
		meta,
		footer: "PERSONAL JOURNAL",
	});
	return new Response(new Blob([png], { type: "image/png" }));
};

export const prerender = true;
