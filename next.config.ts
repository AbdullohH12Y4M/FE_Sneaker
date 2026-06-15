import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudinary SDK uses Node.js native modules — must run in Node.js runtime, not Edge.
  // This prevents Next.js from trying to bundle it and causing runtime errors.
  serverExternalPackages: ['cloudinary'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'nyhivufkiluxdquuueuh.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
};

export default nextConfig;
