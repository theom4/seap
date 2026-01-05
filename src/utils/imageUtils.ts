/**
 * Converts an image URL to base64 data URL.
 * Useful for handling CORS issues with html2canvas when rendering external images.
 * 
 * @param imageUrl - The URL of the image to convert
 * @returns Promise resolving to base64 data URL, or null if conversion fails
 */
export async function urlToBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit',
    })
    
    if (!response.ok) {
      console.warn(`Failed to fetch image from ${imageUrl}: ${response.statusText}`)
      return null
    }
    
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to convert blob to base64'))
        }
      }
      reader.onerror = () => {
        reject(new Error('Failed to read image blob'))
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn(`Error converting image URL to base64: ${error instanceof Error ? error.message : 'Unknown error'}`)
    // If CORS fails, return the original URL - html2canvas might still work if server has proper CORS headers
    return imageUrl
  }
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









