<script lang="ts">
import { onMount } from "svelte";

import I18nKey from "../i18n/i18nKey";
import { i18n } from "../i18n/translation";
import { getPostUrlBySlug, url } from "../utils/url-utils";

export let tags: string[] = [];
export let categories: string[] = [];
export let sortedPosts: Post[] = [];

// The SSR pass renders the full, unfiltered list so the archive works
// without JS; URL query filters snap in after hydration.
let uncategorized: string | null = null;

onMount(() => {
	const params = new URLSearchParams(window.location.search);
	tags = params.getAll("tag");
	categories = params.getAll("category");
	uncategorized = params.get("uncategorized");
});

$: isFiltered = tags.length > 0 || categories.length > 0 || !!uncategorized;
$: filterLabel = uncategorized
	? i18n(I18nKey.uncategorized)
	: [
			...categories.map((c) => `${c}`),
			...tags.map((t) => `#${t}`),
		].join("  ·  ");

interface Post {
	slug: string;
	data: {
		title: string;
		tags: string[];
		category?: string | null;
		published: Date;
	};
}

interface Group {
	year: number;
	posts: Post[];
}

function buildGroups(
	posts: Post[],
	selTags: string[],
	selCategories: string[],
	selUncategorized: string | null,
): Group[] {
	let filtered = posts;
	if (selTags.length > 0) {
		filtered = filtered.filter(
			(post) =>
				Array.isArray(post.data.tags) &&
				post.data.tags.some((tag) => selTags.includes(tag)),
		);
	}
	if (selCategories.length > 0) {
		filtered = filtered.filter(
			(post) => post.data.category && selCategories.includes(post.data.category),
		);
	}
	if (selUncategorized) {
		filtered = filtered.filter((post) => !post.data.category);
	}

	const grouped = filtered.reduce(
		(acc, post) => {
			const year = post.data.published.getFullYear();
			if (!acc[year]) {
				acc[year] = [];
			}
			acc[year].push(post);
			return acc;
		},
		{} as Record<number, Post[]>,
	);

	return Object.keys(grouped)
		.map((yearStr) => ({
			year: Number.parseInt(yearStr, 10),
			posts: grouped[Number.parseInt(yearStr, 10)],
		}))
		.sort((a, b) => b.year - a.year);
}

$: groups = buildGroups(sortedPosts, tags, categories, uncategorized);

function formatDate(date: Date) {
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${month}-${day}`;
}

function formatTag(tagList: string[]) {
	return tagList.map((t) => `#${t}`).join(" ");
}
</script>

