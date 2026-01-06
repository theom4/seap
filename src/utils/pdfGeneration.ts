/**
 * Downloads a PDF blob as a file with a safe filename derived from the offer title.
 */
export function downloadPDF(pdfBlob: Blob, offerTitle: string): void {
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url

  // Create a safe filename from the offer title
  const safeTitle = (offerTitle || 'offer')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50)

  link.download = `${safeTitle || 'offer'}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}










