/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  },
};
module.exports = nextConfig;
