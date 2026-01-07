import type {
  WebhookResponse,
  OfferData,
  WebhookResultItem,
  OfferContent,
} from '../types'

/**
 * Normalizes raw offer objects from the webhook into the internal OfferData shape.
 *
 * Handles:
 * - `offerConent` (typo) and `offerContent` (correct) field names
 * - Optional image fields on the content:
 *   - `imageBase64` (may or may not be a full data URL)
 *   - `imageFormat` (e.g. "JPEG", "PNG")
 *   - `imageUrl` (regular URL)
 * and maps them to `productImageUrl` used by the editor/PDF template.
 */
function normalizeOffer(rawOffer: unknown, context: string): OfferData | null {
  if (typeof rawOffer !== 'object' || rawOffer === null) {
    console.warn(`Invalid offer structure (${context}): not an object`)
    return null
  }

  const anyOffer = rawOffer as any

  if (!anyOffer.offerMetadata || typeof anyOffer.offerMetadata !== 'object') {
    console.warn(`Invalid offer structure (${context}): missing or invalid offerMetadata`)
    return null
  }

  // Support both the typo `offerConent` and the correct `offerContent`
  const rawContent: any =
    anyOffer.offerConent && typeof anyOffer.offerConent === 'object'
      ? anyOffer.offerConent
      : anyOffer.offerContent && typeof anyOffer.offerContent === 'object'
        ? anyOffer.offerContent
        : null

  if (!rawContent) {
    console.warn(
      `Invalid offer structure (${context}): missing offerConent/offerContent field`
    )
    return null
  }

  // Debug: Log raw content products
  console.log(`normalizeOffer (${context}): Raw products:`, rawContent.products)
  console.log(`normalizeOffer (${context}): Products count:`, rawContent.products?.length || 0)

  // Generate products array if not provided
  let products = rawContent.products || []
  if (products.length === 0 && (rawContent.title || rawContent.subtitle)) {
    // Extract price from productPrice string (e.g., "70,00 RON / intervenție" -> 70.00)
    let unitPrice = 0
    if (rawContent.productPrice && typeof rawContent.productPrice === 'string') {
      const priceMatch = rawContent.productPrice.match(/[\d,]+/)
      if (priceMatch) {
        unitPrice = parseFloat(priceMatch[0].replace(',', '.'))
      }
    }
let productName = rawContent.title || rawContent.subtitle || 'Produs'
if (productName.startsWith('Oferta Comerciala: ')) {
  productName = productName.replace('Oferta Comerciala: ', '')
}
    // Create a single product entry from subtitle
    products = [
      {
        itemNumber: 1,
        productName: productName,
        unitOfMeasurement: 'BUC',
        quantity: 1,
        unitPriceNoVAT: unitPrice,
        totalValueNoVAT: unitPrice,
      },
    ]
  }

  const normalizedContent: OfferContent = {
    ...rawContent,
    confidenceMessage: rawContent.confidenceMessage || '',
    products: products,
  }

  // Debug: Verify normalized products
  console.log(`normalizeOffer (${context}): Normalized products:`, normalizedContent.products)
  console.log(`normalizeOffer (${context}): Normalized count:`, normalizedContent.products?.length || 0)

  // Prefer base64 image if available, otherwise fall back to imageUrl
  if (rawContent.imageBase64 && typeof rawContent.imageBase64 === 'string') {
    let dataUrl = rawContent.imageBase64 as string

    // If it's not already a data URL, build one using imageFormat (when provided)
    if (!dataUrl.startsWith('data:')) {
      let mimeType = 'image/jpeg'
      const format = (rawContent.imageFormat || '').toString().toLowerCase()

      if (format.includes('png')) {
        mimeType = 'image/png'
      } else if (format.includes('webp')) {
        mimeType = 'image/webp'
      } else if (format.includes('gif')) {
        mimeType = 'image/gif'
      }

      dataUrl = `data:${mimeType};base64,${dataUrl}`
    }

    normalizedContent.productImageUrl = dataUrl
  } else if (rawContent.imageUrl && typeof rawContent.imageUrl === 'string') {
    normalizedContent.productImageUrl = rawContent.imageUrl
  }

  // Normalize offerDate to YYYY-MM-DD if it exists and is an ISO string
  const metadata = { ...anyOffer.offerMetadata }
  if (metadata.offerDate && typeof metadata.offerDate === 'string') {
    // Check if it looks like an ISO date (contains 'T')
    if (metadata.offerDate.includes('T')) {
      try {
        const date = new Date(metadata.offerDate)
        if (!isNaN(date.getTime())) {
          // Format as YYYY-MM-DD
          metadata.offerDate = date.toISOString().split('T')[0]
        }
      } catch (e) {
        // Keep original if parsing fails
        console.warn(`Failed to parse offerDate: ${metadata.offerDate}`, e)
      }
    }
  }

  const normalized: OfferData = {
    offerMetadata: metadata,
    // Keep using the internal `offerConent` key expected by the rest of the app
    offerConent: normalizedContent,
  }

  return normalized
}

