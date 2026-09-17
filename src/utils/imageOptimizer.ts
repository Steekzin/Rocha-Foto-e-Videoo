/**
 * Client-side photo optimization for high-resolution uploads.
 * Downscales multi-megapixel camera files (15MB-30MB) to optimal web dimensions (max 2400px),
 * preserving crisp photographer-grade detail while dramatically reducing upload times
 * and completely preventing payload size limits (nginx / Cloud Run 32MB limit).
 */
export async function optimizePhotoForWeb(
  file: File,
  maxDimension: number = 2400,
  quality: number = 0.85
): Promise<File> {
  if (typeof window === 'undefined') {
    return file;
  }

  const isImage =
    (file.type && file.type.startsWith('image/')) ||
    /\.(jpe?g|png|webp|avif|bmp|tiff?)$/i.test(file.name);

  if (!isImage) {
    return file;
  }

  // Already lightweight (under 750KB) - no need to compress
  if (file.size < 750 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    let finished = false;
    let url = '';

    const cleanup = () => {
      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }
    };

    // Safety timeout: if decoding hangs for 8s (e.g. unsupported RAW), resolve original file safely
    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve(file);
      }
    }, 8000);

    try {
      url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        cleanup();

        let { width, height } = img;
        if (!width || !height) {
          resolve(file);
          return;
        }

        // Calculate scaled dimensions maintaining aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob && (blob.size < file.size || width < img.width)) {
                const nameBase = file.name.replace(/\.[^/.]+$/, '').replace(/[/\\?%*:|"<>]/g, '_');
                const optimizedFile = new File([blob], `${nameBase}.jpg`, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(optimizedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        } catch (canvasErr) {
          console.warn('Canvas optimization error, fallback to original:', canvasErr);
          resolve(file);
        }
      };

      img.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        cleanup();
        resolve(file);
      };

      img.src = url;
    } catch (createErr) {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        cleanup();
        resolve(file);
      }
    }
  });
}
