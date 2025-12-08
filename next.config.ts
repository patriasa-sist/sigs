import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb', // Aumentado de 1mb (default) a 20mb para soportar carga de documentos
    },
    // Aumentar límite del middleware para permitir archivos grandes en requests
    middlewareClientMaxBodySize: '20mb', // Aumentado de 10mb (default) a 20mb
  },
};

export default nextConfig;
