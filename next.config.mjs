/** @type {import('next').NextConfig} */
const nextConfig = {

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['firebase-admin'],
}

export default nextConfig
