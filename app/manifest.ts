import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sagip",
    short_name: "Sagip",
    description: "Set money aside for the people you love.",
    start_url: "/home",
    display: "standalone",
    background_color: "#F6F3EC",
    theme_color: "#0C3B3A",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
