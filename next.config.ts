import type { NextConfig } from "next";

// GitHub Pages serves the site from /<repo>/ as plain files. The deploy workflow sets PAGES_BASE_PATH,
// which switches on static export; local `npm run dev` / `npm run start` are unaffected.
const basePath = process.env.PAGES_BASE_PATH ?? "";
const isPages = basePath !== "";

const nextConfig: NextConfig = {
  // Static export cannot use partial prerendering, so these server features are off for Pages builds.
  cacheComponents: !isPages,
  partialPrefetching: !isPages,
  ...(isPages && { output: "export", basePath, trailingSlash: true }),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
