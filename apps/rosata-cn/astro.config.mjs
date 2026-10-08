import { createSiteConfig } from "@rosata/theme/astro.config";
import { expressiveCodeConfig } from "./src/config.ts";

// https://astro.build/config
export default createSiteConfig({
	site: "https://rosata.cn/",
	root: import.meta.dirname,
	expressiveCodeConfig,
});
