"use client"

export default function myImageLoader({ src, width, quality }) {
  // If the image is being served from the local development server,
  // we don't need to do anything.
  if (process.env.NODE_ENV === "development") {
    return src;
  }

  // Otherwise, we build a URL for the Firebase App Hosting image processing service.
  // This service can resize and convert images to modern formats like WebP.
  const operations = [
    {
      operation: "input",
      type: "url",
      // The 'src' is the original path to your image, e.g., /placeholder-images/fpga-basics.png
      url: src,
    },
    { operation: "resize", width: width },
    { operation: "output", format: "webp", quality: quality || 75 },
  ];

  const encodedOperations = encodeURIComponent(JSON.stringify(operations));

  return `/_fah/image/process?operations=${encodedOperations}`;
}
