import { useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { PDFDocument } from 'pdf-lib'
import html2canvas from 'html2canvas'
import type { OfferData } from './types'
import { OfferTemplate, type OfferTemplateRef } from './OfferTemplate'
import './OfferTemplate.css'

interface ConsolidatedDocumentProps {
    offers: OfferData[]
    onDownload?: () => void
}

export interface ConsolidatedDocumentRef {
    generatePDF: () => Promise<Blob>
}

export const ConsolidatedDocument = forwardRef<ConsolidatedDocumentRef, ConsolidatedDocumentProps>(
    ({ offers }, ref) => {
        const templateRefs = useRef<(OfferTemplateRef | null)[]>([])
        const formularRef = useRef<HTMLDivElement>(null)
        const [customPages, setCustomPages] = useState<Array<{ id: number; content: string }>>([])

        const generatePDF = async (): Promise<Blob> => {
            try {
                // Create a new PDF document
                const mergedPdf = await PDFDocument.create()

                // 1. Capture Formular de Oferta (Annex) and add as first page
                if (formularRef.current) {
                    try {
                        const canvas = await html2canvas(formularRef.current, {
                            scale: 2,
                            logging: false,
                            backgroundColor: '#ffffff',
                            useCORS: true // Ensure images in it are captured if any
                        })

                        const imgData = canvas.toDataURL('image/jpeg', 0.95)
                        const imgBytes = await fetch(imgData).then(res => res.arrayBuffer())
                        const jpgImage = await mergedPdf.embedJpg(imgBytes)

                        const page = mergedPdf.addPage()
                        const { width, height } = page.getSize()

                        // Fit image to page
                        page.drawImage(jpgImage, {
                            x: 0,
                            y: 0,
                            width: width,
                            height: height,
                        })
                    } catch (err) {
                        console.error("Error capturing Formular de Oferta:", err)
                    }
                }

                // Generate PDF for each offer template and merge them
                for (let i = 0; i < templateRefs.current.length; i++) {
                    const templateRef = templateRefs.current[i]
                    if (templateRef) {
                        try {
                            const offerPdfBlob = await templateRef.generatePDF()
                            const offerPdfBytes = await offerPdfBlob.arrayBuffer()
                            const offerPdf = await PDFDocument.load(offerPdfBytes)

                            // Copy all pages from this offer's PDF
                            const copiedPages = await mergedPdf.copyPages(offerPdf, offerPdf.getPageIndices())
                            copiedPages.forEach((page) => {
                                mergedPdf.addPage(page)
                            })
                        } catch (error) {
                            console.error(`Error generating PDF for offer ${i}: `, error)
                        }
                    }
                }

                // Save the merged PDF
                const mergedPdfBytes = await mergedPdf.save()
                return new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' })
            } catch (error) {
                console.error('Error in generatePDF:', error)
                throw error
            }
        }

        useImperativeHandle(ref, () => ({
            generatePDF,
        }))

        const handleDownload = async () => {
            try {
                const pdfBlob = await generatePDF()
                const url = URL.createObjectURL(pdfBlob)
                const link = document.createElement('a')
                link.href = url
                link.download = `oferta_completa_${new Date().toISOString().split('T')[0]}.pdf`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            } catch (error) {
                console.error('Error generating PDF:', error)
                alert('A apărut o eroare la generarea PDF-ului.')
            }
        }

        const addCustomPage = () => {
            const newPage = {
                id: Date.now(),
                content: '<h2>Pagină Personalizată</h2><p>Adăugați conținut aici...</p>'
            }
            setCustomPages([...customPages, newPage])
        }

        const removeCustomPage = (id: number) => {
            setCustomPages(customPages.filter(p => p.id !== id))
        }

        const updateCustomPage = (id: number, content: string) => {
            setCustomPages(customPages.map(p => p.id === id ? { ...p, content } : p))
        }

        // Calculate total offers and products across all offers
        const totalProducts = offers.reduce((sum, offer) => {
            const products = offer.offerConent?.products || offer.offerContent?.products || []
            return sum + products.length
        }, 0)

        return (
            <div className="consolidated-document">
                {/* Header with buttons */}
                <div className="sticky top-0 bg-surface z-10 px-6 pt-6 pb-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-text-main">
                        Document Complet ({offers.length} oferte, {totalProducts} produse)
                    </h2>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={addCustomPage}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold transition-colors shadow-sm flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Adaugă Pagini</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            className="px-4 py-2 bg-primary text-back rounded-lg hover:bg-primary-hover text-sm font-bold transition-colors shadow-sm"
                        >
                            Download Now
                        </button>
                    </div>
                </div>

                {/* Document Content */}
                <div
                    className="max-h-[80vh] overflow-y-auto overflow-x-auto bg-gray-100 p-4"
                    style={{
                        textRendering: 'optimizeLegibility',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        fontSmooth: 'always',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)',
                    }}
                >
                    {/* Single Formular de Oferta page at the beginning */}
                    <div
                        ref={formularRef}
                        style={{
                            fontFamily: 'Arial, sans-serif',
                            color: '#000',
                            lineHeight: 1.6,
                            fontSize: '11pt',
                            background: 'white',
                            padding: '15mm 10mm',
                            width: '210mm',
                            minHeight: '297mm',
                            boxSizing: 'border-box',
                            marginBottom: '40px',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                    >
                        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                            <strong>S.C. AS GREEN LAND S.R.L</strong><br />
                            Sediu social - Str.Lalelelor 12 Comuna Nuci Sat Merii Petchii, Ilfov,<br />
                            CUI: RO 46581890 Registrul Comertului :J2022005182231<br />
                            Trezorerie ILFOV Cont RO88TREZ4215069XXX022087<br />
                            Telefon: 0720.706.784 E-mail: asgreenland10@gmail.com<br />
                            Capital social: 200 RON
                        </div>

                        <h2 style={{ textAlign: 'center', margin: '30px 0', fontSize: '14pt', fontWeight: 'bold' }}>FORMULAR DE OFERTA</h2>

                        <p style={{ marginBottom: '15px' }}><strong>Către</strong></p>
                        <p style={{ marginBottom: '15px' }}><strong>Domnilor,</strong></p>

                        <p style={{ marginBottom: '12px', textAlign: 'justify' }}>
                            1. Examinând documentaţia de atribuire, subsemnaţii, reprezentanţi ai ofertantului AS GREEN LAND SRL,
                            ne oferim ca, în conformitate cu prevederile şi cerinţele cuprinse în documentaţia mai sus menţionată,
                            sa furnizăm DIVERSE MATERIALE. pentru suma de prezenta in tabelul din anexa,
                            platibila după recepţia produselor
                        </p>

                        <p style={{ marginBottom: '12px', textAlign: 'justify' }}>
                            2. Ne angajăm ca, în cazul în care oferta noastră este stabilită căştigătoare, sa furnizam produsele
                            în termen de 5 zile de la comanda.
                        </p>

                        <p style={{ marginBottom: '12px', textAlign: 'justify' }}>
                            3. Ne angajăm sa menţinem aceasta oferta valabilă pentru o durata de 30 zile, (treizeci de zile),
                            respectiv pana la data de 18.01.2026, şi ea va rămâne obligatorie pentru noi şi poate fi acceptată
                            oricând înainte de expirarea perioadei de valabilitate.
                        </p>

                        <p style={{ marginBottom: '12px', textAlign: 'justify' }}>
                            4. Pana la încheierea şi semnarea contractului de achiziţie publica aceasta oferta, împreună cu
                            comunicarea transmisă de dumneavoastră, prin care oferta noastră este stabilită căştigătoare, vor
                            constitui un contract angajant între noi.
                        </p>

                        <div style={{ marginBottom: '12px' }}>
                            <p style={{ marginBottom: '8px' }}>5. Precizam ca:</p>
                            <p style={{ marginLeft: '20px', marginBottom: '5px' }}>
                                │_│ depunem oferta alternativa, ale carei detalii sunt prezentate într-un formular de oferta separat, marcat în mod clar "alternativa";
                            </p>
                            <p style={{ marginLeft: '20px', marginBottom: '5px' }}>
                                │X│ nu depunem oferta alternativa.
                            </p>
                        </div>

                        <p style={{ marginBottom: '12px', textAlign: 'justify' }}>
                            6. Am înţeles şi consimtim ca, în cazul în care oferta noastră este stabilită ca fiind căştigătoare, sa
                            constituim garanţia de buna execuţie în conformitate cu prevederile din documentaţia de atribuire.
                        </p>

                        <p style={{ marginBottom: '20px', textAlign: 'justify' }}>
                            7. Intelegem ca nu sunteţi obligaţi sa acceptaţi oferta cu cel mai scăzut preţ sau orice alta oferta pe
                            care o puteti primi.
                        </p>

                        <div style={{ marginTop: '40px' }}>
                            <p style={{ marginBottom: '5px' }}><strong>Data</strong></p>
                            <p style={{ marginBottom: '20px' }}>18.12.2025</p>
                            <p style={{ textAlign: 'justify' }}>
                                <strong>STRAUT ANDREI</strong> , (semnatura), în calitate de <strong>ADMINISTRATOR</strong> legal autorizat sa semnez oferta
                                pentru şi în numele <strong>S.C. AS GREEN LAND S.R.L</strong>
                            </p>
                        </div>
                    </div>

                    {/* Render each offer using the actual OfferTemplate component */}
                    {offers.map((offer, index) => (
                        <div
                            key={index}
                            style={{
                                marginBottom: '40px',
                                marginLeft: 'auto',
                                marginRight: 'auto',
                            }}
                        >
                            <OfferTemplate
                                ref={(el) => {
                                    templateRefs.current[index] = el
                                }}
                                offerData={offer}
                                onGeneratePDF={() => { }}
                                hideGenerateButton={true}
                                hideAnnex={true}
                                hideAnnexInPDF={true}
                            />
                        </div>
                    ))}

                    {/* Custom Pages */}
                    {customPages.map((page) => (
                        <div
                            key={page.id}
                            className="relative"
                            style={{
                                width: '210mm',
                                minHeight: '297mm',
                                background: 'white',
                                marginLeft: 'auto',
                                marginRight: 'auto',
                                marginBottom: '40px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                        >
                            <button
                                onClick={() => removeCustomPage(page.id)}
                                className="absolute top-4 right-4 z-20 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                                title="Șterge Pagina"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateCustomPage(page.id, e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{ __html: page.content }}
                                style={{
                                    fontFamily: 'Arial, sans-serif',
                                    color: '#000',
                                    fontSize: '11pt',
                                    lineHeight: 1.6,
                                    padding: '20mm 15mm',
                                    minHeight: '297mm',
                                    outline: 'none',
                                }}
                                className="focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    ))}
                </div>
            </div>
        )
    }
)

ConsolidatedDocument.displayName = 'ConsolidatedDocument'
