import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js dynamically requires its worker script by a path relative
  // to its own module location; bundling it breaks that. Let Node resolve
  // it directly from node_modules at runtime instead.
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;
