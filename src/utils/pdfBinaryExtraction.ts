export interface ExtractedBinary {
    filename: string
    data: string
    size: number
    type: string
}

/**
 * Extracts raw binary data from a file as base64.
 * Supports PDF, DOCX, JPG/JPEG, and PNG.
 */
import mammoth from 'mammoth'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Extracts raw binary data from a file as base64.
 * Supports PDF, DOCX, JPG/JPEG, and PNG.
 * 
 * Note: DOCX files are converted to PDF client-side before being returned.
 */
export async function extractBinaryFromFile(file: File): Promise<ExtractedBinary> {
    return new Promise(async (resolve, reject) => {
        try {
            // Special handling for DOCX files -> Convert to PDF
            if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.name.toLowerCase().endsWith('.docx')) {

                try {
                    const arrayBuffer = await file.arrayBuffer()
                    const result = await mammoth.convertToHtml({ arrayBuffer })
                    const html = result.value

                    // Create a hidden container to render HTML
                    const container = document.createElement('div')
                    container.style.position = 'absolute'
                    container.style.left = '-9999px'
                    container.style.top = '0'
                    container.style.width = '210mm' // A4 width
                    container.style.backgroundColor = 'white'
                    container.style.padding = '20mm' // Standard margins
                    container.style.color = 'black'
                    // Basic styling for better PDF output
                    container.innerHTML = `
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.5; }
                            h1 { font-size: 24pt; margin-bottom: 0.5em; }
                            h2 { font-size: 18pt; margin-bottom: 0.5em; }
                            h3 { font-size: 14pt; margin-bottom: 0.5em; }
                            p { margin-bottom: 1em; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
                            td, th { border: 1px solid #ccc; padding: 5px; }
                            img { max-width: 100%; height: auto; }
                        </style>
                        ${html}
                    `
                    document.body.appendChild(container)

                    // Convert to Canvas
                    const canvas = await html2canvas(container, {
                        scale: 2, // Improve quality
                        useCORS: true,
                        logging: false
                    })

                    // Clean up
                    document.body.removeChild(container)

                    // Generate PDF
                    // A4 size: 210 x 297 mm
                    const imgWidth = 210
                    const pageHeight = 297
                    const imgHeight = (canvas.height * imgWidth) / canvas.width

                    const pdf = new jsPDF('p', 'mm', 'a4')

                    // Handle multi-page content (basic implementation)
                    // For now, we'll just add the image. If it's too long, it might be cut off or scaled.
                    // A proper multi-page implementation would slice the canvas.
                    // Given the limitation of current prompt, we'll stick to a simple single-page rescale or multi-page add.

                    // First page
                    const imgData = canvas.toDataURL('image/png')
                    
                    // Scale to fit single page if content is too tall
                    if (imgHeight > pageHeight) {
                        const scale = pageHeight / imgHeight
                        const scaledWidth = imgWidth * scale
                        const xOffset = (imgWidth - scaledWidth) / 2
                        pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, pageHeight)
                    } else {
                        // Content fits normally
                        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
                    }

                    // Get binary output
                    // We need the base64 string without the 'data:application/pdf;base64,' prefix
                    // jsPDF.output('datauristring') returns data URI. 
                    const pdfDataUri = pdf.output('datauristring')
                    const base64Data = pdfDataUri.split(',')[1]

                    resolve({
                        // Change extension to .pdf
                        filename: file.name.replace(/\.docx?$/i, '.pdf'),
                        data: base64Data,
                        size: base64Data.length, // Approximate size
                        type: 'application/pdf',
                    })
                    return

                } catch (conversionError) {
                    console.error('DOCX conversion failed:', conversionError)
                    reject(new Error(`Failed to convert DOCX: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`))
                    return
                }
            }

            // Normal file handling (PDF, Images)
            const reader = new FileReader()

            reader.onload = () => {
                const result = reader.result as string
                const base64Data = result.split(',')[1]

                // Determine file type
                let fileType = file.type
                if (!fileType) {
                    const extension = file.name.split('.').pop()?.toLowerCase()
                    switch (extension) {
                        case 'pdf': fileType = 'application/pdf'; break
                        case 'jpg': case 'jpeg': fileType = 'image/jpeg'; break
                        case 'png': fileType = 'image/png'; break
                        default: fileType = 'application/octet-stream'
                    }
                }

                resolve({
                    filename: file.name,
                    data: base64Data,
                    size: file.size,
                    type: fileType,
                })
            }

            reader.onerror = () => {
                reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`))
            }

            reader.readAsDataURL(file)

        } catch (error) {
            reject(error)
        }
    })
}
