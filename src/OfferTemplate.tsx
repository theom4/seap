import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { OfferData, Product, TechnicalDetail } from './types'
import { EditableText } from './components/EditableText'
import './OfferTemplate.css'

interface OfferTemplateProps {
  offerData: OfferData
  onGeneratePDF: (pdfBlob: Blob) => void
  hideGenerateButton?: boolean
  hideAnnex?: boolean
  hideAnnexInPDF?: boolean
}

export interface OfferTemplateRef {
  generatePDF: () => Promise<Blob>
}

// --- Types for Page Content ---
interface PageImage {
  id: string
  src: string
  pos: { x: number; y: number }
  size: { width: number }
}

export interface OfferPageContent {
  id: string // Unique ID for keying
  type?: 'product' | 'blank' // New field to distinguish page types
  title: string
  subtitle: string
  technicalDetailsMessage: string
  technicalDetailsTable: TechnicalDetail[]
  productImages: PageImage[]
  nextImageId: number
}

// ... (getProductsTableHTML and getAnnexHTML remain same - skipped for brevity in replacement if not touched, but since I need to replace broadly to hit interfaces if I can't partial replace well)
// Actually I can just replace the interface and then the component.
// But split edits are safer. I will replace the interface first? 
// No, I'll replace the ProductPage component and the interface in one go if they are close?
// They are far apart.
// I will just replace the `OfferPageContent` definition and `ProductPage` and `handleAddEmptyPage`.
// Wait, `OfferPageContent` is at the top. `ProductPage` is in the middle.
// I'll make multiple replacements.

// REPLACEMENT 1: Interface
// REPLACEMENT 2: ProductPage 
// REPLACEMENT 3: Handlers and Buttons

// Let's do REPLACEMENT 1 & 2 & 3 in one `replace_file_content` if possible?
// No, strict single contiguous block.
// I'll start with the Interface.


// --- 1. PRODUCTS TABLE PAGE (LANDSCAPE) ---
function getProductsTableHTML(products: Product[]) {
  if (!products || products.length === 0) {
    return ''
  }

  const totalNoVAT = products.reduce((sum, p) => sum + (p.totalValueNoVAT || 0), 0)

  const productsRows = products.map(product => `
    <tr>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10pt; font-family: Arial, sans-serif; color: #000 !important;">${product.itemNumber}</td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: left; font-size: 10pt; font-family: Arial, sans-serif; color: #000 !important;"><strong style="color: #000 !important;">${product.productName}</strong></td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10pt; font-family: Arial, sans-serif; color: #000 !important;">${product.unitOfMeasurement}</td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10pt; font-family: Arial, sans-serif; color: #000 !important;">${product.quantity}</td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: right; font-size: 10pt; font-family: Arial, sans-serif; color: #000 !important;">${typeof product.unitPriceNoVAT === 'number' ? product.unitPriceNoVAT.toFixed(2) : product.unitPriceNoVAT}</td>
      <td style="border: 1px solid #000; padding: 6px 4px; text-align: right; font-size: 10pt; font-family: Arial, sans-serif; color: #000 !important;">${typeof product.totalValueNoVAT === 'number' ? product.totalValueNoVAT.toFixed(2) : product.totalValueNoVAT}</td>
    </tr>
  `).join('')

  return `
    <div style="
      font-family: Arial, sans-serif;
      color: #000 !important;
      background: white;
      padding: 10mm 20mm;
      box-sizing: border-box;
      width: 297mm;
      height: 210mm;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid;
      margin: 0 auto;
    ">
      <h2 style="text-align: center; margin: 0 0 8mm 0; font-size: 16pt; font-weight: 700; font-family: Arial, sans-serif; color: #000 !important;">Tabel Produse</h2>
      <table style="
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        color: #000 !important;
      ">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 6px 4px; background: #f5f5f5; text-align: center; font-size: 10pt; font-weight: bold; font-family: Arial, sans-serif; color: #000 !important; line-height: 1.3; width: 5%;">Nr.<br/>crt.</th>
            <th style="border: 1px solid #000; padding: 6px 4px; background: #f5f5f5; text-align: center; font-size: 10pt; font-weight: bold; font-family: Arial, sans-serif; color: #000 !important; line-height: 1.3; width: 40%;">Denumire produs</th>
            <th style="border: 1px solid #000; padding: 6px 4px; background: #f5f5f5; text-align: center; font-size: 10pt; font-weight: bold; font-family: Arial, sans-serif; color: #000 !important; line-height: 1.3; width: 8%;">U.M.</th>
            <th style="border: 1px solid #000; padding: 6px 4px; background: #f5f5f5; text-align: center; font-size: 10pt; font-weight: bold; font-family: Arial, sans-serif; color: #000 !important; line-height: 1.3; width: 10%;">Cantitati</th>
            <th style="border: 1px solid #000; padding: 6px 4px; background: #f5f5f5; text-align: center; font-size: 10pt; font-weight: bold; font-family: Arial, sans-serif; color: #000 !important; line-height: 1.3; width: 18%;">Pret unitar<br/>fara tva</th>
            <th style="border: 1px solid #000; padding: 6px 4px; background: #f5f5f5; text-align: center; font-size: 10pt; font-weight: bold; font-family: Arial, sans-serif; color: #000 !important; line-height: 1.3; width: 19%;">Valoare totala<br/>fara TVA</th>
          </tr>
        </thead>
        <tbody>
          ${productsRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif; color: #000 !important; background: #f5f5f5;">
              TOTAL FARA TVA= ${totalNoVAT.toFixed(2)} LEI
            </td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top: auto; display: flex; justify-content: space-between; padding-top: 10mm; align-items: flex-end;">
        <div style="flex: 1;">
          <p style="margin: 0 0 6px 0; font-size: 11pt; color: #000 !important;"><strong style="color: #000 !important;">OFERTANTUL</strong></p>
          <p style="margin: 0 0 3px 0; font-size: 11pt; color: #000 !important;"><strong style="color: #000 !important;">S.C. AS GREEN LAND S.R.L</strong></p>
          <p style="margin: 0; font-size: 10pt; font-style: italic; color: #000 !important;">(denumirea/numele)</p>
        </div>
        <div style="flex: 1; text-align: right;">
          <p style="margin: 0 0 3px 0; font-size: 10pt; color: #000 !important;">Preturile Nu Contin TVA</p>
          <p style="margin: 0 0 3px 0; font-size: 10pt; color: #000 !important;">Transportul este inclus in pret</p>
          <p style="margin: 0 0 3px 0; font-size: 10pt; color: #000 !important;">Plata prin cont de Trezorerie</p>
          <p style="margin: 0; font-size: 10pt; color: #000 !important;">Termen de plata stabilt la semnarea contractului</p>
        </div>
      </div>
    </div>
  `
}

