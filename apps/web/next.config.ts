import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
      },
    ],
  },
  transpilePackages: ["@rustranked/database"],
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
