/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure Next.js does not try to process the GLB file during SSR
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: 'asset/resource',
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.glb": {
        loaders: [],
        as: "*.glb"
      }
    }
  }
}

export default nextConfig
