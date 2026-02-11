/**
 * Converts an image URL to base64 data URL.
 * Uses multiple strategies to handle CORS issues:
 * 1. Vite dev server proxy (most reliable for dev)
 * 2. Direct fetch with CORS
 * 3. Canvas-based approach as fallback
 * 
 * @param imageUrl - The URL of the image to convert
 * @returns Promise resolving to base64 data URL, or original URL if all strategies fail
 */
export async function urlToBase64(imageUrl: string): Promise<string | null> {
  // Skip if already a data URL
  if (isDataUrl(imageUrl)) {
    return imageUrl
  }

  // Strategy 1: Use Vite dev server proxy (bypasses CORS entirely)
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
    const response = await fetch(proxyUrl)

    if (response.ok) {
      const blob = await response.blob()
      const base64 = await blobToDataUrl(blob)
      console.log(`[imageUtils] ✓ Proxy converted: ${imageUrl.substring(0, 60)}...`)
      return base64
    }
  } catch (error) {
    console.warn(`[imageUtils] Proxy strategy failed for ${imageUrl}:`, error)
  }

  // Strategy 2: Direct fetch (works if server supports CORS)
  try {
    const response = await fetch(imageUrl, { mode: 'cors' })
    if (response.ok) {
      const blob = await response.blob()
      const base64 = await blobToDataUrl(blob)
      console.log(`[imageUtils] ✓ Direct fetch converted: ${imageUrl.substring(0, 60)}...`)
      return base64
    }
  } catch (error) {
    console.warn(`[imageUtils] Direct fetch failed for ${imageUrl}`)
  }

  // Strategy 3: Canvas approach (legacy fallback)
  try {
    const base64 = await canvasConvert(imageUrl)
    console.log(`[imageUtils] ✓ Canvas converted: ${imageUrl.substring(0, 60)}...`)
    return base64
  } catch (error) {
    console.warn(`[imageUtils] Canvas fallback also failed for ${imageUrl}`)
  }

  console.error(`[imageUtils] ✗ All strategies failed for: ${imageUrl}`)
  return imageUrl // Return original URL as absolute last resort
}

/**
 * Convert a Blob to a data URL string
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Canvas-based image conversion (requires CORS headers from server)
 */
function canvasConvert(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = (error) => {
      reject(error)
    }

    img.src = imageUrl
  })
}

/**
 * Checks if a string is a valid URL
 */
export function isUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

/**
 * Checks if a string is a base64 data URL
 */
export function isDataUrl(str: string): boolean {
  return str.startsWith('data:')
}
