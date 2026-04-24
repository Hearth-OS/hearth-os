/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },
};
module.exports = nextConfig;
