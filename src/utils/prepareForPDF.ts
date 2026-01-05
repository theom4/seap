/**
 * Prepares HTML element for PDF generation by:
 * - Converting inputs to text spans
 * - Converting textareas to divs with proper text wrapping
 * - Hiding interactive elements (buttons, upload controls)
 * - Removing borders/outlines
 */
export function prepareElementForPDF(element: HTMLElement): () => void {
  const originalStyles: Map<HTMLElement, string> = new Map()
  const elementsToHide: HTMLElement[] = []
  const inputReplacements: Array<{ input: HTMLElement; replacement: HTMLElement }> = []
  const textareaReplacements: Array<{ textarea: HTMLElement; replacement: HTMLElement }> = []

  // Hide interactive elements
  const hideSelectors = [
    'button',
    '.image-upload-input',
    '.image-upload-label',
    '.remove-image-button',
    '.offer-template-actions',
    '.editable-date-input',
  ]

  hideSelectors.forEach((selector) => {
    const elements = element.querySelectorAll<HTMLElement>(selector)
    elements.forEach((el) => {
      const originalDisplay = el.style.display
      originalStyles.set(el, originalDisplay)
      el.style.display = 'none'
      elementsToHide.push(el)
    })
  })

  // Convert text inputs to spans
  const textInputs = element.querySelectorAll<HTMLInputElement>('input[type="text"]')
  textInputs.forEach((input) => {
    const span = document.createElement('span')
    span.textContent = input.value || input.placeholder || ''
    span.className = input.className.replace('editable-text-input', 'pdf-text-display')
    span.style.display = 'inline-block'
    span.style.padding = '0'
    span.style.border = 'none'
    span.style.background = 'transparent'
    span.style.fontSize = 'inherit'
    span.style.fontFamily = 'inherit'
    span.style.color = 'inherit'
    
    // Copy computed styles for font
    const computedStyle = window.getComputedStyle(input)
    span.style.fontSize = computedStyle.fontSize
    span.style.fontWeight = computedStyle.fontWeight
    span.style.fontFamily = computedStyle.fontFamily
    
    input.parentNode?.insertBefore(span, input)
    input.style.display = 'none'
    inputReplacements.push({ input, replacement: span })
  })

  // Convert date inputs - show formatted date
  const dateInputs = element.querySelectorAll<HTMLInputElement>('input[type="date"]')
  dateInputs.forEach((input) => {
    // Find the formatted date display span (it's the next sibling)
    let sibling = input.nextElementSibling
    while (sibling) {
      if (sibling.classList && sibling.classList.contains('formatted-date-display')) {
        const formattedSpan = sibling as HTMLElement
        formattedSpan.style.display = 'inline-block'
        formattedSpan.style.marginLeft = '0.5rem'
        break
      }
      sibling = sibling.nextElementSibling
    }
    input.style.display = 'none'
  })

  // Convert textareas to divs with proper text wrapping
  const textareas = element.querySelectorAll<HTMLTextAreaElement>('textarea')
  textareas.forEach((textarea) => {
    const div = document.createElement('div')
    div.textContent = textarea.value
    div.className = textarea.className.replace('editable-textarea', 'pdf-text-display')
    div.style.width = '100%'
    div.style.padding = '0'
    div.style.border = 'none'
    div.style.background = 'transparent'
    div.style.fontSize = 'inherit'
    div.style.fontFamily = 'inherit'
    div.style.color = 'inherit'
    div.style.lineHeight = 'inherit'
    div.style.textAlign = 'justify'
    div.style.whiteSpace = 'pre-wrap'
    div.style.wordWrap = 'break-word'
    div.style.overflow = 'visible'
    div.style.minHeight = 'auto'
    div.style.height = 'auto'
    
    // Copy computed styles
    const computedStyle = window.getComputedStyle(textarea)
    div.style.fontSize = computedStyle.fontSize
    div.style.fontWeight = computedStyle.fontWeight
    div.style.fontFamily = computedStyle.fontFamily
    div.style.lineHeight = computedStyle.lineHeight
    
    textarea.parentNode?.insertBefore(div, textarea)
    textarea.style.display = 'none'
    textareaReplacements.push({ textarea, replacement: div })
  })

  // Remove borders from price input
  const priceInputs = element.querySelectorAll<HTMLInputElement>('.editable-price-input')
  priceInputs.forEach((input) => {
    const originalBorder = input.style.border
    const originalBackground = input.style.background
    originalStyles.set(input, `border:${originalBorder};background:${originalBackground}`)
    input.style.border = 'none'
    input.style.background = 'transparent'
    input.style.outline = 'none'
    input.style.boxShadow = 'none'
  })

  // Remove borders from table inputs
  const tableInputs = element.querySelectorAll<HTMLInputElement>('.editable-table-input')
  tableInputs.forEach((input) => {
    const originalBorder = input.style.border
    const originalBackground = input.style.background
    originalStyles.set(input, `border:${originalBorder};background:${originalBackground}`)
    input.style.border = 'none'
    input.style.background = 'transparent'
    input.style.outline = 'none'
    input.style.boxShadow = 'none'
  })

  // Restore function
  return () => {
    // Restore hidden elements
    elementsToHide.forEach((el) => {
      const originalDisplay = originalStyles.get(el)
      if (originalDisplay !== undefined) {
        el.style.display = originalDisplay || ''
      } else {
        el.style.display = ''
      }
    })

    // Restore input styles
    originalStyles.forEach((original, el) => {
      if (!elementsToHide.includes(el)) {
        if (original) {
          const [border, background] = original.split(';')
          if (border) el.style.border = border.split(':')[1] || ''
          if (background) el.style.background = background.split(':')[1] || ''
        } else {
          el.style.border = ''
          el.style.background = ''
          el.style.outline = ''
          el.style.boxShadow = ''
        }
      }
    })

    // Remove replacements and restore inputs
    inputReplacements.forEach(({ input, replacement }) => {
      replacement.remove()
      input.style.display = ''
    })

    // Remove replacements and restore textareas
    textareaReplacements.forEach(({ textarea, replacement }) => {
      replacement.remove()
      textarea.style.display = ''
    })

    // Restore date inputs
    dateInputs.forEach((input) => {
      input.style.display = ''
      const formattedSpan = input.nextElementSibling as HTMLElement
      if (formattedSpan && formattedSpan.classList.contains('formatted-date-display')) {
        formattedSpan.style.display = ''
      }
    })
  }
}