// --- 2. ANNEX CONTENT ---
function getAnnexHTML() {
  return `
    <div style="font-family: Arial, sans-serif; color: #000; line-height: 1.6; font-size: 11pt; background: white; padding: 15mm 10mm;">
      <div style="margin-bottom: 20px; text-align: center;">
        <strong>S.C. AS GREEN LAND S.R.L</strong><br/>
        Sediu social - Str.Lalelelor 12 Comuna Nuci Sat Merii Petchii, Ilfov,<br/>
        CUI: RO 46581890 Registrul Comertului :J2022005182231<br/>
        Trezorerie ILFOV Cont RO88TREZ4215069XXX022087<br/>
        Telefon: 0720.706.784 E-mail: asgreenland10@gmail.com<br/>
        Capital social: 200 RON
      </div>

      <h2 style="text-align: center; margin: 30px 0; font-size: 14pt; font-weight: bold;">FORMULAR DE OFERTA</h2>

      <p style="margin-bottom: 15px;"><strong>Către</strong></p>
      <p style="margin-bottom: 15px;"><strong>Domnilor,</strong></p>

      <p style="margin-bottom: 12px; text-align: justify;">
        1. Examinând documentaţia de atribuire, subsemnaţii, reprezentanţi ai ofertantului AS GREEN LAND SRL,
        ne oferim ca, în conformitate cu prevederile şi cerinţele cuprinse în documentaţia mai sus menţionată,
        sa furnizăm DIVERSE MATERIALE. pentru suma de prezenta in tabelul din anexa,
        platibila după recepţia produselor
      </p>

      <p style="margin-bottom: 12px; text-align: justify;">
        2. Ne angajăm ca, în cazul în care oferta noastră este stabilită căştigătoare, sa furnizam produsele
        în termen de 5 zile de la comanda.
      </p>

      <p style="margin-bottom: 12px; text-align: justify;">
        3. Ne angajăm sa menţinem aceasta oferta valabilă pentru o durata de 30 zile, (treizeci de zile),
        respectiv pana la data de 18.01.2026, şi ea va rămâne obligatorie pentru noi şi poate fi acceptată
        oricând înainte de expirarea perioadei de valabilitate.
      </p>

      <p style="margin-bottom: 12px; text-align: justify;">
        4. Pana la încheierea şi semnarea contractului de achiziţie publica aceasta oferta, împreună cu
        comunicarea transmisă de dumneavoastră, prin care oferta noastră este stabilită căştigătoare, vor
        constitui un contract angajant între noi.
      </p>

      <div style="margin-bottom: 12px;">
        <p style="margin-bottom: 8px;">5. Precizam ca:</p>
        <p style="margin-left: 20px; margin-bottom: 5px;">
          │_│ depunem oferta alternativa, ale carei detalii sunt prezentate într-un formular de oferta separat, marcat în mod clar "alternativa";
        </p>
        <p style="margin-left: 20px; margin-bottom: 5px;">
          │X│ nu depunem oferta alternativa.
        </p>
      </div>

      <p style="margin-bottom: 12px; text-align: justify;">
        6. Am înţeles şi consimtim ca, în cazul în care oferta noastră este stabilită ca fiind căştigătoare, sa
        constituim garanţia de buna execuţie în conformitate cu prevederile din documentaţia de atribuire.
      </p>

      <p style="margin-bottom: 20px; text-align: justify;">
        7. Intelegem ca nu sunteţi obligaţi sa acceptaţi oferta cu cel mai scăzut preţ sau orice alta oferta pe
        care o puteti primi.
      </p>

      <div style="margin-top: 40px;">
        <p style="margin-bottom: 5px;"><strong>Data</strong></p>
        <p style="margin-bottom: 20px;">18.12.2025</p>
        <p style="text-align: justify;">
          <strong>STRAUT ANDREI</strong> , (semnatura), în calitate de <strong>ADMINISTRATOR</strong> legal autorizat sa semnez oferta
          pentru şi în numele <strong>S.C. AS GREEN LAND S.R.L</strong>
        </p>
      </div>
    </div>
  `
}

// --- PRODUCT PAGE SUB-COMPONENT ---
interface ProductPageProps {
  content: OfferPageContent
  index: number
  onChange: (updatedContent: OfferPageContent) => void
  onDelete: (id: string, index: number) => void // Function to delete page 
  themeColors: any
  customText: any
  updateCustomText: (key: string, value: string) => void
}

