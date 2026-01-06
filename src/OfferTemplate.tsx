import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { OfferData, Product, TechnicalDetail } from './types'
import { EditableText } from './components/EditableText'
import './OfferTemplate.css'

interface OfferTemplateProps {
  offerData: OfferData
  onGeneratePDF: (pdfBlob: Blob) => void
}

export interface OfferTemplateRef {
  generatePDF: () => Promise<Blob>
}

// --- 1. PRODUCTS TABLE PAGE ---
function getProductsTableHTML(products: Product[]) {
  if (!products || products.length === 0) {
    return ''
  }

  const totalNoVAT = products.reduce((sum, p) => sum + (p.totalValueNoVAT || 0), 0)

  const productsRows = products.map(product => `
    <tr>
      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10pt;">${product.itemNumber}</td>
      <td style="border: 1px solid #000; padding: 8px; font-size: 10pt;"><strong>${product.productName}</strong></td>
      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10pt;">${product.unitOfMeasurement}</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10pt;">${product.quantity}</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 10pt;">${product.unitPriceNoVAT}</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 10pt;">${product.totalValueNoVAT}</td>
    </tr>
  `).join('')

  return `
    <div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 20mm 15mm;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 8px; background: #f0f0f0; text-align: center; font-size: 10pt;">Nr.<br/>crt.</th>
            <th style="border: 1px solid #000; padding: 8px; background: #f0f0f0; text-align: center; font-size: 10pt;">Denumire produs</th>
            <th style="border: 1px solid #000; padding: 8px; background: #f0f0f0; text-align: center; font-size: 10pt;">U.M.</th>
            <th style="border: 1px solid #000; padding: 8px; background: #f0f0f0; text-align: center; font-size: 10pt;">Cantitati</th>
            <th style="border: 1px solid #000; padding: 8px; background: #f0f0f0; text-align: center; font-size: 10pt;">Pret unitar<br/>fara tva</th>
            <th style="border: 1px solid #000; padding: 8px; background: #f0f0f0; text-align: center; font-size: 10pt;">Valoare<br/>totala<br/>fara TVA</th>
          </tr>
        </thead>
        <tbody>
          ${productsRows}
          <tr>
            <td colspan="6" style="border: 1px solid #000; padding: 12px; text-align: right; font-weight: bold; font-size: 11pt;">
              TOTAL FARA TVA= ${totalNoVAT} LEI
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div style="flex: 1;">
          <p style="margin: 0 0 10px 0; font-size: 11pt;"><strong>OFERTANTUL</strong></p>
          <p style="margin: 0 0 5px 0; font-size: 11pt;"><strong>S.C. AS GREEN LAND S.R.L</strong></p>
          <p style="margin: 0; font-size: 10pt; font-style: italic;">(denumirea/numele)</p>
        </div>
        <div style="flex: 1; text-align: right;">
          <p style="margin: 0 0 5px 0; font-size: 10pt;">Preturile Nu Contin TVA</p>
          <p style="margin: 0 0 5px 0; font-size: 10pt;">Transportul este inclus in pret</p>
          <p style="margin: 0 0 5px 0; font-size: 10pt;">Plata prin cont de Trezorerie</p>
          <p style="margin: 0; font-size: 10pt;">Termen de plata stabilt la semnarea contractului</p>
        </div>
      </div>
    </div>
  `
}

