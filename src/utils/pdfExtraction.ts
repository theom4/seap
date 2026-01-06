import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export interface ExtractedImage {
  data: string
  type: string
}

export interface ExtractedProduct {
  itemNumber: number
  productName: string
  unitOfMeasurement: string
  quantity: number
  unitPriceNoVAT: number
  totalValueNoVAT: number
}

/**
 * Extracts an image from a PDF file.
 * First tries to extract embedded images, then falls back to rendering the first page as an image.
 */
export async function extractImageFromPDF(file: File): Promise<ExtractedImage> {
  let pdf
  try {
    const arrayBuffer = await file.arrayBuffer()
    pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0, // Suppress warnings
      stopAtErrors: false, // Continue even with errors
    }).promise
  } catch (error) {
    throw new Error(
      `Failed to load PDF: ${error instanceof Error ? error.message : 'Invalid PDF structure'}`
    )
  }

  if (!pdf || pdf.numPages === 0) {
    throw new Error('PDF has no pages')
  }

  // First, try to extract embedded images from all pages
  const images: Array<{ data: Uint8Array; format: string }> = []

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)
        const ops = await page.getOperatorList()

        // Find image operators in the page
        for (let i = 0; i < ops.fnArray.length; i++) {
          const op = ops.fnArray[i]

          // Check for image operators (Do - Draw Object / XObject)
          if (op === pdfjsLib.OPS.paintImageXObject || op === pdfjsLib.OPS.paintXObject) {
            const imageName = ops.argsArray[i][0]

            try {
              const imageDict = await page.objs.get(imageName)

              if (imageDict && imageDict.data) {
                // Get the image data
                const imageData = imageDict.data
                let format = 'image/jpeg' // default

                // Determine image format based on filter
                if (imageDict.filter && imageDict.filter.length > 0) {
                  const filter = imageDict.filter[0]
                  if (filter === 'DCTDecode' || filter === 'DCT') {
                    format = 'image/jpeg'
                  } else if (filter === 'FlateDecode' || filter === 'CCITTFaxDecode') {
                    format = 'image/png'
                  } else if (filter === 'JPXDecode') {
                    format = 'image/jpeg'
                  }
                }

                // Check if it's a raw image (no filter)
                if (!imageDict.filter || imageDict.filter.length === 0) {
                  // Try to determine format from color space
                  if (imageDict.colorSpace && imageDict.colorSpace.name === 'DeviceRGB') {
                    format = 'image/png'
                  }
                }

                images.push({ data: imageData, format })
              }
            } catch (err) {
              // Skip if we can't get the image object
              console.warn(`Failed to extract image ${imageName}:`, err)
            }
          }
        }
      } catch (pageError) {
        // If we can't process a page, try the next one
        console.warn(`Failed to process page ${pageNum}:`, pageError)
        continue
      }
    }
  } catch (error) {
    // If embedded image extraction fails, fall through to canvas rendering
    console.warn('Embedded image extraction failed, trying canvas rendering:', error)
  }

  // If we found embedded images, use the first one
  if (images.length > 0) {
    const image = images[0]

    // Convert Uint8Array to base64
    const uint8Array = new Uint8Array(image.data)
    const binaryString = Array.from(uint8Array, (byte) => String.fromCharCode(byte)).join('')
    const base64 = btoa(binaryString)

    return {
      data: base64,
      type: image.format,
    }
  }

  // If no embedded images found, render the first page as an image (for scanned PDFs)
  try {
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better quality

    // Create a canvas to render the page
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Could not get canvas context')
    }

    canvas.height = viewport.height
    canvas.width = viewport.width

    // Render the PDF page to the canvas
    await page.render({
      canvas: canvas,
      canvasContext: context,
      viewport: viewport,
    }).promise

    // Convert canvas to base64 image (PNG format)
    const base64 = canvas.toDataURL('image/png').split(',')[1]

    return {
      data: base64,
      type: 'image/png',
    }
  } catch (renderError) {
    throw new Error(
      `Failed to render PDF page: ${renderError instanceof Error ? renderError.message : 'Unknown error'}`
    )
  }
}

/**
 * Extracts text content from all pages of a PDF
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    verbosity: 0,
  }).promise

  let fullText = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    fullText += pageText + '\n'
  }

  return fullText
}

/**
 * Extracts products table from a PDF file.
 * Looks for patterns like:
 * - "Nr. crt." or "Nr.crt" (item number column)
 * - "Denumire produs" or "Denumire" (product name)
 * - "U.M." (unit of measurement)
 * - "Cantitati" or "Cantități" (quantity)
 * - "Pret unitar" or "Preț unitar" (unit price)
 * - "Valoare totala" or "Valoare totală" (total value)
 */
export async function extractProductsFromPDF(file: File): Promise<ExtractedProduct[]> {
  try {
    const text = await extractTextFromPDF(file)
    const products: ExtractedProduct[] = []

    // Split into lines
    const lines = text.split('\n')

    // Find table headers - look for products table indicators
    let inProductsTable = false
    let productCount = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lowerLine = line.toLowerCase()

      // Check if we're entering a products table
      if (
        (lowerLine.includes('nr') && lowerLine.includes('crt')) ||
        (lowerLine.includes('denumire') && lowerLine.includes('produs'))
      ) {
        inProductsTable = true
        continue
      }

      // Check if we're exiting the table (TOTAL row)
      if (lowerLine.includes('total') && lowerLine.includes('fara') && lowerLine.includes('tva')) {
        inProductsTable = false
        continue
      }

      // If we're in the table, try to extract product data
      if (inProductsTable && line.length > 0) {
        // Try to parse a product row
        // Pattern: number | product name | unit | quantity | unit price | total

        // Look for lines that start with a number
        const numberMatch = line.match(/^(\d+)\s+(.+)/)
        if (numberMatch) {
          const itemNumber = parseInt(numberMatch[1])
          const restOfLine = numberMatch[2]

          // Try to extract values from the line
          // This is a heuristic approach - look for patterns like "BUC 6 167 1002"
          const values = restOfLine.match(/\b(\d+(?:[.,]\d+)?)\b/g)

          if (values && values.length >= 3) {
            // Extract product name (text before the first number)
            const productNameMatch = restOfLine.match(/^(.+?)\s+(?:BUC|buc|BUC|SET|set|KG|kg|M|m|L|l)\s/)
            const productName = productNameMatch ? productNameMatch[1].trim() : restOfLine.split(/\d/)[0].trim()

            // Extract unit of measurement
            const unitMatch = restOfLine.match(/\b(BUC|buc|SET|set|KG|kg|M|m|L|l)\b/i)
            const unitOfMeasurement = unitMatch ? unitMatch[1].toUpperCase() : 'BUC'

            // Parse numbers (quantity, unit price, total)
            const quantity = parseFloat(values[0].replace(',', '.'))
            const unitPrice = parseFloat(values[1].replace(',', '.'))
            const total = parseFloat(values[2].replace(',', '.'))

            if (productName && !isNaN(quantity) && !isNaN(unitPrice) && !isNaN(total)) {
              products.push({
                itemNumber,
                productName,
                unitOfMeasurement,
                quantity,
                unitPriceNoVAT: unitPrice,
                totalValueNoVAT: total,
              })
              productCount++
            }
          }
        }
      }
    }

    return products
  } catch (error) {
    console.error('Failed to extract products from PDF:', error)
    return []
  }
}