const ProductPage = forwardRef<HTMLDivElement, ProductPageProps>(({
  content,
  index,
  onChange,
  onDelete,

  customText,
  updateCustomText
}, ref) => {
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Local state for Drag & Drop
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 0 })
  const [activeImageId, setActiveImageId] = useState<string | null>(null)

  const handleMouseDown = (e: React.MouseEvent, imageId: string) => {
    if (!isResizing) {
      setIsDragging(true)
      setActiveImageId(imageId)
      const img = content.productImages.find(i => i.id === imageId)
      if (img) {
        setDragStart({
          x: e.clientX - img.pos.x,
          y: e.clientY - img.pos.y
        })
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && activeImageId) {
      const updatedImages = content.productImages.map(img =>
        img.id === activeImageId
          ? { ...img, pos: { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y } }
          : img
      )
      onChange({ ...content, productImages: updatedImages })
    } else if (isResizing && activeImageId) {
      const newWidth = Math.max(50, resizeStart.width + (e.clientX - resizeStart.x))
      const updatedImages = content.productImages.map(img =>
        img.id === activeImageId
          ? { ...img, size: { width: newWidth } }
          : img
      )
      onChange({ ...content, productImages: updatedImages })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
    setActiveImageId(null)
  }

  const handleResizeMouseDown = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation()
    setIsResizing(true)
    setActiveImageId(imageId)
    const img = content.productImages.find(i => i.id === imageId)
    if (img) {
      setResizeStart({
        x: e.clientX,
        width: img.size.width
      })
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result
        if (typeof result === 'string') {
          const newImage: PageImage = {
            id: `img-${content.nextImageId}-${Date.now()}`,
            src: result,
            pos: { x: 50 + (content.productImages.length * 20), y: 350 + (content.productImages.length * 20) },
            size: { width: 300 }
          }
          onChange({
            ...content,
            productImages: [...content.productImages, newImage],
            nextImageId: content.nextImageId + 1
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = (imageId: string) => {
    onChange({
      ...content,
      productImages: content.productImages.filter(img => img.id !== imageId)
    })
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handleTableFieldChange = (idx: number, field: 'itemTitle' | 'itemDescription', value: string) => {
    const updatedTable = [...content.technicalDetailsTable]
    updatedTable[idx] = { ...updatedTable[idx], [field]: value }
    onChange({ ...content, technicalDetailsTable: updatedTable })
  }

  return (
    <div style={{ marginBottom: '40px' }}>
      <div
        ref={ref}
        className="offer-template"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ position: 'relative', minHeight: '297mm', backgroundColor: 'white', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}
      >
        {/* Page Delete Button */}
        {index > 0 && ( /* Prevent deleting the main page if desired, or allow it */
          <button
            onClick={() => onDelete(content.id, index)}
            className="delete-page-btn"
            data-html2canvas-ignore="true"
            style={{
              position: 'absolute',
              top: '-25px',
              right: '0',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px',
              zIndex: 1000
            }}
          >
            Remove This Page
          </button>
        )}

        {/* Header - Common for both */}
        <div className="offer-header">
          <div className="header-right"></div>
        </div>
        <div className="header-divider"></div>

        {/* Title and Subtitle - Common for both */}
        <div className="offer-title-section">
          <EditableText
            tagName="h2"
            className="offer-title"
            value={content.title}
            onChange={(val) => onChange({ ...content, title: val })}
            placeholder="Titlu Pagină"
          />
          <EditableText
            tagName="p"
            className="offer-subtitle"
            value={content.subtitle}
            onChange={(val) => onChange({ ...content, subtitle: val })}
            placeholder="Subtitlu (opțional)"
          />
        </div>

        {/* Product Images - Common for both */}
        {content.productImages.map((image) => (
          <div
            key={image.id}
            className="product-image-draggable"
            onMouseDown={(e) => handleMouseDown(e, image.id)}
            data-image-draggable="true"
            style={{
              position: 'absolute',
              left: `${image.pos.x}px`,
              top: `${image.pos.y}px`,
              width: `${image.size.width}px`,
              cursor: isDragging && activeImageId === image.id ? 'grabbing' : 'grab',
              zIndex: 100,
              userSelect: 'none',
              pointerEvents: 'auto',
              display: 'block',
              visibility: 'visible',
              opacity: 1
            }}
          >
            <img
              src={image.src}
              alt="Product"
              draggable="false"
              className="draggable-product-image"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              onLoad={() => {
                console.log('[ProductPage] Image loaded successfully:', image.src)
              }}
              onError={(e) => {
                console.error('[ProductPage] Image failed to load:', image.src)
                console.error('[ProductPage] Error details:', e)
              }}
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(image.id)}
              className="remove-image-button"
              data-html2canvas-ignore="true"
              style={{
                position: 'absolute', top: '-10px', right: '-10px',
                background: '#ff4d4f', color: 'white', border: 'none',
                borderRadius: '50%', width: '30px', height: '30px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ×
            </button>
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, image.id)}
              data-html2canvas-ignore="true"
              style={{
                position: 'absolute', bottom: '-10px', right: '-10px',
                width: '20px', height: '20px', background: '#2196F3',
                borderRadius: '50%', cursor: 'nwse-resize', border: '2px solid white'
              }}
            />
          </div>
        ))}

        {/* Image Upload Button - Common */}
        <div className="image-upload-controls" data-html2canvas-ignore="true" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100 }}>
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Upload Product Image
          </button>
        </div>

        {/* CONTENT DIVERGENCE BASED ON TYPE */}
        {content.type === 'blank' ? (
          /* BLANK PAGE LAYOUT */
          <div className="blank-page-content" style={{ padding: '0 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={content.technicalDetailsMessage}
              onChange={(e) => onChange({ ...content, technicalDetailsMessage: e.target.value })}
              className="editable-textarea"
              placeholder="Scrieți conținutul paginii aici..."
              style={{
                width: '100%',
                minHeight: '600px',
                border: '1px dashed #ccc',
                padding: '10px',
                fontSize: '11pt',
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.5',
                resize: 'none', // Content should dictate height in PDF, but here we fix it for editor
                background: 'transparent'
              }}
            />
          </div>
        ) : (
          /* PRODUCT PAGE LAYOUT (Standard) */
          <>
            {/* Technical Description */}
            <div className="technical-description">
              <EditableText
                tagName="h3"
                className="section-title"
                value={customText.techDetailsTitle}
                onChange={(val) => updateCustomText('techDetailsTitle', val)}
              />
              <textarea
                value={content.technicalDetailsMessage}
                onChange={(e) => onChange({ ...content, technicalDetailsMessage: e.target.value })}
                className="editable-textarea technical-message"
                rows={4}
              />
            </div>

            {/* Technical Specifications Table */}
            <div className="technical-table-section">
              <table className="technical-table">
                <tbody>
                  {Array.isArray(content.technicalDetailsTable) && content.technicalDetailsTable.map((detail, idx) => (
                    <tr key={idx}>
                      <td className="table-title">
                        <input
                          type="text"
                          value={detail.itemTitle}
                          onChange={(e) => handleTableFieldChange(idx, 'itemTitle', e.target.value)}
                          className="editable-table-input"
                        />
                      </td>
                      <td className="table-description">
                        <input
                          type="text"
                          value={detail.itemDescription}
                          onChange={(e) => handleTableFieldChange(idx, 'itemDescription', e.target.value)}
                          className="editable-table-input"
                        />
                      </td>
                      <td style={{ border: 'none', background: 'transparent', width: '40px' }} data-html2canvas-ignore="true">
                        <button
                          type="button"
                          onClick={() => onChange({ ...content, technicalDetailsTable: content.technicalDetailsTable.filter((_, i) => i !== idx) })}
                          style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => onChange({ ...content, technicalDetailsTable: [...content.technicalDetailsTable, { itemTitle: '', itemDescription: '' }] })}
                data-html2canvas-ignore="true"
                style={{ marginTop: '10px', padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Adauga produs
              </button>
            </div>

            {/* Validity */}
            <div className="validity-section">
              <EditableText
                tagName="h4"
                className="validity-title"
                value={customText.validityTitle}
                onChange={(val) => updateCustomText('validityTitle', val)}
              />
              <EditableText
                tagName="p"
                className="validity-text"
                value={customText.validityText}
                onChange={(val) => updateCustomText('validityText', val)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
})
ProductPage.displayName = 'ProductPage'

// --- MAIN TEMPLATE COMPONENT ---

export const OfferTemplate = forwardRef<OfferTemplateRef, OfferTemplateProps>(
  ({ offerData, onGeneratePDF, hideGenerateButton = false, hideAnnex = false, hideAnnexInPDF = false }, ref) => {
    // Refs for all the pages
    const pageRefs = useRef<(HTMLDivElement | null)[]>([])

    // Global State (Metadata, Products Table)
    const { offerMetadata: initialMetadata = {} as any, offerConent: initialContent = {} as any } = offerData || {}
    const [products, setProducts] = useState<Product[]>(initialContent.products || [])

    // Pages State
    // Pages State
    const [pages, setPages] = useState<OfferPageContent[]>(() => {
      console.log('[OfferTemplate] Init State. SubOffers:', offerData.subOffers?.length)

      // Parse imageUrls from metadata
      const imageUrlsFromMetadata = initialMetadata.imageUrls
        ? initialMetadata.imageUrls.split(',').map((url: string) => url.trim()).filter((url: string) => url.length > 0)
        : []

      console.log('[OfferTemplate] ImageUrls from metadata:', {
        raw: initialMetadata.imageUrls,
        parsed: imageUrlsFromMetadata,
        count: imageUrlsFromMetadata.length
      })

      if (offerData.subOffers && offerData.subOffers.length > 0) {
        // Map sub-offers to pages
        return offerData.subOffers.map((subOffer, index) => {
          const content = subOffer.offerConent || subOffer.offerContent
          const isLastPage = index === offerData.subOffers!.length - 1

          // Build product images array
          const productImages: PageImage[] = []
          let imageId = 1

          // Add productImageUrl if exists (on all pages)
          if (content.productImageUrl) {
            productImages.push({
              id: `img-${index}-${imageId++}`,
              src: content.productImageUrl,
              pos: { x: 20, y: 180 },
              size: { width: 150 }
            })
          }

          // Add images from imageUrls metadata ONLY ON LAST PAGE
          if (isLastPage && imageUrlsFromMetadata.length > 0) {
            imageUrlsFromMetadata.forEach((url: string, imgIndex: number) => {
              productImages.push({
                id: `img-${index}-${imageId++}`,
                src: url,
                pos: {
                  x: 50 + (imgIndex % 2) * 350, // 2 columns with more space
                  y: 400 + Math.floor(imgIndex / 2) * 250 // More vertical space
                },
                size: { width: 300 } // Larger images
              })
            })
            console.log(`[OfferTemplate] Last page (${index}) initialized with ${productImages.length} images (${imageUrlsFromMetadata.length} from metadata)`)
          }

          return {
            id: `page-${index}-${Date.now()}`,
            title: content.title || 'Ofertă',
            subtitle: content.subtitle || '',
            technicalDetailsMessage: content.technicalDetailsMessage || '',
            technicalDetailsTable: content.technicalDetailsTable || [],
            productImages,
            nextImageId: imageId,
            type: 'product' // Default type
          }
        })
      }

      // Fallback: Use the main offer data as a single page
      console.log('[OfferTemplate] No subOffers found, using main content')
      const content = initialContent

      // Build product images array
      const productImages: PageImage[] = []
      let imageId = 1

      // Add productImageUrl if exists
      if (content.productImageUrl) {
        productImages.push({
          id: `img-main-${imageId++}`,
          src: content.productImageUrl,
          pos: { x: 20, y: 180 },
          size: { width: 150 }
        })
      }

      // Add images from imageUrls metadata (single page so add them here)
      if (imageUrlsFromMetadata.length > 0) {
        imageUrlsFromMetadata.forEach((url: string, imgIndex: number) => {
          productImages.push({
            id: `img-main-${imageId++}`,
            src: url,
            pos: {
              x: 50 + (imgIndex % 2) * 350, // 2 columns with more space
              y: 400 + Math.floor(imgIndex / 2) * 250 // More vertical space
            },
            size: { width: 300 } // Larger images
          })
        })
        console.log(`[OfferTemplate] Main page initialized with ${productImages.length} images (${imageUrlsFromMetadata.length} from metadata)`)
      }

      return [{
        id: `page-main-${Date.now()}`,
        title: content.title || 'Ofertă',
        subtitle: content.subtitle || '',
        technicalDetailsMessage: content.technicalDetailsMessage || '',
        technicalDetailsTable: content.technicalDetailsTable || [],
        productImages,
        nextImageId: imageId,
        type: 'product'
      }]
    })

    // Theme & Custom Text (Global)
    const [themeColors, setThemeColors] = useState({
      primary: '#ffffff', secondary: '#ffffff', text: '#1f2933', bg: '#ffffff',
    })
    const [customText, setCustomText] = useState({
      productPageLabel: 'Pagină produs:',
      techDetailsTitle: 'Descriere Tehnică Detaliată',
      specialPriceLabel: 'PRET SPECIAL DE OFERTĂ',
      priceNote: 'TVA Inclus. Livrare Standard Gratuită.',
      validityTitle: 'Condiții de valabilitate:',
      validityText: 'Oferta este valabilă în timp ce stocul durează. Prețul include taxa verde. Vă rugăm să ne contactați pentru confirmarea comenzii sau să ne vizitați în showroom.',
      footerNote: 'Document generat electronic. Nu necesită stampilă.',
      refLabel: 'Ref:',
    })

    // Initialize pageRefs array based on initial pages count
    useEffect(() => {
      pageRefs.current = Array(pages.length).fill(null);
    }, [pages.length]);

    // Update global styles when theme changes
    useEffect(() => {
      // We need to apply variables to ALL pages, or to the container
      // Since refs are spread, simpler to use a CSS class or apply to body?
      // Actually, we can loop through refs and apply
      pageRefs.current.forEach(el => {
        if (el) {
          el.style.setProperty('--theme-primary', themeColors.primary)
          el.style.setProperty('--theme-secondary', themeColors.secondary)
          el.style.setProperty('--theme-text', themeColors.text)
          el.style.setProperty('--theme-bg', themeColors.bg)
        }
      })
    }, [themeColors, pages.length])


    const updateCustomText = (key: string, value: string) => {
      setCustomText(prev => ({ ...prev, [key]: value }))
    }

    const updateThemeColor = (key: string, value: string) => {
      setThemeColors(prev => ({ ...prev, [key]: value }))
    }

    const handlePageUpdate = (index: number, newContent: OfferPageContent) => {
      setPages(prev => {
        const updated = [...prev]
        updated[index] = newContent
        return updated
      })
    }

    const handlePageDelete = (_id: string, index: number) => {
      if (pages.length <= 1) {
        alert("Cannot delete the last page.")
        return
      }
      if (confirm("Are you sure you want to remove this product page?")) {
        setPages(prev => prev.filter((_, i) => i !== index))
        // Refs will update automatically on re-render but we should be careful
      }
    }

    const handleAddEmptyPage = () => {
      const newPage: OfferPageContent = {
        id: `page-new-${Date.now()}`,
        type: 'blank', // Explicitly blank type
        title: '', // Empty title by default for a blank page
        subtitle: '',
        technicalDetailsMessage: '',
        technicalDetailsTable: [],
        productImages: [],
        nextImageId: 1
      }
      setPages(prev => [...prev, newPage])
      // Update refs
      pageRefs.current = [...pageRefs.current, null]
    }

    const handleAddClonePage = () => {
      if (pages.length === 0) {
        alert("Nu există pagini de duplicat. Adăugați o pagină goală mai întâi.")
        return
      }

      const lastPage = pages[pages.length - 1]
      const newPage: OfferPageContent = {
        ...lastPage,
        id: `page-clone-${Date.now()}`,
        // Inherit type from last page, or default to product if undefined
        type: lastPage.type || 'product',
        title: lastPage.title, // Clone explicitly
        subtitle: lastPage.subtitle,
        technicalDetailsMessage: lastPage.technicalDetailsMessage,
        // Deep copy objects to avoid reference sharing
        technicalDetailsTable: lastPage.technicalDetailsTable ? lastPage.technicalDetailsTable.map(t => ({ ...t })) : [],
        productImages: lastPage.productImages.map(img => ({ ...img, id: `img-clone-${Date.now()}-${Math.random()}` })),
        nextImageId: lastPage.nextImageId + 100 // Avoid collision
      }

      setPages(prev => [...prev, newPage])
      pageRefs.current = [...pageRefs.current, null]
    }

    // --- PDF GENERATION ---
    const generateFinalPDF = async (): Promise<Blob> => {
      try {
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = 210
        const pageHeight = 297

        // 1. Annex
        if (!hideAnnexInPDF) {
          const annexContainer = document.createElement('div')
          annexContainer.style.position = 'fixed'
          annexContainer.style.left = '0'
          annexContainer.style.top = '0'
          annexContainer.style.width = '210mm'
          annexContainer.style.background = 'white'
          annexContainer.style.zIndex = '-9999'
          annexContainer.innerHTML = getAnnexHTML()
          document.body.appendChild(annexContainer)

          try {
            const annexCanvas = await html2canvas(annexContainer, { scale: 2, logging: false, backgroundColor: '#ffffff' })
            const annexImgData = annexCanvas.toDataURL('image/jpeg', 0.95)
            pdf.addImage(annexImgData, 'JPEG', 0, 0, pdfWidth, (annexCanvas.height * pdfWidth) / annexCanvas.width)
          } finally {
            document.body.removeChild(annexContainer)
          }
        }

        // 2. Products Table
        if (products && products.length > 0) {
          pdf.addPage('l') // Add landscape page
          const productsContainer = document.createElement('div')
          productsContainer.style.position = 'fixed'
          productsContainer.style.left = '0'
          productsContainer.style.top = '0'
          productsContainer.style.width = '297mm'
          productsContainer.style.background = 'white'
          productsContainer.style.visibility = 'hidden' // Important
          productsContainer.innerHTML = getProductsTableHTML(products)
          document.body.appendChild(productsContainer)

          // Wait for render
          await new Promise(resolve => setTimeout(resolve, 500))
          productsContainer.style.visibility = 'visible'

          const productsCanvas = await html2canvas(productsContainer, { scale: 2, logging: false, backgroundColor: '#ffffff', windowWidth: 297 * 3.78, windowHeight: 210 * 3.78 })

          productsContainer.style.visibility = 'hidden'
          const landscapePdfWidth = pdf.internal.pageSize.getWidth()
          const productsImgData = productsCanvas.toDataURL('image/jpeg', 0.95)
          const imgHeightInPdf = (productsCanvas.height * landscapePdfWidth) / productsCanvas.width

          pdf.addImage(productsImgData, 'JPEG', 0, 0, landscapePdfWidth, imgHeightInPdf)
          document.body.removeChild(productsContainer)
        }

        // 3. Render Each Product Page
        for (let i = 0; i < pages.length; i++) {
          const pageRef = pageRefs.current[i]
          if (!pageRef) continue

          // Add new page (Portrait)
          pdf.addPage('p')

          // Prepare for Capture (Draggable Images Check)
          // We need to look inside the specific pageRef
          const draggableImgs = pageRef.querySelectorAll('.product-image-draggable') as NodeListOf<HTMLElement>
          const savedImagesStyles: any[] = []

          draggableImgs.forEach((img, idx) => {
            savedImagesStyles[idx] = {
              position: img.style.position, left: img.style.left, top: img.style.top, width: img.style.width
            }
            // Ensure pixels
            // Note: We are trusting the render state is correct.
          })

          // Force layout
          pageRef.style.overflow = 'hidden'
          await new Promise(resolve => setTimeout(resolve, 200)) // Slight delay for style application

          // Capture
          const canvas = await html2canvas(pageRef, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            ignoreElements: (element) => {
              if (element.getAttribute('data-image-draggable') === 'true') return false
              return element.hasAttribute('data-html2canvas-ignore')
            },
            onclone: (clonedDoc) => {
              // Textarea replacement logic (CRITICAL for PDF text quality)
              const clonedTemplate = clonedDoc.querySelector('.offer-template') as HTMLElement
              if (clonedTemplate) {
                clonedTemplate.style.overflow = 'visible'
                // CHANGE: Select ALL textareas in the document to handle multi-page/consolidated views
                const textareas = clonedDoc.querySelectorAll('textarea')
                console.log('[PDF] Found', textareas.length, 'textareas to replace')

                textareas.forEach((textarea, idx) => {
                  const div = clonedDoc.createElement('div')
                  div.textContent = textarea.value
                  const style = window.getComputedStyle(textarea)

                  console.log(`[PDF] Textarea ${idx} original border:`, style.border)
                  console.log(`[PDF] Textarea ${idx} original outline:`, style.outline)

                  // Copy all computed styles EXCEPT border/outline/appearance properties
                  // Border properties are excluded because textarea has a dashed border for editor UI
                  const skippedProps: string[] = []
                  Array.from(style).forEach(key => {
                    // Skip all border-related, outline-related, and appearance-related properties
                    if (
                      key.startsWith('border') ||
                      key.startsWith('outline') ||
                      key.startsWith('text-decoration') || // Check for text-decoration-line (underlines, etc)
                      key === 'box-shadow' ||
                      key === 'appearance' ||
                      key === '-webkit-appearance' ||
                      key === 'background-image' // Ensure no background patterns
                    ) {
                      skippedProps.push(key)
                      return
                    }
                    div.style.setProperty(key, style.getPropertyValue(key), style.getPropertyPriority(key))
                  })
                  // Concise logging
                  console.log(`[PDF] Textarea ${idx} skipped ${skippedProps.length} props including:`, skippedProps.slice(0, 5))

                  // CRITICAL: Use scrollHeight to get actual content height
                  // This ensures content is not cut off or shifted
                  const actualHeight = Math.max(textarea.scrollHeight, parseInt(style.height) || 0)
                  div.style.height = `${actualHeight}px`
                  div.style.minHeight = `${actualHeight}px`
                  // Do NOT set maxHeight - let content flow naturally

                  div.style.whiteSpace = 'pre-wrap'
                  div.style.wordWrap = 'break-word'
                  div.style.overflow = 'visible' // Match textarea overflow behavior
                  div.style.boxSizing = 'border-box' // Ensure consistent box model

                  // Ensure no borders/outlines appear in PDF
                  // Note: !important doesn't work in inline styles, use explicit values
                  div.style.border = '0px solid transparent'
                  div.style.borderStyle = 'none'
                  div.style.borderWidth = '0px'
                  div.style.borderColor = 'transparent'

                  div.style.outline = '0px solid transparent'
                  div.style.outlineStyle = 'none'
                  div.style.outlineWidth = '0px'

                  div.style.boxShadow = 'none'
                  div.style.backgroundImage = 'none' // Remove any background images
                  div.style.background = 'transparent' // Clear shorthand background
                  div.style.backgroundColor = 'transparent' // Ensure transparency unless needed

                  // Reset appearance to prevent native controls styling
                  div.style.appearance = 'none'
                  div.style.setProperty('-webkit-appearance', 'none')

                  // Force background to white (or matching background) just in case
                  // div.style.backgroundColor = style.backgroundColor || '#ffffff' 

                  // Debug pseudo-elements
                  const beforeStyle = window.getComputedStyle(textarea, '::before')
                  const afterStyle = window.getComputedStyle(textarea, '::after')
                  if (beforeStyle.content !== 'none' || afterStyle.content !== 'none') {
                    console.log(`[PDF] WARN: Textarea has pseudo-elements! Before: ${beforeStyle.content}, After: ${afterStyle.content}`)
                  }

                  // Remove any classes that might have border styles
                  div.className = ''

                  textarea.parentNode?.replaceChild(div, textarea)

                  // Force reflow to ensure styles are applied
                  void div.offsetHeight

                  const finalBorder = clonedDoc.defaultView?.getComputedStyle(div).border || 'unknown'
                  const finalOutline = clonedDoc.defaultView?.getComputedStyle(div).outline || 'unknown'
                  console.log(`[PDF] Textarea ${idx} FINAL border:`, finalBorder, 'outline:', finalOutline)
                  console.log(`[PDF] Textarea ${idx} inline style.border:`, div.style.border)

                  // COMPREHENSIVE DEBUGGING - Check parent elements for borders
                  const parent = div.parentElement
                  if (parent) {
                    const parentStyle = clonedDoc.defaultView?.getComputedStyle(parent)
                    console.log(`[PDF] Parent element:`, parent.tagName, 'class:', parent.className)
                    console.log(`[PDF] Parent border:`, parentStyle?.border)
                    console.log(`[PDF] Parent outline:`, parentStyle?.outline)

                    const grandparent = parent.parentElement
                    if (grandparent) {
                      const gpStyle = clonedDoc.defaultView?.getComputedStyle(grandparent)
                      console.log(`[PDF] Grandparent element:`, grandparent.tagName, 'class:', grandparent.className)
                      console.log(`[PDF] Grandparent border:`, gpStyle?.border)
                    }
                  }

                  // Log the div's actual HTML structure
                  console.log(`[PDF] Div outerHTML (first 300 chars):`, div.outerHTML.substring(0, 300))
                  console.log(`[PDF] Div background:`, clonedDoc.defaultView?.getComputedStyle(div).background)
                  console.log(`[PDF] Div padding:`, clonedDoc.defaultView?.getComputedStyle(div).padding)
                })

                // Force reflow on the entire template
                void clonedTemplate.offsetHeight
                console.log('[PDF] DOM replacement complete, ready for capture')
              }
            }
          })

          // Restore
          pageRef.style.overflow = ''

          const imgData = canvas.toDataURL('image/jpeg', 0.95)
          const imgWidth = pdfWidth
          const imgHeight = (canvas.height * pdfWidth) / canvas.width

          // Fit to page logic
          if (imgHeight > pageHeight) {
            const scale = pageHeight / imgHeight
            // Center horizontally if scaled? No, maintain left align usually or center.
            // Let's center horizontally
            const xOffset = (pdfWidth - (imgWidth * scale)) / 2
            pdf.addImage(imgData, 'JPEG', xOffset, 0, imgWidth * scale, pageHeight)
          } else {
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
          }
        }

        // Cleanup: If hideAnnexInPDF is true, Page 1 is blank.
        // If we added pages (meaning length > 1 for single PDF, or just > 1 in general), we can delete Page 1.
        // However, jsPDF init creates Page 1.
        // If we did nothing to Page 1, it's blank.
        // If we added content via addPage, we have [Page1(Blank), Page2(Products), Page3(Item1)...]
        if (hideAnnexInPDF) {
          try { pdf.deletePage(1) } catch (e) {/* ignore if single page */ }
        }

        return pdf.output('blob')

      } catch (error) {
        console.error('Generaton Error:', error)
        throw error
      }
    }

    useImperativeHandle(ref, () => ({
      generatePDF: generateFinalPDF
    }))

    return (
      <div className="offer-template-container">
        {/* Global Controls */}
        <div className="offer-template-actions">
          <div className="product-link-row" style={{ marginRight: 'auto' }}>
            {initialMetadata.productWebPage && (
              <a href={initialMetadata.productWebPage} target="_blank" rel="noreferrer">{initialMetadata.productWebPage}</a>
            )}
          </div>
          <div className="design-controls">
            <div className="color-picker-group">
              <label>Pri:</label>
              <input type="color" value={themeColors.primary} onChange={e => updateThemeColor('primary', e.target.value)} />
            </div>
            {/* Repeat for other colors if needed */}
          </div>

          {/* NEW BUTTONS - DISTINCT STYLES */}
          <button onClick={handleAddEmptyPage} style={{
            padding: '10px 16px',
            background: '#10b981', // Emerald Green 
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '12px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
          }}>
            + Adauga pagina goala
          </button>
          <button onClick={handleAddClonePage} style={{
            padding: '10px 16px',
            background: '#3b82f6', // Blue
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '12px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
          }}>
            + Adauga pagina produs (clona)
          </button>

          {!hideGenerateButton && (
            <button onClick={async () => {
              try { onGeneratePDF(await generateFinalPDF()) } catch (e) { alert('Error locally') }
            }} className="generate-pdf-button">
              Generate PDF
            </button>
          )}
        </div>

        {/* 1. Annex Preview */}
        {!hideAnnex && (
          <div className="annex-preview" dangerouslySetInnerHTML={{ __html: getAnnexHTML() }}></div>
        )}

        {/* 2. Products Table (Editable) */}
        <div style={{
          marginTop: '30px', padding: '10mm 15mm', border: '1px solid #ddd', backgroundColor: '#fff',
          width: '210mm', minHeight: '297mm', boxSizing: 'border-box', margin: '30px auto'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#000', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>Tabel Produse</h3>

          {products.length > 0 ? (
            <div style={{ overflowX: 'visible' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                border: '1px solid #000',
                color: '#000',
                tableLayout: 'fixed'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '60px', color: '#000' }}>Nr.<br />crt.</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', color: '#000' }}>Denumire produs</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '60px', color: '#000' }}>U.M.</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '80px', color: '#000' }}>Cantitati</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '120px', color: '#000' }}>Pret unitar<br />fara tva</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '120px', color: '#000' }}>Valoare<br />totala<br />fara TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={index}>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'center', fontSize: '13px', color: '#000' }}>
                        <input
                          type="number"
                          value={product.itemNumber}
                          onChange={(e) => {
                            const updated = [...products]
                            updated[index].itemNumber = parseInt(e.target.value) || 0
                            setProducts(updated)
                          }}
                          style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '13px', background: 'transparent' }}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'left', fontSize: '13px', color: '#000' }}>
                        <input
                          type="text"
                          value={product.productName}
                          onChange={(e) => {
                            const updated = [...products]
                            updated[index].productName = e.target.value
                            setProducts(updated)
                          }}
                          style={{ width: '100%', border: 'none', textAlign: 'left', fontSize: '13px', background: 'transparent' }}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'center', fontSize: '13px', color: '#000' }}>
                        <input
                          type="text"
                          value={product.unitOfMeasurement}
                          onChange={(e) => {
                            const updated = [...products]
                            updated[index].unitOfMeasurement = e.target.value
                            setProducts(updated)
                          }}
                          style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '13px', background: 'transparent' }}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'center', fontSize: '13px', color: '#000' }}>
                        <input
                          type="number"
                          value={product.quantity}
                          onChange={(e) => {
                            const updated = [...products]
                            updated[index].quantity = parseInt(e.target.value) || 0
                            updated[index].totalValueNoVAT = updated[index].unitPriceNoVAT * updated[index].quantity
                            setProducts(updated)
                          }}
                          style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '13px', background: 'transparent' }}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'right', fontSize: '13px', color: '#000' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={product.unitPriceNoVAT}
                          onChange={(e) => {
                            const updated = [...products]
                            updated[index].unitPriceNoVAT = parseFloat(e.target.value) || 0
                            updated[index].totalValueNoVAT = updated[index].quantity * updated[index].unitPriceNoVAT
                            setProducts(updated)
                          }}
                          style={{ width: '100%', border: 'none', textAlign: 'right', fontSize: '13px', background: 'transparent' }}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'right', fontSize: '13px', color: '#000' }}>
                        {product.totalValueNoVAT.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#000' }}>
                      TOTAL FARA TVA= {products.reduce((sum, p) => sum + p.totalValueNoVAT, 0).toFixed(2)} LEI
                    </td>
                  </tr>
                </tfoot>
              </table>
              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <button
                  onClick={() => {
                    if (products.length > 0) {
                      setProducts(products.slice(0, -1))
                    }
                  }}
                  style={{ marginRight: '10px', padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Sterge ultimul rand
                </button>
                <button
                  onClick={() => setProducts([...products, { itemNumber: products.length + 1, productName: 'Produs Nou', unitOfMeasurement: 'BUC', quantity: 1, unitPriceNoVAT: 0, totalValueNoVAT: 0 }])}
                  style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                  + Adaugă Rând
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>Nu există produse în tabel</p>
              <button
                onClick={() => setProducts([...products, { itemNumber: 1, productName: 'Produs Nou', unitOfMeasurement: 'BUC', quantity: 1, unitPriceNoVAT: 0, totalValueNoVAT: 0 }])}
                style={{ marginTop: '10px', padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
              >
                Adaugă primul produs
              </button>
            </div>
          )}


          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', paddingTop: '10mm', alignItems: 'flex-end', padding: '0 20px 20px 20px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '11pt', color: '#000' }}><strong style={{ color: '#000' }}>OFERTANTUL</strong></p>
              <p style={{ margin: '0 0 3px 0', fontSize: '11pt', color: '#000' }}><strong style={{ color: '#000' }}>S.C. AS GREEN LAND S.R.L</strong></p>
              <p style={{ margin: 0, fontSize: '10pt', fontStyle: 'italic', color: '#000' }}>(denumirea/numele)</p>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <p style={{ margin: '0 0 3px 0', fontSize: '10pt', color: '#000' }}>Preturile Nu Contin TVA</p>
              <p style={{ margin: '0 0 3px 0', fontSize: '10pt', color: '#000' }}>Transportul este inclus in pret</p>
              <p style={{ margin: '0 0 3px 0', fontSize: '10pt', color: '#000' }}>Plata prin cont de Trezorerie</p>
              <p style={{ margin: 0, fontSize: '10pt', color: '#000' }}>Termen de plata stabilt la semnarea contractului</p>
            </div>
          </div>
        </div>

        {/* 3. Render Pages */}
        {
          pages.map((page, i) => (
            <ProductPage
              key={page.id}
              index={i}
              ref={el => { pageRefs.current[i] = el }}
              content={page}
              onChange={(newContent) => handlePageUpdate(i, newContent)}
              onDelete={handlePageDelete}
              themeColors={themeColors}
              customText={customText}
              updateCustomText={updateCustomText}
            />
          ))
        }

        {/* Add Page Button? User might want to manually add a blank page? optional */}
      </div >
    )
  }
)
OfferTemplate.displayName = 'OfferTemplate'
