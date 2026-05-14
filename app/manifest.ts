import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Olympiad Codex",
    short_name: "Codex",
    description: "A private Olympiad mathematics knowledge system.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f9f9f9",
    theme_color: "#0e3b69",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
