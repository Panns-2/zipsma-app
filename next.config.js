/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: 'build',
    env: {
        GENKIT_ENV: 'prod',
    },
    experimental: {
        serverComponentsExternalPackages: ['firebase-admin', 'genkit', '@genkit-ai/core', '@opentelemetry/api', '@opentelemetry/instrumentation']
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            }
        ],
    },
};

module.exports = nextConfig;