/**
 * Extracts all offers from a webhook response.
 * Handles multiple structures:
 * 1. Direct array of OfferData (newest format): [OfferData, OfferData, ...]
 * 2. Nested structure with "results": [{ results: [{ data: [...] }] }]
 * 3. Old structure with direct "data": [{ data: [...] }]
 * Supports multiple PDFs from the webhook response by flattening all offers.
 */
export function getAllOffers(webhookResponse: WebhookResponse | null): OfferData[] {
  if (!webhookResponse) return []

  // --- 🔴 CRITICAL SAFETY CHECK START 🔴 ---
  // This prevents the "forEach is not a function" crash when n8n returns a 500 error object
  if (!Array.isArray(webhookResponse)) {
    console.warn('Webhook response is not an array (likely an error or invalid format):', webhookResponse)
    return []
  }
  // --- 🔴 CRITICAL SAFETY CHECK END 🔴 ---

  const offers: OfferData[] = []

  // Check if this is a direct array of OfferData (new format)
  if (webhookResponse.length > 0) {
    const firstItem = webhookResponse[0]
    // We pass a context string for logging
    const normalizedFirst = normalizeOffer(firstItem, 'direct[0]')

    // Check if first item looks like an OfferData (has offerMetadata and content)
    if (normalizedFirst) {
      // This is the new direct format: OfferData[] (or similar)
      offers.push(normalizedFirst)

      webhookResponse.slice(1).forEach((offer, index) => {
        const normalized = normalizeOffer(offer, `direct[${index + 1}]`)
        if (normalized) {
          offers.push(normalized)
        } else {
          console.warn(`Invalid offer structure at index ${index + 1} in direct format`)
        }
      })

      return offers
    }
  }

  // Handle nested structures (old formats)
  // We already verified it's an array above.
  const nestedResponse = webhookResponse as WebhookResultItem[]
  
  nestedResponse.forEach((item, itemIndex) => {
    if (!item) {
      console.warn(`Invalid webhook response item at index ${itemIndex}: item is null or undefined`)
      return
    }

    // Handle new structure with "results" array
    if ('results' in item && item.results && Array.isArray(item.results)) {
      item.results.forEach((result, resultIndex) => {
        if (result && result.data && Array.isArray(result.data)) {
          result.data.forEach((offer, offerIndex) => {
            const normalized = normalizeOffer(
              offer,
              `nested[item ${itemIndex}, result ${resultIndex}, offer ${offerIndex}]`
            )
            if (normalized) {
              offers.push(normalized)
            } else {
              console.warn(
                `Invalid offer structure at item ${itemIndex}, result ${resultIndex}, offer ${offerIndex}`
              )
            }
          })
        } else {
          console.warn(
            `Invalid result structure at item ${itemIndex}, result ${resultIndex}`
          )
        }
      })
    }
    // Handle old structure with direct "data" array (backward compatibility)
    else if ('data' in item && item.data && Array.isArray(item.data)) {
      item.data.forEach((offer, offerIndex) => {
        const normalized = normalizeOffer(
          offer,
          `nested[item ${itemIndex}, offer ${offerIndex}]`
        )
        if (normalized) {
          offers.push(normalized)
        } else {
          console.warn(
            `Invalid offer structure at item ${itemIndex}, offer ${offerIndex}`
          )
        }
      })
    } else {
      console.warn(`Invalid webhook response item at index ${itemIndex}: missing or invalid data/results array`)
    }
  })

  return offers
}

/**
 * Generates a unique key for an offer based on its metadata and content.
 * Used for React list rendering to ensure proper re-rendering.
 */
export function getOfferKey(offer: OfferData, index: number): string {
  // Try to create a unique key from offer reference or title
  const reference = offer.offerMetadata?.offerReference || ''
  const title = offer.offerConent?.title || ''

  if (reference) {
    return `offer-${reference}-${index}`
  }
  if (title) {
    // Create a safe key from title
    const titleKey = title
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .substring(0, 50)
    return `offer-${titleKey}-${index}`
  }

  // Fallback to index if no unique identifiers
  return `offer-${index}`
}





