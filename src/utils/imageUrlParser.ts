/**
 * Parses imageUrls from various formats into a clean array of URL strings.
 * 
 * Handles:
 * 1. JSON string containing an array: '["url1", "url2"]'
 * 2. JSON string with escaped characters and HTML entities
 * 3. Direct array: ["url1", "url2"]
 * 4. Comma-separated string: "url1, url2, url3"
 * 5. Empty/null/undefined values
 * 
 * @param imageUrls - The imageUrls value from offerMetadata
 * @returns Array of clean, trimmed, non-empty URL strings
 */
export function parseImageUrls(imageUrls: string | string[] | null | undefined): string[] {
    // Handle null/undefined/empty
    if (!imageUrls) {
        return []
    }

    // If it's already an array, clean it and return
    if (Array.isArray(imageUrls)) {
        return imageUrls
            .map((url) => url.trim())
            .filter((url) => url.length > 0)
    }

    // It's a string - try multiple parsing strategies
    let parsed: string[] = []

    try {
        // Strategy 1: Try to parse as JSON
        // First, unescape HTML entities like &amp; -> &
        let cleanedString = imageUrls
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")

        // Try to parse as JSON
        const jsonParsed = JSON.parse(cleanedString)

        if (Array.isArray(jsonParsed)) {
            parsed = jsonParsed
        } else if (typeof jsonParsed === 'string') {
            // Sometimes double-encoded JSON: "\"[...]\"" -> "[...]"
            const doubleParsed = JSON.parse(jsonParsed)
            if (Array.isArray(doubleParsed)) {
                parsed = doubleParsed
            } else {
                // Fall back to comma-split
                parsed = [jsonParsed]
            }
        }
    } catch (e) {
        // Strategy 2: Not valid JSON, try comma-separated string
        parsed = imageUrls.split(',')
    }

    // Clean up the results
    return parsed
        .map((url) => {
            if (typeof url !== 'string') {
                return String(url)
            }
            return url.trim()
        })
        .filter((url) => url.length > 0)
}
