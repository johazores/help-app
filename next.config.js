/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // App Router renders pages; Pages Router is used only for /pages/api endpoints.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking, MIME sniffing, and referrer hygiene.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
