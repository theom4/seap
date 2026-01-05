import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { OfferData } from './types'
import { generatePDFFromHTML } from './utils/htmlToPdf'
import { EditableText } from './components/EditableText'
import './OfferTemplate.css'

interface OfferTemplateProps {
  offerData: OfferData
  onGeneratePDF: (pdfBlob: Blob) => void
}

export interface OfferTemplateRef {
  generatePDF: () => Promise<Blob>
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

    const handleGeneratePDF = async () => {
      if (!templateRef.current) return

      try {
        const pdfBlob = await generatePDFFromHTML(templateRef.current)
        onGeneratePDF(pdfBlob)
      } catch (error) {
        console.error('Error generating PDF:', error)
        alert('Error generating PDF. Please try again.')
      }
    }

    // Expose generatePDF function via ref
    useImperativeHandle(ref, () => ({
      generatePDF: async () => {
        if (!templateRef.current) {
          throw new Error('Template ref is not available')
        }
        return await generatePDFFromHTML(templateRef.current)
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
      </div>
    )
  }
)

OfferTemplate.displayName = 'OfferTemplate'





