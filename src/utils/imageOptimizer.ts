/**
 * Client-side photo optimization for high-resolution uploads.
 * Downscales multi-megapixel camera files (15MB-30MB) to optimal web dimensions (max 2560px),
 * preserving crisp photographer-grade detail while dramatically reducing upload times
 * and preventing payload size and memory crashes.
 */
export async function optimizePhotoForWeb(
  file: File,
  maxDimension: number = 2560,
  quality: number = 0.88
): Promise<File> {
  if (!file.type.startsWith('image/') || typeof window === 'undefined') {
    return file;
  }

  // Already tiny
  if (file.size < 600 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // If dimensions are already reasonable and size is under 1.5MB, keep original
      if (width <= maxDimension && height <= maxDimension && file.size <= 1.5 * 1024 * 1024) {
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
              const nameBase = file.name.replace(/\.[^/.]+$/, '');
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
      } catch (err) {
        console.warn('Canvas optimization error, fallback to original:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
