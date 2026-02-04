/**
 * Converts an image URL to base64 data URL.
 * Useful for handling CORS issues with html2canvas when rendering external images.
 * Uses canvas-based approach for better reliability.
 * 
 * @param imageUrl - The URL of the image to convert
 * @returns Promise resolving to base64 data URL, or original URL if conversion fails
 */
export async function urlToBase64(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()

      // Set crossOrigin before src to enable CORS
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        try {
          // Create canvas and draw image
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            console.warn(`Failed to get canvas context for ${imageUrl}`)
            resolve(imageUrl) // Return original URL as fallback
            return
          }

          // Draw image onto canvas
          ctx.drawImage(img, 0, 0)

          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/png')
          resolve(dataUrl)
        } catch (error) {
          console.warn(`Canvas conversion failed for ${imageUrl}:`, error)
          resolve(imageUrl) // Return original URL as fallback
        }
      }

      img.onerror = (error) => {
        console.warn(`Failed to load image ${imageUrl}:`, error)
        resolve(imageUrl) // Return original URL as fallback
      }

      // Start loading
      img.src = imageUrl
    } catch (error) {
      console.warn(`Error in urlToBase64 for ${imageUrl}:`, error)
      resolve(imageUrl) // Return original URL as fallback
    }
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









