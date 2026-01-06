import { jsPDF } from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function mergePDFs(pdfBlobs: Blob[]): Promise<Blob> {
  const mergedPdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let isFirstPage = true

  for (const blob of pdfBlobs) {
    const arrayBuffer = await blob.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.0 })

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) continue

      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise

      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      if (!isFirstPage) {
        mergedPdf.addPage()
      }
      isFirstPage = false

      const pdfWidth = mergedPdf.internal.pageSize.getWidth()
      const pdfHeight = mergedPdf.internal.pageSize.getHeight()

      mergedPdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
    }
  }

  return mergedPdf.output('blob')
}
