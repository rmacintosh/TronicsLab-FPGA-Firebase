/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './loader.js',
  },
  async rewrites() {
    return [
      {
        source: '/_fah/image/process',
        destination: process.env.APP_HOSTING_IMAGE_TRANSFORMATION_URL || 'https://apphosting.us-central1.run.app/backends/placeholder/image/process',
      },
    ];
  },
};

export default nextConfig;
