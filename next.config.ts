import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Solo metadatos, archivos se suben client-side a Storage
    },
  },
};

export default nextConfig;
