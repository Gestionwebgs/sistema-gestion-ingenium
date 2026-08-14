import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js y pdf-parse resuelven sus workers (worker.js / pdf.worker.mjs)
  // con una ruta relativa a su propio módulo; si Turbopack los empaqueta, esa
  // ruta se rompe (síntoma: "Cannot find module '...pdf.worker.mjs'..." /
  // "Setting up fake worker failed"). Dejamos que Node los resuelva
  // directamente desde node_modules en tiempo de ejecución en vez de
  // empaquetarlos.
  serverExternalPackages: ["tesseract.js", "pdf-parse"],
};

export default nextConfig;
