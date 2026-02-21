import imageCompression from "browser-image-compression"

export async function compressToWebP(file: File, maxSizeMB = 1): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/webp",
  })
  return compressed
}

export async function validateMinDimensions(file: File, minWidth: number, minHeight: number): Promise<boolean> {
  const src = URL.createObjectURL(file)
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error("Image invalide"))
    image.src = src
  })
  const ok = image.naturalWidth >= minWidth && image.naturalHeight >= minHeight
  URL.revokeObjectURL(src)
  return ok
}
