import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { OfferData } from './types'
import { EditableText } from './components/EditableText'
import './OfferTemplate.css'

interface OfferTemplateProps {
  offerData: OfferData
  onGeneratePDF: (pdfBlob: Blob) => void
}

export interface OfferTemplateRef {
  generatePDF: () => Promise<Blob>
}

// --- 1. ANNEX CONTENT (The "AS GREEN LAND" text) ---
function getAnnexHTML() {
  return `
    <div style="font-family: Arial, sans-serif; color: #000; line-height: 1.6; font-size: 11pt; background: white; padding: 15mm 10mm;">
      <div style="margin-bottom: 20px;">
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
        2. Ne angajăm ca, în cazul în care oferta noastră este stabilită câştigătoare, sa furnizam produsele
        în termen de 5 zile de la comanda.
      </p>

      <p style="margin-bottom: 12px; text-align: justify;">
        3. Ne angajăm sa menţinem aceasta oferta valabilă pentru o durata de 30 zile, (treizeci de zile),
        respectiv pana la data de 18.01.2026, şi ea va rămâne obligatorie pentru noi şi poate fi acceptată
        oricând înainte de expirarea perioadei de valabilitate.
      </p>

      <p style="margin-bottom: 12px; text-align: justify;">
        4. Pana la încheierea şi semnarea contractului de achiziţie publica aceasta oferta, împreună cu
        comunicarea transmisă de dumneavoastră, prin care oferta noastră este stabilită câştigătoare, vor
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
        6. Am înţeles şi consimtim ca, în cazul în care oferta noastră este stabilită ca fiind câştigătoare, sa
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

export const OfferTemplate = forwardRef<OfferTemplateRef, OfferTemplateProps>(
  ({ offerData, onGeneratePDF }, ref) => {
    const templateRef = useRef<HTMLDivElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const { offerMetadata: initialMetadata, offerConent: initialContent } = offerData

    // State for main content
    const [title, setTitle] = useState(initialContent.title)
    const [subtitle, setSubtitle] = useState(initialContent.subtitle)
    const [mainMessage, setMainMessage] = useState(initialContent.mainMessage)
    const [technicalDetailsMessage, setTechnicalDetailsMessage] = useState(initialContent.technicalDetailsMessage)
    const [technicalDetailsTable, setTechnicalDetailsTable] = useState(initialContent.technicalDetailsTable)
    const [productPrice, setProductPrice] = useState(initialContent.productPrice)
    const [offerDate, setOfferDate] = useState(initialMetadata.offerDate)
    const [offerReference, setOfferReference] = useState(initialMetadata.offerReference)
    const [productImage, setProductImage] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState(initialMetadata.companyName)
    const [footerLegal, setFooterLegal] = useState(
      `${initialMetadata.companyLegalName} | ${initialMetadata.vatNumber} | ${initialMetadata.registrationNumber}`
    )
    const [footerAddress, setFooterAddress] = useState('Strada Comerțului Nr. 10, Sector 1, București')

    // State for "Static" labels that are now editable
    const [customText, setCustomText] = useState({
      productPageLabel: 'Pagină produs:',
      documentType: 'Ofertă comercială',
      salutation: 'Stimate Client,',
      imageCaption: 'Fig 1. Vizualizare produs în showroom',
      techDetailsTitle: 'Descriere Tehnică Detaliată',
      specialPriceLabel: 'PRET SPECIAL DE OFERTĂ',
      priceNote: 'TVA Inclus. Livrare Standard Gratuită.',
      validityTitle: 'Condiții de valabilitate:',
      validityText: 'Oferta este valabilă în timp ce stocul durează. Prețul include taxa verde. Vă rugăm să ne contactați pentru confirmarea comenzii sau să ne vizitați în showroom.',
      footerNote: 'Document generat electronic. Nu necesită stampilă.',
      dateLabel: 'Data:',
      refLabel: 'Ref:',
    })

    // State for Theme Colors
    const [themeColors, setThemeColors] = useState({
      primary: '#1d4ed8',
      secondary: '#f97316',
      text: '#1f2933',
      bg: '#ffffff',
    })

    // Update the container CSS variables when colors change
    useEffect(() => {
      if (templateRef.current) {
        templateRef.current.style.setProperty('--theme-primary', themeColors.primary)
        templateRef.current.style.setProperty('--theme-secondary', themeColors.secondary)
        templateRef.current.style.setProperty('--theme-text', themeColors.text)
        templateRef.current.style.setProperty('--theme-bg', themeColors.bg)
      }
    }, [themeColors])

    // Reset state when offerData changes
    useEffect(() => {
      setTitle(initialContent.title)
      setSubtitle(initialContent.subtitle)
      setMainMessage(initialContent.mainMessage)
      setTechnicalDetailsMessage(initialContent.technicalDetailsMessage)
      setTechnicalDetailsTable(initialContent.technicalDetailsTable)
      setProductPrice(initialContent.productPrice)
      setOfferDate(initialMetadata.offerDate)
      setOfferReference(initialMetadata.offerReference)
      setProductImage(initialContent.productImageUrl || null)
      setCompanyName(initialMetadata.companyName)
      setFooterLegal(
        `${initialMetadata.companyLegalName} | ${initialMetadata.vatNumber} | ${initialMetadata.registrationNumber}`
      )
    }, [offerData, initialContent, initialMetadata])

    const updateCustomText = (key: keyof typeof customText, value: string) => {
      setCustomText((prev) => ({ ...prev, [key]: value }))
    }

    const updateThemeColor = (key: keyof typeof themeColors, value: string) => {
      setThemeColors((prev) => ({ ...prev, [key]: value }))
    }

    const formatDate = (dateString: string) => {
      if (!dateString) return ''
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('ro-RO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      } catch {
        return dateString
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
            setProductImage(result)
          }
        }
        reader.readAsDataURL(file)
      }
    }

    const handleRemoveImage = () => {
      setProductImage(null)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }

    const handleTableFieldChange = (
      index: number,
      field: 'itemTitle' | 'itemDescription',
      value: string
    ) => {
      const updated = [...technicalDetailsTable]
      updated[index] = { ...updated[index], [field]: value }
      setTechnicalDetailsTable(updated)
    }

    // --- 2. NEW PDF GENERATION LOGIC (Merged) ---
    const generateFinalPDF = async (): Promise<Blob> => {
      if (!templateRef.current) throw new Error('Template ref not found')

      try {
        // --- PAGE 1: Main Offer ---
        const canvas = await html2canvas(templateRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })

        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = 210
        const imgHeight = (canvas.height * pdfWidth) / canvas.width
        const imgData = canvas.toDataURL('image/jpeg', 0.8)
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight)

        // --- PAGE 2: Annex (Formular de Oferta) ---
        pdf.addPage()

        const annexContainer = document.createElement('div')
        annexContainer.style.position = 'absolute'
        annexContainer.style.left = '-9999px'
        annexContainer.style.top = '0'
        annexContainer.style.width = '210mm'
        annexContainer.style.backgroundColor = 'white'
        annexContainer.style.padding = '20mm'
        
        annexContainer.innerHTML = getAnnexHTML()
        document.body.appendChild(annexContainer)

        const annexCanvas = await html2canvas(annexContainer, {
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff'
        })

        const annexImgHeight = (annexCanvas.height * pdfWidth) / annexCanvas.width
        const annexImgData = annexCanvas.toDataURL('image/jpeg', 0.8)
        
        pdf.addImage(annexImgData, 'JPEG', 0, 0, pdfWidth, annexImgHeight)
        document.body.removeChild(annexContainer)

        return pdf.output('blob')

      } catch (error) {
        console.error('Error in generateFinalPDF:', error)
        throw error
      }
    }

    // Connect the new logic to the Button
    const handleGeneratePDF = async () => {
      try {
        const pdfBlob = await generateFinalPDF()
        onGeneratePDF(pdfBlob)
      } catch (error) {
        console.error('Error generating PDF:', error)
        alert('Error generating PDF. Please try again.')
      }
    }

    // Connect the new logic to the Ref (for ZIP download)
    useImperativeHandle(ref, () => ({
      generatePDF: async () => {
        return await generateFinalPDF()
      },
    }))

    return (
      <div className="offer-template-container">
        <div className="offer-template-actions">
          {initialMetadata.productWebPage && (
            <div className="product-link-row" style={{ marginRight: 'auto' }}>
              <EditableText
                tagName="span"
                className="product-link-label"
                value={customText.productPageLabel}
                onChange={(val) => updateCustomText('productPageLabel', val)}
              />
              <a
                href={initialMetadata.productWebPage}
                target="_blank"
                rel="noreferrer"
                className="product-link-url"
              >
                {initialMetadata.productWebPage}
              </a>
            </div>
          )}
          <div className="design-controls">
            <div className="color-picker-group">
              <label htmlFor="color-primary" title="Primary Color">Pri:</label>
              <input
                id="color-primary"
                type="color"
                value={themeColors.primary}
                onChange={(e) => updateThemeColor('primary', e.target.value)}
                className="color-picker-input"
              />
            </div>
            <div className="color-picker-group">
              <label htmlFor="color-secondary" title="Secondary Color">Sec:</label>
              <input
                id="color-secondary"
                type="color"
                value={themeColors.secondary}
                onChange={(e) => updateThemeColor('secondary', e.target.value)}
                className="color-picker-input"
              />
            </div>
            <div className="color-picker-group">
              <label htmlFor="color-text" title="Text Color">Txt:</label>
              <input
                id="color-text"
                type="color"
                value={themeColors.text}
                onChange={(e) => updateThemeColor('text', e.target.value)}
                className="color-picker-input"
              />
            </div>
            <div className="color-picker-group">
              <label htmlFor="color-bg" title="Background Color">Bg:</label>
              <input
                id="color-bg"
                type="color"
                value={themeColors.bg}
                onChange={(e) => updateThemeColor('bg', e.target.value)}
                className="color-picker-input"
              />
            </div>
          </div>

          <button onClick={handleGeneratePDF} className="generate-pdf-button">
            Generate PDF
          </button>
        </div>

        <div ref={templateRef} className="offer-template">
          {/* Header */}
          <div className="offer-header">
            {initialContent.confidenceMessage && (
              <div
                className="confidence-warning-wrapper"
                data-html2canvas-ignore="true"
                title={initialContent.confidenceMessage}
                onClick={() => alert(initialContent.confidenceMessage)}
              >
                <div className="confidence-warning-icon">!</div>
                <div className="confidence-tooltip">{initialContent.confidenceMessage}</div>
              </div>
            )}
            <div className="header-left">
              <EditableText
                tagName="h1"
                className="company-name"
                value={companyName}
                onChange={setCompanyName}
              />
            </div>
            <div className="header-right">
              <p className="offer-date">
                <EditableText
                  tagName="strong"
                  value={customText.dateLabel}
                  onChange={(val) => updateCustomText('dateLabel', val)}
                  className="editable-text"
                />{' '}
                <input
                  type="date"
                  value={offerDate || ''}
                  onChange={(e) => setOfferDate(e.target.value)}
                  className="editable-date-input"
                />
                <span className="formatted-date-display" style={{ display: 'none' }}>
                  {formatDate(offerDate) || 'N/A'}
                </span>
              </p>
              <p className="offer-reference">
                <EditableText
                  tagName="strong"
                  value={customText.refLabel}
                  onChange={(val) => updateCustomText('refLabel', val)}
                  className="editable-text"
                />{' '}
                <input
                  type="text"
                  value={offerReference}
                  onChange={(e) => setOfferReference(e.target.value)}
                  placeholder="N/A"
                  className="editable-text-input"
                />
              </p>
            </div>
          </div>
          <div className="header-divider"></div>

          {/* Title and Subtitle */}
          <div className="offer-title-section">
            <EditableText
              tagName="p"
              className="offer-document-label"
              value={customText.documentType}
              onChange={(val) => updateCustomText('documentType', val)}
            />


            <EditableText
              tagName="h2"
              className="offer-title"
              value={title}
              onChange={setTitle}
            />
            <EditableText
              tagName="p"
              className="offer-subtitle"
              value={subtitle}
              onChange={setSubtitle}
            />
          </div>

          {/* Main Message */}
          <div className="offer-main-message">
            <EditableText
              tagName="p"
              className="salutation"
              value={customText.salutation}
              onChange={(val) => updateCustomText('salutation', val)}
            />
            <textarea
              value={mainMessage}
              onChange={(e) => setMainMessage(e.target.value)}
              className="editable-textarea message-content"
              rows={4}
            />
          </div>

          {/* Product Image */}
          <div className="product-image-section">
            <div className="product-image-container">
              {productImage ? (
                <div className="product-image-wrapper">
                  <img src={productImage} alt="Product" className="product-image" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="remove-image-button"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="product-image-placeholder">
                  <p className="image-placeholder-text">Product Image</p>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="image-upload-input"
                id={`image-upload-${initialContent.title}`}
              />
              <label
                htmlFor={`image-upload-${initialContent.title}`}
                className="image-upload-label"
              >
                {productImage ? 'Change Image' : 'Upload Image'}
              </label>
            </div>
            <EditableText
              tagName="p"
              className="image-caption"
              value={customText.imageCaption}
              onChange={(val) => updateCustomText('imageCaption', val)}
            />
          </div>

          {/* Technical Description */}
          <div className="technical-description">
            <EditableText
              tagName="h3"
              className="section-title"
              value={customText.techDetailsTitle}
              onChange={(val) => updateCustomText('techDetailsTitle', val)}
            />
            <textarea
              value={technicalDetailsMessage}
              onChange={(e) => setTechnicalDetailsMessage(e.target.value)}
              className="editable-textarea technical-message"
              rows={4}
            />
          </div>

          {/* Technical Specifications Table */}
          <div className="technical-table-section">
            <table className="technical-table">
              <tbody>
                {technicalDetailsTable.map((detail, index) => (
                  <tr key={index}>
                    <td className="table-title">
                      <input
                        type="text"
                        value={detail.itemTitle}
                        onChange={(e) =>
                          handleTableFieldChange(index, 'itemTitle', e.target.value)
                        }
                        className="editable-table-input"
                      />
                    </td>
                    <td className="table-description">
                      <input
                        type="text"
                        value={detail.itemDescription}
                        onChange={(e) =>
                          handleTableFieldChange(index, 'itemDescription', e.target.value)
                        }
                        className="editable-table-input"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Special Offer Price */}
          <div className="special-offer-section">
            <div className="special-offer-box">
              <div className="offer-price-left">
                <EditableText
                  tagName="p"
                  className="offer-price-label"
                  value={customText.specialPriceLabel}
                  onChange={(val) => updateCustomText('specialPriceLabel', val)}
                />
                <EditableText
                  tagName="p"
                  className="offer-price-note"
                  value={customText.priceNote}
                  onChange={(val) => updateCustomText('priceNote', val)}
                />
              </div>
              <div className="offer-price-right">
                <input
                  type="text"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  className="editable-price-input"
                />
              </div>
            </div>
          </div>

          {/* Validity Conditions */}
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

          {/* Footer */}
          <div className="offer-footer">
            <EditableText
              tagName="p"
              className="footer-legal"
              value={footerLegal}
              onChange={setFooterLegal}
            />
            <EditableText
              tagName="p"
              className="footer-address"
              value={footerAddress}
              onChange={setFooterAddress}
            />
            <EditableText
              tagName="p"
              className="footer-note"
              value={customText.footerNote}
              onChange={(val) => updateCustomText('footerNote', val)}
            />
          </div>
        </div>

        {/* Annex Page Preview */}
        <div className="annex-preview" dangerouslySetInnerHTML={{ __html: getAnnexHTML() }}></div>
      </div>
    )
  }
)

OfferTemplate.displayName = 'OfferTemplate'