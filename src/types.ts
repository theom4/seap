export interface OfferMetadata {
  companyName: string
  companyLegalName: string
  registrationNumber: string
  vatNumber: string
  offerReference: string
  offerDate: string
  productWebPage: string
  imageUrls?: string // Comma-separated URLs
}

export interface TechnicalDetail {
  itemTitle: string
  itemDescription: string
}

export interface Product {
  itemNumber: number
  productName: string
  unitOfMeasurement: string
  quantity: number
  unitPriceNoVAT: number
  totalValueNoVAT: number
}

export interface OfferContent {
  title: string
  subtitle: string
  mainMessage?: string // Optional: Main message content for the offer
  technicalDetailsMessage: string
  technicalDetailsTable: TechnicalDetail[]
  productPrice: string
  productImageUrl?: string // Optional: URL to product image (can be used instead of manual upload)
  imageUrl?: string | string[] // Can be a single URL string or an array of URLs
  confidenceMessage?: string // Optional: Warning message if confidence is low
  products?: Product[] // Optional: List of products for the products table page
}

export interface OfferData {
  offerMetadata: OfferMetadata
  offerConent: OfferContent // Note: keeping the typo from the API response
  offerContent?: OfferContent // Optional: Support for correct spelling as fallback
  subOffers?: OfferData[] // Optional: For consolidated offers from a single file
}

export interface WebhookResponseOffer {
  offerMetadata: OfferMetadata
  offerContent: OfferContent
}

export interface WebhookResponseWrapper {
  offers: WebhookResponseOffer[]
}

export interface WebhookResponseItem {
  data: OfferData[]
}

export interface WebhookResultItem {
  results?: WebhookResponseItem[]
  data?: OfferData[] // Support both structures for backward compatibility
  offers?: WebhookResponseOffer[] // New format with offers array
}

// WebhookResponse can be:
// 1. Array with offers property: [{ offers: [...] }]
// 2. Direct array of OfferData (new format)
// 3. Array of WebhookResultItem (old format with results/data nesting)
export type WebhookResponse = OfferData[] | WebhookResultItem[] | WebhookResponseWrapper[]





