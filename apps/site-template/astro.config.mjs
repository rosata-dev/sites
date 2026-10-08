import { createSiteConfig } from "@rosata/theme/astro.config";
import { expressiveCodeConfig } from "./src/config.ts";

// https://astro.build/config
// 模板站点：新建站点时替换 site 为真实域名（末尾保留 /）。
export default createSiteConfig({
	site: "https://example.com/",
	root: import.meta.dirname,
	expressiveCodeConfig,
});
