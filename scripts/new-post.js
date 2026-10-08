/* This is a script to create a new post markdown file with front-matter */

import fs from "node:fs";
import path from "node:path";

function getDate() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

const APPS_ROOT = path.join(import.meta.dirname, "..", "apps");

// Discover apps that have a posts collection directory
const apps = fs
	.readdirSync(APPS_ROOT, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.filter((entry) =>
		fs.existsSync(path.join(APPS_ROOT, entry.name, "src", "content", "posts")),
	)
	.map((entry) => entry.name);

const args = process.argv.slice(2);

let appName = "rosata-cn"; // default app
const positional = [];
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--app" || args[i] === "-a") {
		appName = args[i + 1];
		i++;
	} else if (args[i].startsWith("--app=")) {
		appName = args[i].slice("--app=".length);
	} else {
		positional.push(args[i]);
	}
}

if (positional.length === 0) {
	console.error(`Error: No filename argument provided
Usage: pnpm new-post [--app <app>] <filename>
Available apps: ${apps.join(", ")} (default: rosata-cn)`);
	process.exit(1);
}

if (!apps.includes(appName)) {
	console.error(`Error: Unknown app "${appName}"
Available apps: ${apps.join(", ")}`);
	process.exit(1);
}

let fileName = positional[0];

// Add .md extension if not present
const fileExtensionRegex = /\.(md|mdx)$/i;
if (!fileExtensionRegex.test(fileName)) {
	fileName += ".md";
}

const targetDir = path.join(APPS_ROOT, appName, "src", "content", "posts");
const fullPath = path.join(targetDir, fileName);

if (fs.existsSync(fullPath)) {
	console.error(`Error: File ${fullPath} already exists `);
	process.exit(1);
}

// recursive mode creates multi-level directories
const dirPath = path.dirname(fullPath);
if (!fs.existsSync(dirPath)) {
	fs.mkdirSync(dirPath, { recursive: true });
}

const content = `---
title: ${positional[0]}
published: ${getDate()}
description: ''
image: ''
tags: []
category: ''
draft: false 
lang: ''
---
`;

fs.writeFileSync(path.join(targetDir, fileName), content);

console.log(`Post ${fullPath} created`);
