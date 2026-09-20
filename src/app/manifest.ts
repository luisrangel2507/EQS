import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EQS InspeccionAPP",
    short_name: "InspeccionAPP",
    description: "Control de inspecciones de calidad — Ethical Quality Services",
    start_url: "/",
    display: "standalone",
    background_color: "#142B6B",
    theme_color: "#142B6B",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
