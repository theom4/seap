import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { prepareElementForPDF } from './prepareForPDF'

/**
 * Creates the cover page HTML element
 */
function createCoverPageElement(): HTMLElement {
  const coverPage = document.createElement('div')
  coverPage.style.width = '210mm'
  coverPage.style.minHeight = '297mm'
  coverPage.style.padding = '25mm 20mm'
  coverPage.style.backgroundColor = '#ffffff'
  coverPage.style.color = '#000000'
  coverPage.style.fontFamily = 'Arial, sans-serif'
  coverPage.style.fontSize = '11pt'
  coverPage.style.lineHeight = '1.6'
  coverPage.style.position = 'absolute'
  coverPage.style.left = '-9999px'
  coverPage.style.top = '0'

  // HTML content for the page
  const pageContent = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 14pt; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase;">
        S.C. AS GREEN LAND S.R.L
      </h1>
      <p style="margin: 5px 0; font-size: 10pt;">
        Sediu social - Str.Lalelelor 12 Comuna Nuci Sat Merii Petchii, Ilfov,
      </p>
      <p style="margin: 5px 0; font-size: 10pt;">
        CUI: RO 46581890 Registrul Comertului: J2022005182231
      </p>
      <p style="margin: 5px 0; font-size: 10pt;">
        Trezorerie ILFOV Cont RO88TREZ4215069XXX022087
      </p>
      <p style="margin: 5px 0; font-size: 10pt;">
        Telefon: 0720.706.784 E-mail: asgreenland10@gmail.com
      </p>
      <p style="margin: 5px 0; font-size: 10pt;">
        Capital social: 200 RON
      </p>
    </div>

    <div style="text-align: center; margin: 40px 0 30px 0;">
      <h2 style="font-size: 16pt; font-weight: bold; margin: 0; text-transform: uppercase;">
        FORMULAR DE OFERTA
      </h2>
    </div>

    <div style="margin: 30px 0; text-align: left;">
      <p style="margin-bottom: 20px;">
        <strong>Către</strong>
      </p>
      <p style="margin-bottom: 20px;">
        <strong>Domnilor,</strong>
      </p>

      <p style="margin-bottom: 15px; text-align: justify;">
        <strong>1.</strong> Examinând documentaţia de atribuire, subsemnaţii, reprezentanţi ai ofertantului AS GREEN LAND SRL, ne oferim ca, în conformitate cu prevederile şi cerinţele cuprinse în documentaţia mai sus menţionată, sa furnizăm DIVERSE MATERIALE. pentru suma de prezenta in tabelul din anexa, platibila după recepţia produselor.
      </p>

      <p style="margin-bottom: 15px; text-align: justify;">
        <strong>2.</strong> Ne angajăm ca, în cazul în care oferta noastră este stabilită câştigătoare, sa furnizam produsele în termen de 5 zile de la comanda.
      </p>

      <p style="margin-bottom: 15px; text-align: justify;">
        <strong>3.</strong> Ne angajăm sa menţinem aceasta oferta valabilă pentru o durata de 30 zile, (treizeci de zile), respectiv pana la data de 18.01.2026, şi ea va rămâne obligatorie pentru noi şi poate fi acceptată oricând înainte de expirarea perioadei de valabilitate.
      </p>

      <p style="margin-bottom: 15px; text-align: justify;">
        <strong>4.</strong> Pana la încheierea şi semnarea contractului de achiziţie publica aceasta oferta, împreună cu comunicarea transmisă de dumneavoastră, prin care oferta noastră este stabilită câştigătoare, vor constitui un contract angajant între noi.
      </p>

      <p style="margin-bottom: 15px; text-align: justify;">
        <strong>5.</strong> Precizam ca:
      </p>
      <p style="margin-left: 20px; margin-bottom: 5px;">
        |_| depunem oferta alternativa, ale carei detalii sunt prezentate într-un formular de oferta separat, marcat în mod clar "alternativa";
      </p>
      <p style="margin-left: 20px; margin-bottom: 15px;">
        |X| nu depunem oferta alternativa.
      </p>

      <p style="margin-bottom: 15px; text-align: justify;">
        <strong>6.</strong> Am înţeles şi consimtim ca, în cazul în care oferta noastră este stabilită ca fiind câştigătoare, sa constituim garanţia de buna execuţie în conformitate cu prevederile din documentaţia de atribuire.
      </p>

      <p style="margin-bottom: 30px; text-align: justify;">
        <strong>7.</strong> Intelegem ca nu sunteţi obligaţi sa acceptaţi oferta cu cel mai scăzut preţ sau orice alta oferta pe care o puteti primi.
      </p>

      <p style="margin-bottom: 10px;">
        <strong>Data</strong>
      </p>
      <p style="margin-bottom: 30px;">
        18.12.2025
      </p>

      <p style="margin-bottom: 10px; text-align: justify;">
        <strong>STRAUT ANDREI</strong>, (semnatura), în calitate de <strong>ADMINISTRATOR</strong> legal autorizat sa semnez oferta pentru şi în numele <strong>S.C. AS GREEN LAND S.R.L</strong>
      </p>
    </div>
  `

  coverPage.innerHTML = pageContent
  return coverPage
}

/**
 * Creates the last page HTML element (Duplicate of cover page content as requested)
 */
function createLastPageElement(): HTMLElement {
  // We reuse the same structure as the cover page
  return createCoverPageElement()
}

/**
 * Helper to process an element into the PDF
 */
async function addElementToPDF(
  element: HTMLElement, 
  pdf: jsPDF, 
  pdfWidth: number, 
  pdfHeight: number
) {
  document.body.appendChild(element)
  
  try {
    // Wait for render
    await new Promise((resolve) => setTimeout(resolve, 100))

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      removeContainer: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const widthRatio = pdfWidth / imgWidth
    const scaledHeight = imgHeight * widthRatio

    if (scaledHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight)
    } else {
      // Logic for centering or scaling if too tall
      const heightRatio = pdfHeight / scaledHeight
      const finalScale = widthRatio * heightRatio
      const finalWidth = imgWidth * finalScale
      const finalHeight = imgHeight * finalScale
      const xOffset = (pdfWidth - finalWidth) / 2
      pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight)
    }
  } finally {
    document.body.removeChild(element)
  }
}

/**
 * Generates a PDF from an HTML element using html2canvas and jsPDF.
 * Structure: Cover Page -> Offer Content -> Last Page
 */
export async function generatePDFFromHTML(element: HTMLElement): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()

  // Step 1: Generate and add cover page
  const coverPage = createCoverPageElement()
  await addElementToPDF(coverPage, pdf, pdfWidth, pdfHeight)

  // Step 2: Add a new page and generate the offer content
  pdf.addPage()
  const restore = prepareElementForPDF(element)
  
  try {
    await new Promise((resolve) => setTimeout(resolve, 100))

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      removeContainer: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = canvas.width
    const imgHeight = canvas.height

    const widthRatio = pdfWidth / imgWidth
    const imgScaledHeight = imgHeight * widthRatio

    if (imgScaledHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgScaledHeight)
    } else {
      const heightRatio = pdfHeight / imgScaledHeight
      const finalScale = widthRatio * heightRatio
      const finalWidth = imgWidth * finalScale
      const finalHeight = imgHeight * finalScale
      const xOffset = (pdfWidth - finalWidth) / 2

      pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight)
    }
  } finally {
    restore()
  }

  // Step 3: Add the last page (same as cover page)
  pdf.addPage()
  const lastPage = createLastPageElement()
  await addElementToPDF(lastPage, pdf, pdfWidth, pdfHeight)

  return pdf.output('blob')
}