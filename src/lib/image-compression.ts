const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  originalSizeMb: number;
  compressedSizeMb: number;
}

/**
 * Valida formato (JPG, PNG, WEBP) y peso de entrada, redimensiona manteniendo proporción
 * y comprime en el navegador usando Canvas antes de enviar al servidor.
 */
export async function validateAndCompressImage(
  file: File,
  options?: { maxInputMb?: number; maxDimension?: number; quality?: number }
): Promise<CompressedImageResult> {
  const maxInputMb = options?.maxInputMb ?? 15;
  const maxDimension = options?.maxDimension ?? 1600;
  const quality = options?.quality ?? 0.82;

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Formato no permitido. Solo se aceptan imágenes JPG, PNG o WEBP.');
  }

  const originalSizeMb = file.size / (1024 * 1024);
  if (originalSizeMb > maxInputMb) {
    throw new Error(`La imagen supera el peso máximo de entrada (${maxInputMb} MB).`);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo para comprimir la imagen.');
  }

  ctx.drawImage(img, 0, 0, width, height);

  const outputMime = 'image/webp';
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), outputMime, quality);
  });

  if (!blob) {
    throw new Error('Falló la compresión de la imagen.');
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const compressedFile = new File([blob], `${baseName}.webp`, { type: outputMime });
  const compressedSizeMb = compressedFile.size / (1024 * 1024);

  return {
    file: compressedFile,
    previewUrl: URL.createObjectURL(compressedFile),
    originalSizeMb: Number(originalSizeMb.toFixed(2)),
    compressedSizeMb: Number(compressedSizeMb.toFixed(2)),
  };
}