// --- 2. ANNEX CONTENT (The "AS GREEN LAND" text) ---
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
    const { offerMetadata: initialMetadata = {} as any, offerConent: initialContent = {} as any } = offerData || {}

    // State for main content
    const [title, setTitle] = useState(initialContent.title || '')
    const [subtitle, setSubtitle] = useState(initialContent.subtitle || '')
    const [mainMessage, setMainMessage] = useState(initialContent.mainMessage || '')
    const [technicalDetailsMessage, setTechnicalDetailsMessage] = useState(initialContent.technicalDetailsMessage || '')
    const [technicalDetailsTable, setTechnicalDetailsTable] = useState(initialContent.technicalDetailsTable || [])
    const [productPrice, setProductPrice] = useState(initialContent.productPrice || '')
    const [offerDate, setOfferDate] = useState(initialMetadata.offerDate || '')
    const [offerReference, setOfferReference] = useState(initialMetadata.offerReference || '')
    const [productImage, setProductImage] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState(initialMetadata.companyName || '')
    const [footerLegal, setFooterLegal] = useState(
      initialMetadata.companyLegalName || initialMetadata.vatNumber || initialMetadata.registrationNumber
        ? `${initialMetadata.companyLegalName || ''} | ${initialMetadata.vatNumber || ''} | ${initialMetadata.registrationNumber || ''}`
        : ''
    )
    const [footerAddress, setFooterAddress] = useState('Strada Comerțului Nr. 10, Sector 1, București')
    const [products, setProducts] = useState(initialContent.products || [])

    // Debug: Log products state on every render
    console.log('OfferTemplate render - Products state:', products)
    console.log('OfferTemplate render - Products count:', products.length)
    console.log('OfferTemplate render - Initial content products:', initialContent.products)

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
      primary: '#ffffff',
      secondary: '#ffffff',
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
      // Debug: Log products from initial content
      console.log('Resetting offer template state')
      console.log('Initial products:', initialContent.products)
      console.log('Products count:', initialContent.products?.length || 0)

      setTitle(initialContent.title || '')
      setSubtitle(initialContent.subtitle || '')
      setMainMessage(initialContent.mainMessage || '')
      setTechnicalDetailsMessage(initialContent.technicalDetailsMessage || '')
      setTechnicalDetailsTable(initialContent.technicalDetailsTable || [])
      setProductPrice(initialContent.productPrice || '')
      setOfferDate(initialMetadata.offerDate || '')
      setOfferReference(initialMetadata.offerReference || '')
      setProductImage(initialContent.productImageUrl || null)
      setCompanyName(initialMetadata.companyName || '')
      setFooterLegal(
        initialMetadata.companyLegalName || initialMetadata.vatNumber || initialMetadata.registrationNumber
          ? `${initialMetadata.companyLegalName || ''} | ${initialMetadata.vatNumber || ''} | ${initialMetadata.registrationNumber || ''}`
          : ''
      )
      setProducts(initialContent.products || [])
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

      // Debug: Log products state
      console.log('Generating PDF with products:', products)
      console.log('Products count:', products.length)

      try {
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = 210

        // --- PAGE 1: Annex (Formular de Oferta) - NOW FIRST ---
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

        // --- PAGE 2: Products Table (if products exist) ---
        if (products && products.length > 0) {
          pdf.addPage()

          const productsContainer = document.createElement('div')
          productsContainer.style.position = 'absolute'
          productsContainer.style.left = '-9999px'
          productsContainer.style.top = '0'
          productsContainer.style.width = '210mm'
          productsContainer.style.backgroundColor = 'white'

          productsContainer.innerHTML = getProductsTableHTML(products)
          document.body.appendChild(productsContainer)

          const productsCanvas = await html2canvas(productsContainer, {
            scale: 2,
            logging: false,
            backgroundColor: '#ffffff'
          })

          const productsImgHeight = (productsCanvas.height * pdfWidth) / productsCanvas.width
          const productsImgData = productsCanvas.toDataURL('image/jpeg', 0.8)

          pdf.addImage(productsImgData, 'JPEG', 0, 0, pdfWidth, productsImgHeight)
          document.body.removeChild(productsContainer)
        }

        // --- PAGE 3: Main Offer - NOW LAST ---
        pdf.addPage()

        const canvas = await html2canvas(templateRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })

        const imgHeight = (canvas.height * pdfWidth) / canvas.width
        const imgData = canvas.toDataURL('image/jpeg', 0.8)

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight)

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

        {/* Annex Page Preview - SHOWN FIRST */}
        <div className="annex-preview" dangerouslySetInnerHTML={{ __html: getAnnexHTML() }}></div>

        {/* Products Table Display - Read-only preview */}
        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
            Tabel Produse
          </h3>

          {products.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #000' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '60px' }}>Nr.<br/>crt.</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>Denumire produs</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '60px' }}>U.M.</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '80px' }}>Cantitati</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '120px' }}>Pret unitar<br/>fara tva</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #000', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', width: '120px' }}>Valoare<br/>totala<br/>fara TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: Product, index: number) => (
                    <tr key={index}>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'center', fontSize: '13px' }}>
                        {product.itemNumber}
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'left', fontSize: '13px' }}>
                        {product.productName}
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'center', fontSize: '13px' }}>
                        {product.unitOfMeasurement}
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'center', fontSize: '13px' }}>
                        {product.quantity}
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'right', fontSize: '13px' }}>
                        {product.unitPriceNoVAT.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'right', fontSize: '13px' }}>
                        {product.totalValueNoVAT.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ padding: '10px 8px', border: '1px solid #000', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>
                      TOTAL FARA TVA= {products.reduce((sum: number, p: Product) => sum + p.totalValueNoVAT, 0).toFixed(2)} LEI
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>Nu există produse în tabel</p>
            </div>
          )}
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
                {Array.isArray(technicalDetailsTable) && technicalDetailsTable.map((detail: TechnicalDetail, index: number) => (
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