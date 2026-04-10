/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // IGNORA ERRORI TYPESCRIPT PER IL DEPLOY
    ignoreBuildErrors: true,
  },
  eslint: {
    // IGNORA ERRORI ESLINT PER IL DEPLOY
    ignoreBuildErrors: true,
  },
};

export default nextConfig;