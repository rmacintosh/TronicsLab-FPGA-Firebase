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
        destination: 'https://apphosting.us-central1.run.app/backends/tronicslab-fpga-firebase/image/process',
      },
    ];
  },
};

export default nextConfig;
