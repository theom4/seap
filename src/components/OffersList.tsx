import { useRef, useState, useMemo } from 'react'
import JSZip from 'jszip'
import { OfferTemplate, type OfferTemplateRef } from '../OfferTemplate'
import type { WebhookResponse } from '../types'
import { getAllOffers, getOfferKey } from '../utils/webhookUtils'
import { mergePDFs } from '../utils/pdfMerge'

interface OffersListProps {
  webhookResponse: WebhookResponse
  onClear: () => void
}

export function OffersList({ webhookResponse, onClear }: OffersListProps) {
  const offers = useMemo(() => getAllOffers(webhookResponse), [webhookResponse])
  const templateRefs = useRef<(OfferTemplateRef | null)[]>([])
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [activeOfferIndex, setActiveOfferIndex] = useState<number | null>(null)

  if (offers.length === 0) {
    return null
  }

  const handlePDFGenerated = (pdfBlob: Blob, offerTitle: string, offerIndex: number) => {
    // Include index in filename to ensure uniqueness when multiple offers have similar titles
    const safeTitle = offerTitle
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50)
    const filename = offers.length > 1
      ? `${safeTitle || 'offer'}_${offerIndex + 1}.pdf`
      : `${safeTitle || 'offer'}.pdf`

    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadAll = async () => {
    if (isDownloadingAll) return

    setIsDownloadingAll(true)
    try {
      const zip = new JSZip()
      const errors: string[] = []
      const pdfBlobs: Blob[] = []

      // Generate all PDFs sequentially and add them to ZIP
      for (let i = 0; i < templateRefs.current.length; i++) {
        const ref = templateRefs.current[i]
        if (ref) {
          try {
            const pdfBlob = await ref.generatePDF()
            pdfBlobs.push(pdfBlob)
            const offer = offers[i]
            const safeTitle = offer.offerConent.title
              .replace(/[^a-z0-9]/gi, '_')
              .toLowerCase()
              .substring(0, 50)
            const filename = offers.length > 1
              ? `${safeTitle || 'offer'}_${i + 1}.pdf`
              : `${safeTitle || 'offer'}.pdf`

            // Add PDF to ZIP
            zip.file(filename, pdfBlob)
          } catch (error) {
            const errorMsg = `Eroare la generarea PDF-ului pentru oferta ${i + 1}`
            console.error(errorMsg, error)
            errors.push(errorMsg)
          }
        }
      }

      // Check if we have any PDFs in the ZIP
      if (Object.keys(zip.files).length === 0) {
        alert('Nu s-au putut genera PDF-uri. Vă rugăm să încercați din nou.')
        return
      }

      // If multiple offers, also create and add merged PDF
      if (pdfBlobs.length > 1) {
        try {
          const mergedPdfBlob = await mergePDFs(pdfBlobs)
          zip.file('_TOATE_OFERTELE_UNITE.pdf', mergedPdfBlob)
        } catch (error) {
          console.error('Error merging PDFs:', error)
          errors.push('Eroare la unirea PDF-urilor')
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // Download ZIP file
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `oferte_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Show warning if there were errors
      if (errors.length > 0) {
        alert(`Au fost generate ${Object.keys(zip.files).length} PDF-uri cu succes. ${errors.length} PDF-uri au eșuat:\n${errors.join('\n')}`)
      }
    } catch (error) {
      console.error('Error creating ZIP file:', error)
      alert('A apărut o eroare la crearea fișierului ZIP. Vă rugăm să încercați din nou.')
    } finally {
      setIsDownloadingAll(false)
    }
  }

  return (
    <div className="relative">
      {/* Header and Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-main">
            Oferte Generate ({offers.length})
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Click pe "Deschide Editor" pentru a vizualiza și modifica o ofertă.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {offers.length > 1 && (
            <button
              onClick={handleDownloadAll}
              disabled={isDownloadingAll}
              className="px-4 py-2 bg-primary text-back rounded-lg hover:bg-primary-hover disabled:bg-gray-700 disabled:cursor-not-allowed text-sm font-bold transition-colors shadow-sm flex items-center space-x-2"
            >
              {isDownloadingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Se generează...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Descarcă Toate (.ZIP)</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={onClear}
            className="px-4 py-2 bg-surface text-text-muted border border-border rounded-lg hover:bg-surface-hover hover:text-red-400 text-sm font-medium transition-colors shadow-sm"
          >
            Șterge Tot
          </button>
        </div>
      </div>

      {/* Offers Summary List */}
      <div className="grid gap-4">
        {offers.map((offer, index) => (
          <div
            key={getOfferKey(offer, index)}
            className="bg-surface rounded-xl shadow-sm border border-border p-4 hover:bg-surface-hover/50 hover:border-primary/30 transition-all flex justify-between items-center"
          >
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-surface-hover text-primary rounded-full flex items-center justify-center font-bold text-lg border border-border">
                {index + 1}
              </div>
              <div>
                <h3 className="font-semibold text-text-main">
                  {offer.offerConent.title || `Ofertă #${index + 1}`}
                </h3>
                <p className="text-sm text-text-muted">
                  {offer.offerMetadata.companyName} • {new Date(offer.offerMetadata.offerDate).toLocaleDateString('ro-RO')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveOfferIndex(index)}
              className="px-4 py-2 bg-surface border border-border text-text-main rounded-lg hover:bg-surface-hover hover:border-primary hover:text-primary text-sm font-bold transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Deschide Editor</span>
            </button>
          </div>
        ))}
      </div>

      {/* Hidden/Modal Offer Templates */}
      {offers.map((offer, index) => {
        const isActive = activeOfferIndex === index

        // Base container styles
        const containerClasses = isActive
          ? "fixed inset-0 z-50 bg-black/60 flex justify-center overflow-y-auto py-8 backdrop-blur-sm"
          : "fixed top-0 left-[-9999px] h-0 w-[210mm] overflow-hidden" // Keep mounted but hidden

        return (
          <div
            key={`template-${getOfferKey(offer, index)}`}
            className={containerClasses}
            onClick={(e) => {
              // Close if clicking the backdrop (only when active)
              if (isActive && e.target === e.currentTarget) {
                setActiveOfferIndex(null)
              }
            }}
          >
            <div className={isActive ? "relative w-auto mx-auto my-auto animate-in fade-in slide-in-from-bottom-4 duration-300" : ""}>
              {isActive && (
                <button
                  onClick={() => setActiveOfferIndex(null)}
                  className="absolute top-2 right-[-3rem] p-2 bg-surface text-text-main rounded-full hover:bg-surface-hover hover:text-primary shadow-lg transition-colors z-[60] border border-border"
                  title="Închide Editor"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              <OfferTemplate
                ref={(el) => {
                  templateRefs.current[index] = el
                }}
                offerData={offer}
                onGeneratePDF={(pdfBlob) =>
                  handlePDFGenerated(pdfBlob, offer.offerConent.title, index)
                }
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
