/**
 * Client-side image compression — native Canvas API only.
 *
 * Replaces `browser-image-compression`, whose web-worker WebP encoding path
 * silently produced blank ~516-byte images on this project. This version uses
 * only the platform Canvas API (no third-party package, no web worker):
 *
 *   1. Decode the file with `createImageBitmap` (fast, off-main-thread,
 *      EXIF-aware), falling back to an <img> element if unavailable.
 *   2. Downscale so the longest edge is at most MAX_EDGE px.
 *   3. Encode to WebP via `canvas.toBlob`, stepping the quality down until
 *      the result fits under `maxSizeMB`.
 *
 * Defensive by design: on ANY failure — decode error, no 2D context, a null
 * blob, or a degenerate sub-1 KB output — it returns the ORIGINAL file
 * untouched. Better a slightly larger upload than a blank image.
 */

const MAX_EDGE = 1920
const QUALITY_STEPS = [0.82, 0.65, 0.5, 0.38, 0.28]
/** A real photo never encodes below this; anything smaller is degenerate. */
const MIN_VALID_BYTES = 1024

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
      // fall through to the <img> path
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("image decode failed"))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality)
  })
}

export async function compressToWebP(file: File, maxSizeMB = 1): Promise<File> {
  const maxBytes = maxSizeMB * 1024 * 1024
  try {
    const source = await decodeImage(file)
    const isImg = source instanceof HTMLImageElement
    const srcW = isImg ? source.naturalWidth : source.width
    const srcH = isImg ? source.naturalHeight : source.height
    if (!srcW || !srcH) {
      if (!isImg) source.close()
      console.warn("[compressToWebP] could not read image dimensions — keeping original")
      return file
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH))
    const w = Math.max(1, Math.round(srcW * scale))
    const h = Math.max(1, Math.round(srcH * scale))

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      if (!isImg) source.close()
      console.warn("[compressToWebP] no 2D context — keeping original")
      return file
    }
    ctx.drawImage(source as CanvasImageSource, 0, 0, w, h)
    if (!isImg) source.close()

    let best: Blob | null = null
    for (const quality of QUALITY_STEPS) {
      const blob = await encode(canvas, quality)
      if (!blob) continue
      best = blob
      if (blob.size <= maxBytes) break
    }

    // Degenerate-output guard: a blank canvas encodes to a tiny fixed blob.
    if (!best || (best.size < MIN_VALID_BYTES && file.size >= MIN_VALID_BYTES)) {
      console.warn(
        "[compressToWebP] degenerate output — keeping original",
        JSON.stringify({ inputSize: file.size, outputSize: best?.size ?? 0 }),
      )
      return file
    }

    // If WebP somehow ends up larger than the source (already-optimised small
    // images), keep the original — no point uploading something bigger.
    if (best.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp"
    return new File([best], name, { type: "image/webp" })
  } catch (err) {
    console.warn("[compressToWebP] failed — keeping original file:", err)
    return file
  }
}

export async function validateMinDimensions(
  file: File,
  minWidth: number,
  minHeight: number,
): Promise<boolean> {
  const src = URL.createObjectURL(file)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("Image invalide"))
      image.src = src
    })
    return image.naturalWidth >= minWidth && image.naturalHeight >= minHeight
  } finally {
    URL.revokeObjectURL(src)
  }
}
