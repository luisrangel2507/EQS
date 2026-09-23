import type { MetadataRoute } from "next";
import { NOMBRE_APP, NOMBRE_CORTO, DESCRIPCION_APP } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOMBRE_APP,
    short_name: NOMBRE_CORTO,
    description: DESCRIPCION_APP,
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
