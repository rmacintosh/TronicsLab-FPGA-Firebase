"use client"

export default function myImageLoader({ src, width, quality }) {
  // If the image is being served from the local development server,
  // we don't need to do anything.
  if (process.env.NODE_ENV === "development") {
    return src;
  }

  // The image processor service needs a full, absolute URL to fetch the source image.
  // We construct this using the NEXT_PUBLIC_SITE_URL environment variable.
  const absoluteSrc = `${process.env.NEXT_PUBLIC_SITE_URL}${src}`;
 
  // Otherwise, we build a URL for the Firebase App Hosting image processing service.
  // This service can resize and convert images to modern formats like WebP.
  const operations = [
    {
      operation: "input",
      type: "url",
      // Provide the absolute URL to the source image.
      url: absoluteSrc,
    },
    { operation: "resize", width: width },
    { operation: "output", format: "webp", quality: quality || 75 },
  ];

  const encodedOperations = encodeURIComponent(JSON.stringify(operations));

  return `/_fah/image/process?operations=${encodedOperations}`;
}