<div class="card-base px-8 py-6">
    {#if isFiltered}
        <div class="archive-filter flex items-end justify-between gap-4 pb-5 mb-4">
            <div class="min-w-0">
                <div class="filter-overline font-mono text-[0.65rem] tracking-[0.3em] uppercase">Filtered · 筛选视角</div>
                <div class="filter-name mt-2 truncate">{filterLabel}</div>
            </div>
            <a href={url("/archive/")} class="filter-clear shrink-0 font-mono text-xs tracking-wider" aria-label="清除筛选">×&nbsp;重置</a>
        </div>
    {/if}
    {#each groups as group, groupIndex}
        <div class="archive-group" class:border-sep={groupIndex > 0} data-year={group.year}>
            <div class="flex flex-row w-full items-baseline h-[4.5rem]">
                <div class="archive-year w-[15%] md:w-[10%] text-right">
                    {group.year}
                </div>
                <div class="w-[15%] md:w-[10%] self-center">
                    <div
                            class="h-3 w-3 bg-none rounded-full outline outline-[var(--primary)] mx-auto
                  -outline-offset-[2px] z-50 outline-3"
                    ></div>
                </div>
                <div class="archive-count w-[70%] md:w-[80%] text-left font-mono text-xs tracking-wider">
                    {group.posts.length} {i18n(group.posts.length === 1 ? I18nKey.postCount : I18nKey.postsCount)}
                </div>
            </div>

            {#each group.posts as post}
                <a
                        href={getPostUrlBySlug(post.slug)}
                        aria-label={post.data.title}
                        class="group btn-plain !block h-10 w-full rounded-lg hover:text-[initial]"
                >
                    <div class="flex flex-row justify-start items-center h-full">
                        <!-- date -->
                        <div class="w-[15%] md:w-[10%] transition text-sm text-right text-50 font-mono">
                            {formatDate(post.data.published)}
                        </div>

                        <!-- dot and line -->
                        <div class="w-[15%] md:w-[10%] relative dash-line h-full flex items-center">
                            <div
                                    class="archive-dot mx-auto w-1 h-1 rounded
                       bg-[oklch(0.5_0.05_var(--hue))]
                       outline outline-4 z-50
                       outline-[var(--card-bg)]"
                            ></div>
                        </div>

                        <!-- post title -->
                        <div
                                class="archive-title w-[70%] md:max-w-[65%] md:w-[65%] text-left
                     text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden"
                        >
                            {post.data.title}
                        </div>

                        <!-- tag list -->
                        <div
                                class="hidden md:block md:w-[15%] text-left text-sm transition
                     whitespace-nowrap overflow-ellipsis overflow-hidden text-30"
                        >
                            {formatTag(post.data.tags)}
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    {/each}
</div>

<style>
    .archive-filter {
        border-bottom: 1px solid var(--line-divider);
    }
    .filter-overline {
        color: var(--meta-divider);
    }
    .filter-name {
        font-family: var(--font-display);
        font-size: 1.75rem;
        font-weight: 560;
        line-height: 1.15;
        letter-spacing: 0.01em;
        color: var(--deep-text);
    }
    :global(:root.dark) .filter-name {
        color: rgb(255 255 255 / 0.88);
    }
    .filter-clear {
        color: var(--meta-divider);
        padding: 0.35rem 0.75rem;
        border: 1px solid var(--line-divider);
        border-radius: 999px;
        transition:
            color 0.3s ease,
            border-color 0.3s ease,
            transform 0.4s var(--ease-out-expo);
    }
    @media (hover: hover) {
        .filter-clear:hover {
            color: var(--primary);
            border-color: var(--primary);
            transform: translateY(-1px);
        }
    }

    .archive-group {
        position: relative;
    }
    /* Ghost numeral: the year redrawn huge in hairline outline behind its rows */
    .archive-group::after {
        content: attr(data-year);
        position: absolute;
        right: 0.25rem;
        top: -0.35rem;
        font-family: var(--font-display);
        font-size: clamp(4.5rem, 12vw, 7rem);
        font-weight: 600;
        line-height: 1;
        color: transparent;
        -webkit-text-stroke: 1px var(--line-divider);
        opacity: 0.55;
        pointer-events: none;
        user-select: none;
    }
    .archive-group.border-sep {
        border-top: 1px solid var(--line-divider);
        margin-top: 0.75rem;
        padding-top: 0.25rem;
    }
    .archive-year {
        font-family: var(--font-display);
        font-size: 1.85rem;
        font-weight: 560;
        line-height: 1;
        color: var(--btn-content);
    }
    .archive-count {
        color: var(--meta-divider);
    }
    .archive-title {
        font-family: var(--font-display);
        font-weight: 540;
        letter-spacing: 0.01em;
        transition:
            transform 0.5s var(--ease-out-expo),
            color 0.3s ease;
    }
    .archive-dot {
        transition:
            height 0.45s var(--ease-out-expo),
            transform 0.45s var(--ease-out-expo),
            background-color 0.3s ease,
            box-shadow 0.45s ease,
            outline-color 0.3s ease;
    }
    .archive-dot:global(.is-lit) {
        background-color: oklch(0.68 0.15 var(--hue));
        transform: scale(1.6);
        box-shadow: 0 0 10px 2px oklch(0.68 0.15 var(--hue) / 0.45);
    }
    @media (hover: hover) {
        a.group:hover .archive-title {
            transform: translateX(0.6rem);
            color: var(--primary);
        }
        a.group:hover .archive-dot {
            height: 1.25rem;
            background: var(--primary);
            outline-color: var(--btn-plain-bg-hover);
        }
    }
</style>
