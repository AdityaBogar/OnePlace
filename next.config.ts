import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large GLB/GLTF files to be uploaded via the API route (up to 150MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '150mb',
    },
  },
};

export default nextConfig;
