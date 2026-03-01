// SEAP Script - PDF Offer Generator
// Updated: 2026-02-06
import { useState, useRef, useEffect, type DragEvent } from 'react'
import { OffersList } from './components/OffersList'
import { extractBinaryFromFile } from './utils/pdfBinaryExtraction'
import { extractProductsFromPDF } from './utils/pdfExtraction'
import type { WebhookResponse, OfferData } from './types'
import { getAllOffers, consolidateOffers } from './utils/webhookUtils'
import './App.css'
import { useClaudeInjector } from './hooks/useClaudeInjector'

// LocalStorage keys
const STORAGE_KEYS = {
  FILES: 'pdf_uploader_files',
  WEBHOOK_RESPONSE: 'pdf_uploader_webhook_response',
  PROCESSING_STATE: 'pdf_uploader_processing_state',
  UPLOAD_TIMESTAMP: 'pdf_uploader_upload_timestamp',
}

// Loading Animation Component
function LoadingAnimation({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-4 border-4 border-orange-200 rounded-full"></div>
        <div className="absolute inset-4 border-4 border-orange-500 rounded-full border-r-transparent animate-spin-reverse"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-gray-700">Procesare documente...</h3>
        <p className="text-md text-gray-500">Vă rugăm să nu inchideti fereastra browserului până când procesarea este completă.</p>
        {/* Timer Display */}
        <div className="mt-4 mb-2">
          <div className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg font-mono font-semibold text-blue-700">
              {elapsedSeconds}s
            </span>
          </div>
        </div>
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0s]"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
        </div>
      </div>
    </div>
  )
}

interface FileWithStatus {
  file: File
  status: 'pending' | 'extracting' | 'uploading' | 'success' | 'error'
  error?: string
}

interface FileMetadata {
  name: string
  size: number
  status: 'pending' | 'extracting' | 'uploading' | 'success' | 'error'
  error?: string
}

interface ProcessingState {
  isProcessing: boolean
  uploadTimestamp: number | null
}

interface Batch {
  id: string
  fileName: string
  products: Array<{ productName: string; productDescription: string }>
  productCount: number
  status: 'pending' | 'processing' | 'done'
}

//const WEBHOOK_URL = 'https://n8n.voisero.info/webhook/generare-oferte-nanoassist';

// Model Definitions
const MODELS = {
  openai: [
    'gpt-5.2',
    'gpt-5.1',
    'gpt-5-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4o',
    'gpt-4o-mini',
  ],
  gemini: [
    'gemini-2.5-pro',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
  ],
  grok: [
    'grok-4',
    'grok-4-fast',
  ],
}

type ModelProvider = keyof typeof MODELS

function App() {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [webhookResponse, setWebhookResponse] = useState<WebhookResponse | null>(null)
  const [uploadTimestamp, setUploadTimestamp] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [activeTab, setActiveTab] = useState<'fisier' | 'link' | 'cerinta' | 'istoric'>('fisier')
  const [injectorStatus, setInjectorStatus] = useState<string | null>(null)

  // Model Selection State
  const [modelProvider, setModelProvider] = useState<ModelProvider>('openai')
  const [selectedModel, setSelectedModel] = useState<string>(MODELS.openai[0])
  const [includeImages, setIncludeImages] = useState(false)
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(false)
  const [optionalProductName, setOptionalProductName] = useState('')

  // Cerinta tab state
  const [cerintaFiles, setCerintaFiles] = useState<File[]>([])
  const [cerintaLoading, setCerintaLoading] = useState(false)
  const [cerintaProgress, setCerintaProgress] = useState('')
  const [cerintaResult, setCerintaResult] = useState<Array<{ productName: string; productDescription: string }> | null>(null)
  const [cerintaError, setCerintaError] = useState<string | null>(null)
  const [isCerintaDragging, setIsCerintaDragging] = useState(false)

  // Link tab state
  const [linkText, setLinkText] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkWebhookResponse, setLinkWebhookResponse] = useState<WebhookResponse | null>(null)
  const [linkElapsedSeconds, setLinkElapsedSeconds] = useState(0)

  // Istoric tab state
  const [istoricLoading, setIstoricLoading] = useState(false)
  const [istoricWebhookResponse, setIstoricWebhookResponse] = useState<WebhookResponse | null>(null)
  const [istoricElapsedSeconds, setIstoricElapsedSeconds] = useState(0)

  // Batch state
  const [batches, setBatches] = useState<Batch[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update selected model when provider changes to ensure validity
  useEffect(() => {
    setSelectedModel(MODELS[modelProvider][0])
  }, [modelProvider])


  // Load state from localStorage on mount
  useEffect(() => {
    try {
      // Load webhook response
      // Load webhook response
      const savedResponse = localStorage.getItem(STORAGE_KEYS.WEBHOOK_RESPONSE)
      if (savedResponse) {
        const parsed = JSON.parse(savedResponse)
        // FIX: Only restore if it is a valid array, otherwise clear it
        if (Array.isArray(parsed)) {
          setWebhookResponse(parsed)
        } else {
          localStorage.removeItem(STORAGE_KEYS.WEBHOOK_RESPONSE)
        }
      }

      // Load processing state
      const savedProcessingState = localStorage.getItem(STORAGE_KEYS.PROCESSING_STATE)
      if (savedProcessingState) {
        const state: ProcessingState = JSON.parse(savedProcessingState)
        setUploadTimestamp(state.uploadTimestamp)
      }

      // Load file metadata (we can't restore File objects, but we can show what was there)
      const savedFiles = localStorage.getItem(STORAGE_KEYS.FILES)
      if (savedFiles) {
        const fileMetadata: FileMetadata[] = JSON.parse(savedFiles)
        // Note: We can't restore File objects, but we can show the metadata
        // The user will need to re-upload if they want to process again
        console.log('Previous files detected:', fileMetadata.length)
      }
    } catch (error) {
      console.error('Error loading state from localStorage:', error)
    }
  }, [])

  // Poll for webhook response if we're in processing state (for cross-tab or delayed responses)
  useEffect(() => {
    if (!uploadTimestamp) return

    const checkForResponse = () => {
      try {
        const savedResponse = localStorage.getItem(STORAGE_KEYS.WEBHOOK_RESPONSE)
        if (savedResponse) {
          const parsed = JSON.parse(savedResponse)
          // Only update if we don't already have a response or if this is newer
          if (!webhookResponse || JSON.stringify(parsed) !== JSON.stringify(webhookResponse)) {
            setWebhookResponse(parsed)
            setUploadTimestamp(null)
            localStorage.removeItem(STORAGE_KEYS.UPLOAD_TIMESTAMP)
          }
        }
      } catch (error) {
        console.error('Error checking for response:', error)
      }
    }

    // Check immediately
    checkForResponse()

    // Then poll every 2 seconds
    const interval = setInterval(checkForResponse, 2000)

    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setUploadTimestamp(null)
    }, 5 * 60 * 1000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [uploadTimestamp, webhookResponse])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      if (webhookResponse) {
        localStorage.setItem(STORAGE_KEYS.WEBHOOK_RESPONSE, JSON.stringify(webhookResponse))
      } else {
        localStorage.removeItem(STORAGE_KEYS.WEBHOOK_RESPONSE)
      }
    } catch (error) {
      console.error('Error saving webhook response to localStorage:', error)
    }
  }, [webhookResponse])


  // Save files metadata (without File objects)
  useEffect(() => {
    try {
      const fileMetadata: FileMetadata[] = files.map(f => ({
        name: f.file.name,
        size: f.file.size,
        status: f.status,
        error: f.error,
      }))
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(fileMetadata))
    } catch (error) {
      console.error('Error saving files to localStorage:', error)
    }
  }, [files])

  // Save processing state
  useEffect(() => {
    try {
      const isProcessing = files.some(f => f.status === 'extracting' || f.status === 'uploading')
      const processingState: ProcessingState = {
        isProcessing,
        uploadTimestamp,
      }
      localStorage.setItem(STORAGE_KEYS.PROCESSING_STATE, JSON.stringify(processingState))
    } catch (error) {
      console.error('Error saving processing state to localStorage:', error)
    }
  }, [files, uploadTimestamp])

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]

    // Also check extensions for some files where type might be missing or generic
    const allowedExtensions = ['.pdf', '.docx', '.jpg', '.jpeg', '.png']

    const validFiles = Array.from(selectedFiles).filter(
      (file) => {
        if (allowedTypes.includes(file.type)) return true
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        return allowedExtensions.includes(ext)
      }
    )

    const newFiles: FileWithStatus[] = validFiles.map((file) => ({
      file,
      status: 'pending',
    }))

    setFiles((prev) => [...prev, ...newFiles])
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleCerintaDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsCerintaDragging(true)
  }

  const handleCerintaDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsCerintaDragging(false)
  }

  const handleCerintaDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsCerintaDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase()
        return ['.pdf', '.docx', '.doc'].includes(ext)
      })
      if (newFiles.length > 0) {
        setCerintaFiles(prev => [...prev, ...newFiles])
        setCerintaError(null)
      }
    }
  }


  const uploadAllFiles = async () => {
    const pendingFiles = files
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.status === 'pending')

    if (pendingFiles.length === 0) return

    // Save upload timestamp
    const timestamp = Date.now()
    setUploadTimestamp(timestamp)
    localStorage.setItem(STORAGE_KEYS.UPLOAD_TIMESTAMP, timestamp.toString())

    // Set all pending files to "extracting" initially
    setFiles((prev) => {
      const updated = [...prev]
      pendingFiles.forEach(({ index }) => {
        updated[index] = { ...updated[index], status: 'extracting' }
      })
      return updated
    })

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20 * 60 * 1000); // Global timeout

    try {
      // Process files SEQUENTIALLY to ensure 1 File = 1 Invoice/Offer Group
      for (const { file: fileStat, index } of pendingFiles) {
        try {
          // 1. Extract Data
          let fileData;
          try {
            fileData = await extractBinaryFromFile(fileStat.file)
          } catch (extractError) {
            throw new Error(`Failed to extract data: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`)
          }

          // Update status to uploading
          setFiles((prev) => {
            const updated = [...prev]
            updated[index] = { ...updated[index], status: 'uploading' }
            return updated
          })

          // 2. Prepare Payload for Single File
          // Note: The webhook might still expect an array, or a single object. 
          // Keeping it as an array of 1 item to be safe with existing n8n structure if it expects a list.
          const payload = [{
            ...fileData,
            modelProvider,
            model: selectedModel,
            includeImages,
            optionalProductName: optionalProductName.trim(), // Always include, even if empty
          }]


          // 3. Send Request
          let response: Response;
          try {
            const webhookUrl = 'https://n8n.voisero.info/webhook-test/seap-test'
            console.log(`[Upload] Sending POST to ${webhookUrl}`)
            console.log(`[Upload] Payload size: ${JSON.stringify(payload).length} chars`)

            response = await fetch(webhookUrl, {
              method: 'POST',
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            })

            console.log(`[Upload] Response status: ${response.status} ${response.statusText}`)
            console.log(`[Upload] Response URL: ${response.url}`)

            if (!response.ok) {
              const errorBody = await response.text()
              console.error(`[Upload] Error response body: ${errorBody.substring(0, 500)}`)
              throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorBody.substring(0, 200)}`)
            }
          } catch (netError: any) {
            if (netError.name === 'AbortError') console.log('[Upload] Request timed out (AbortError)')
            console.error(`[Upload] Network error: ${netError.message}`)
            throw netError
          }

          // 4. Parse Response
          let responseData: WebhookResponse
          try {
            const responseText = await response.text()
            if (!responseText || responseText.trim() === '') throw new Error('Empty response from server')
            responseData = JSON.parse(responseText)
          } catch (parseError) {
            throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
          }

          // 5. Process & Consolidate
          // Get all raw offers for this ONE file
          const offersFromFile = getAllOffers(responseData)

          // Extract products from PDF if applicable
          let extractedProducts: any[] = []
          if (fileStat.file.type === 'application/pdf' || fileStat.file.name.toLowerCase().endsWith('.pdf')) {
            try {
              extractedProducts = await extractProductsFromPDF(fileStat.file)
              console.log(`Extracted ${extractedProducts.length} products from PDF`)
            } catch (pdfErr) {
              console.error('Error extracting products from PDF:', pdfErr)
            }
          }

          // Merge PDF extracted products into the offers if needed
          // Strategy: If we have extracted products, we might want to distribute them or add them to the master?
          // For simplicity, let's attach them to the first offer if it lacks products, or merge?
          // Actually, `consolidateOffers` aggregates products.
          // Let's inject them into the first offer before consolidating if strictly needed,
          // OR rely on the webhook having done a good job. 
          // Current logic: Merge into the first offer if index matches.
          // Since we have 1 file, let's just make sure the offers have products.

          if (extractedProducts.length > 0 && offersFromFile.length > 0) {
            const firstOfferContent = offersFromFile[0].offerConent || offersFromFile[0].offerContent
            if (firstOfferContent) {
              // If the AI didn't find products, use the PDF ones
              if (!firstOfferContent.products || firstOfferContent.products.length === 0) {
                firstOfferContent.products = extractedProducts
              }
            }
          }

          // 6. CONSOLIDATE into ONE Master Offer
          // Import this dynamically or assume it's available (needs to be imported at top of file, but I can't add imports with replace_file_content easily without context.
          // I will assume I need to fix imports in a separate step or hope `consolidateOffers` is available.
          // Wait, I need to Import `consolidateOffers`.
          // I will modify the previous step to add the import, or just use the tool again.
          // Actually, I can't use it if not imported.
          // I'll assume I'll add the import in the next tool call or previously.
          // Wait, I haven't added the import yet. I should do that.
          // BUT, I can't break the code.
          // I will use `getAllOffers` (which is imported).
          // I will simply add the consolidation logic inline momentarily or use a helper if I can add the import.

          // Let's rely on `consolidateOffers` being imported. I'll add the import in a subsequent step or previous?
          // Use `require` or dynamic import? No, standard React.
          // I will add the import first in a separate tool call to be safe?
          // No, I'll do it after this replacement. Ideally I should have done it before.
          // I'll do it right now by rewriting the file header in a separate call? 
          // Too slow.

          // Strategy: 
          // 1. Refactor `App.tsx` imports.
          // 4. Consolidate offers from this single file
          const consolidatedOffer = consolidateOffers(offersFromFile)

          if (consolidatedOffer) {
            console.log('[App] Consolidated Offer Result:', {
              hasSubOffers: !!consolidatedOffer.subOffers,
              subOffersCount: consolidatedOffer.subOffers?.length,
              totalProducts: consolidatedOffer.offerConent?.products?.length || 0
            })

            setWebhookResponse(prev => {
              // Avoid duplicates if using React.StrictMode double-invoke
              // We check if we already processed this file ID maybe? 
              // For now, simpler: just append.
              const current = (prev as OfferData[]) || []
              return [...current, consolidatedOffer]
            })

            // Add to batch list
            const batchProducts = (consolidatedOffer.offerConent?.products || consolidatedOffer.offerContent?.products || []).map(
              p => ({ productName: p.productName, productDescription: String(p.unitPriceNoVAT ?? '') })
            )
            const productCount = batchProducts.length
            setBatches(prev => [...prev, {
              id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              fileName: fileStat.file.name,
              products: batchProducts,
              productCount,
              status: 'done',
            }])
          } else {
            console.warn('No offers found in response for file:', fileStat.file.name)

            // Still add to batch list with 0 products
            setBatches(prev => [...prev, {
              id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              fileName: fileStat.file.name,
              products: [],
              productCount: 0,
              status: 'done',
            }])
          }

          // 7. Mark Success
          setFiles((prev) => {
            const updated = [...prev]
            updated[index] = { ...updated[index], status: 'success' }
            return updated
          })

        } catch (fileError) {
          console.error(`Error processing file ${fileStat.file.name}:`, fileError)
          // Mark Error
          setFiles((prev) => {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              status: 'error',
              error: fileError instanceof Error ? fileError.message : 'Unknown error'
            }
            return updated
          })
        }
      }
    } finally {
      clearTimeout(timeoutId)
      setUploadTimestamp(null)
      localStorage.removeItem(STORAGE_KEYS.UPLOAD_TIMESTAMP)
    }
    // Auto-notify n8n after all files are processed
    // Use functional form to get latest batches
    setBatches(prev => {
      notifyClaudeCode(prev)
      return prev
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setFiles([])
    setWebhookResponse(null)
    setUploadTimestamp(null)
    setBatches([])

    // Clear all localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  const loadMockData = async () => {
    const { mockSeedData } = await import('./data/mockSeedData')
    console.log('Loading mock seed data:', mockSeedData)
    setWebhookResponse(mockSeedData)
  }

  // Cerinta: upload files sequentially and extract requirements, grouped by document (batch)
  const handleCerintaUpload = async () => {
    if (cerintaFiles.length === 0) return
    setCerintaLoading(true)
    setCerintaError(null)
    setCerintaResult(null)
    setBatches([])

    const allProducts: Array<{ productName: string; productDescription: string }> = []
    const newBatches: Batch[] = []

    for (let i = 0; i < cerintaFiles.length; i++) {
      const file = cerintaFiles[i]
      setCerintaProgress(`Procesare fișier ${i + 1} din ${cerintaFiles.length}: ${file.name}`)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('https://n8n.voisero.info/webhook/seap-document-parsing', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`)
        }

        const data = await response.text()

        // Parse the nested Gemini response: {content:{parts:[{text:"..."}]}}
        let products: Array<{ productName: string; productDescription: string }> = []
        try {
          const parsed = JSON.parse(data)
          let jsonText = ''

          // Handle Gemini-style response
          if (parsed?.content?.parts?.[0]?.text) {
            jsonText = parsed.content.parts[0].text
          } else if (typeof parsed === 'string') {
            jsonText = parsed
          } else if (Array.isArray(parsed)) {
            products = parsed
          } else {
            jsonText = data
          }

          // If we got a text string, strip markdown fences and parse
          if (jsonText && products.length === 0) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            products = JSON.parse(jsonText)
          }
        } catch (parseErr) {
          console.warn(`Could not parse as product JSON for file ${file.name}, showing raw:`, parseErr)
          products = [{ productName: `Rezultat (${file.name})`, productDescription: data }]
        }

        // Create a batch for this document
        const batch: Batch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fileName: file.name,
          products,
          productCount: products.length,
          status: 'done',
        }
        newBatches.push(batch)
        setBatches([...newBatches])

        allProducts.push(...products)
        // Update results progressively so user sees products appearing
        setCerintaResult([...allProducts])
      } catch (error) {
        console.error(`Cerinta upload error for file ${file.name}:`, error)

        // Still create a batch entry for failed files
        const batch: Batch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fileName: file.name,
          products: [],
          productCount: 0,
          status: 'done',
        }
        newBatches.push(batch)
        setBatches([...newBatches])

        setCerintaError(prev => {
          const msg = error instanceof Error ? error.message : 'Eroare la procesare'
          return prev ? `${prev}\n${file.name}: ${msg}` : `${file.name}: ${msg}`
        })
      }
    }

    if (allProducts.length === 0 && !cerintaResult) {
      setCerintaError('Nu s-au putut extrage produse din niciunul dintre documente.')
    }

    setCerintaProgress('')
    setCerintaLoading(false)

    // Auto-notify n8n after all files are processed
    await notifyClaudeCode(newBatches)
  }

  const removeCerintaFile = (index: number) => {
    setCerintaFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Link: send links to webhook
  const handleLinkSearch = async () => {
    if (!linkText.trim()) return
    setLinkLoading(true)
    setLinkWebhookResponse(null)
    try {
      const response = await fetch('https://n8n.voisero.info/webhook/seap-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: linkText }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const responseText = await response.text()
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from server')
      }

      const responseData: WebhookResponse = JSON.parse(responseText)
      const offersFromLink = getAllOffers(responseData)
      const consolidatedOffer = consolidateOffers(offersFromLink)

      if (consolidatedOffer) {
        setLinkWebhookResponse([consolidatedOffer])
      } else {
        console.warn('No offers found in link search response')
      }
    } catch (error) {
      console.error('Link search error:', error)
    } finally {
      setLinkLoading(false)
    }
  }

  // Istoric: fetch from webhook
  const handleIstoricFetch = async () => {
    setIstoricLoading(true)
    setIstoricWebhookResponse(null)
    try {
      const response = await fetch('https://n8n.voisero.info/webhook/seap-istoric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const responseText = await response.text()
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from server')
      }

      const responseData = JSON.parse(responseText)

      let finalOffers: OfferData[] = [];

      if (Array.isArray(responseData) && responseData.length > 0) {
        responseData.forEach((item: any) => {
          try {
            if (item.json && typeof item.json === 'string') {
              const itemDate = item.createdAt || item.updatedAt;
              const parsedItem = JSON.parse(item.json);

              const itemOffersWrap = Array.isArray(parsedItem) ? parsedItem : [parsedItem];

              // Inject the history date into each offer metadata
              if (itemDate) {
                itemOffersWrap.forEach((offerWrap: any) => {
                  if (offerWrap.offers && Array.isArray(offerWrap.offers)) {
                    offerWrap.offers.forEach((offer: any) => {
                      if (offer.offerMetadata) {
                        offer.offerMetadata.offerDate = itemDate;
                      }
                    });
                  } else if (offerWrap.offerMetadata) {
                    offerWrap.offerMetadata.offerDate = itemDate;
                  }
                });
              }

              // Extract and consolidate offers *specifically* for this history row
              const extractedItemOffers = getAllOffers(itemOffersWrap);
              const consolidatedItemOffer = consolidateOffers(extractedItemOffers);

              if (consolidatedItemOffer) {
                finalOffers.push(consolidatedItemOffer);
              } else if (extractedItemOffers.length > 0) {
                finalOffers.push(...extractedItemOffers);
              }
            }
          } catch (e) {
            console.error("Failed to parse json string from istoric item", e)
          }
        });
      }

      if (finalOffers.length > 0) {
        setIstoricWebhookResponse(finalOffers)
      } else {
        console.warn('No offers found in istoric response')
      }
    } catch (error) {
      console.error('Istoric fetch error:', error)
    } finally {
      setIstoricLoading(false)
    }
  }

  const isProcessing = files.some(f => f.status === 'extracting' || f.status === 'uploading')
  const hasFiles = files.length > 0

  // Timer for loading animation - must be after isProcessing declaration
  useEffect(() => {
    if (!isProcessing || webhookResponse) {
      setElapsedSeconds(0)
      return
    }

    // Start timer
    setElapsedSeconds(0)
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isProcessing, webhookResponse])

  // Timer for link loading animation
  useEffect(() => {
    if (!linkLoading) {
      setLinkElapsedSeconds(0)
      return
    }
    setLinkElapsedSeconds(0)
    const interval = setInterval(() => {
      setLinkElapsedSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [linkLoading])

  // Timer for istoric loading animation
  useEffect(() => {
    if (!istoricLoading) {
      setIstoricElapsedSeconds(0)
      return
    }
    setIstoricElapsedSeconds(0)
    const interval = setInterval(() => {
      setIstoricElapsedSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [istoricLoading])

  // Play notification sound when webhook response is received
  useEffect(() => {
    if (webhookResponse && notifyOnCompletion) {
      // Create and play a notification sound
      const playNotificationSound = () => {
        try {
          // Create an audio context and oscillator for a pleasant notification sound
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          // Pleasant notification tone (two beeps)
          oscillator.frequency.value = 800
          oscillator.type = 'sine'

          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)

          // Second beep
          setTimeout(() => {
            const oscillator2 = audioContext.createOscillator()
            const gainNode2 = audioContext.createGain()

            oscillator2.connect(gainNode2)
            gainNode2.connect(audioContext.destination)

            oscillator2.frequency.value = 1000
            oscillator2.type = 'sine'

            gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

            oscillator2.start(audioContext.currentTime)
            oscillator2.stop(audioContext.currentTime + 0.2)
          }, 250)
        } catch (error) {
          console.error('Failed to play notification sound:', error)
        }
      }

      playNotificationSound()
    }
  }, [webhookResponse, notifyOnCompletion])

  // Auto-notify n8n once all batches are ready
  const notifyClaudeCode = async (currentBatches: Batch[]) => {
    if (currentBatches.length === 0) return
    try {
      await fetch('https://n8n.voisero.info/webhook/start-claude-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batches: currentBatches }),
      })
      setInjectorStatus(`✓ Batch-urile au fost trimise (${currentBatches.length})`)
      setTimeout(() => setInjectorStatus(null), 5000)
    } catch (error) {
      console.error('notifyClaudeCode error:', error)
    }
  }

  useClaudeInjector({
    onInjectProducts: (products, documentName) => {
      setCerintaResult(products)
      setCerintaFiles([])
      setCerintaLoading(false)
      setCerintaError(null)
      setActiveTab('cerinta')
      setInjectorStatus(`✓ Claude a injectat ${products.length} produse din "${documentName}"`)
      setTimeout(() => setInjectorStatus(null), 5000)
    },
    onInjectLinks: (links) => {
      setLinkText(links.map(l => l.url).join(', '))
      setActiveTab('link')
      setInjectorStatus(`✓ Claude a injectat ${links.length} linkuri`)
      setTimeout(() => setInjectorStatus(null), 5000)
    },
    onSetStatus: (batchId, status) => {
      setBatches(prev => prev.map(b =>
        b.id === batchId || b.fileName === batchId
          ? { ...b, status: status as Batch['status'] }
          : b
      ))
      setInjectorStatus(`🔄 Status actualizat: ${batchId} → ${status}`)
      setTimeout(() => setInjectorStatus(null), 3000)
    },
    onPing: () => {
      setInjectorStatus('🟢 Claude Code conectat')
      setTimeout(() => setInjectorStatus(null), 3000)
    },
  })

  return (
    <div className="min-h-screen bg-back text-text-main flex">
      {/* Narrow Sidebar Navigation */}
      <div className="w-16 bg-surface border-r border-border flex flex-col items-center py-6 space-y-1 flex-shrink-0">
        {/* Logo / Brand */}
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        {/* Nav Items */}
        <button
          onClick={() => setActiveTab('fisier')}
          className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${activeTab === 'fisier'
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
            }`}
          title="Cautare Dupa fisier"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {activeTab === 'fisier' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
          )}
          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            Cautare Dupa fisier
          </div>
        </button>

        <button
          onClick={() => setActiveTab('link')}
          className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${activeTab === 'link'
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
            }`}
          title="Cautare Dupa link"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {activeTab === 'link' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
          )}
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            Cautare Dupa link
          </div>
        </button>

        <button
          onClick={() => setActiveTab('cerinta')}
          className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${activeTab === 'cerinta'
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
            }`}
          title="Extrage cerinta"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          {activeTab === 'cerinta' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
          )}
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            Extrage cerinta din caietul de sarcina
          </div>
        </button>

        <button
          onClick={() => setActiveTab('istoric')}
          className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${activeTab === 'istoric'
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
            }`}
          title="Istoric Oferte"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {activeTab === 'istoric' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
          )}
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            Istoric Oferte
          </div>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Test Data Button at Bottom */}
        <button
          onClick={loadMockData}
          className="group relative w-12 h-12 rounded-xl flex items-center justify-center text-text-muted hover:text-blue-400 hover:bg-surface-hover transition-all duration-200"
          title="Încarcă Date Test"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            Încarcă Date Test
          </div>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header Bar */}
        <div className="h-14 bg-surface border-b border-border flex items-center px-6 flex-shrink-0">
          <h1 className="text-lg font-semibold text-text-main">
            {activeTab === 'fisier' && 'Cautare Dupa fisier'}
            {activeTab === 'link' && 'Cautare Dupa link'}
            {activeTab === 'cerinta' && 'Extrage cerinta din caietul de sarcina'}
            {activeTab === 'istoric' && 'Istoric Oferte'}
          </h1>
          {injectorStatus && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(85,212,108,0.1)', border: '1px solid rgba(85,212,108,0.3)', color: '#55d46c' }}>
              {injectorStatus}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Controls Panel - Left */}
          <div className="w-[340px] flex-shrink-0 border-r border-border bg-surface/50 overflow-y-auto p-4 space-y-4">

            {/* === FISIER TAB CONTENT === */}
            {activeTab === 'fisier' && (
              <>
                {/* Model Selection Zone */}
                <div className="bg-surface rounded-xl shadow-sm p-4 space-y-3 border border-border">
                  <h2 className="text-sm font-semibold text-text-main mb-2">Model Configuration</h2>

                  {/* Provider Toggle */}
                  <div className="flex p-1 bg-surface-hover rounded-lg border border-border">
                    <button
                      onClick={() => setModelProvider('openai')}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${modelProvider === 'openai'
                        ? 'bg-primary text-back shadow-sm'
                        : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                      OpenAI
                    </button>
                    <button
                      onClick={() => setModelProvider('gemini')}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${modelProvider === 'gemini'
                        ? 'bg-primary text-back shadow-sm'
                        : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                      Gemini
                    </button>
                    <button
                      onClick={() => setModelProvider('grok')}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${modelProvider === 'grok'
                        ? 'bg-primary text-back shadow-sm'
                        : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                      Grok
                    </button>
                  </div>

                  {/* Model Dropdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-muted block">
                      Select Model
                    </label>
                    <div className="relative">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full p-2 bg-surface border border-border rounded-lg text-sm text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                      >
                        {MODELS[modelProvider].map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Include Images Switch */}
                  <div className="flex items-center justify-between p-2 bg-surface border border-border rounded-lg">
                    <span className="text-xs font-medium text-text-main">Adauga imagini produs</span>
                    <button
                      onClick={() => setIncludeImages(!includeImages)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${includeImages ? 'bg-primary' : 'bg-gray-200'
                        }`}
                    >
                      <span
                        className={`${includeImages ? 'translate-x-5' : 'translate-x-0.5'
                          } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                  </div>

                  {/* Notification Toggle */}
                  <div className="flex items-center justify-between p-2 bg-surface border border-border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span className="text-xs font-medium text-text-main">Notificare finalizata</span>
                    </div>
                    <button
                      onClick={() => setNotifyOnCompletion(!notifyOnCompletion)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${notifyOnCompletion ? 'bg-primary' : 'bg-gray-200'
                        }`}
                    >
                      <span
                        className={`${notifyOnCompletion ? 'translate-x-5' : 'translate-x-0.5'
                          } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                  </div>

                  {/* Optional Product Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted block">
                      Optional: Denumirea produsului
                    </label>
                    <div className="relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={optionalProductName}
                        onChange={(e) => setOptionalProductName(e.target.value)}
                        placeholder="Ex: Laptop Dell Latitude 5520"
                        className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Folosit în cazul în care în caietul de sarcini nu apare denumirea.
                    </p>
                  </div>
                </div>

                {/* File Upload Zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all duration-300 cursor-pointer ${isDragging
                    ? 'border-primary bg-surface-hover scale-[1.02] shadow-lg'
                    : 'border-border bg-surface hover:border-primary hover:shadow-md'
                    }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <div className="space-y-3">
                    <div className="relative mx-auto w-12 h-12">
                      <svg
                        className="w-full h-full text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-main mb-0.5">
                        Încarcă Documente
                      </p>
                      <p className="text-xs text-text-muted">
                        sau trage și plasează aici
                      </p>
                    </div>
                  </div>
                </div>

                {/* File List */}
                {hasFiles && (
                  <div className="bg-surface rounded-xl shadow-sm p-3 space-y-2 border border-border">
                    <div className="flex justify-between items-center">
                      <h2 className="text-sm font-semibold text-text-main">
                        Fișiere ({files.length})
                      </h2>
                      <div className="space-x-1.5">
                        <button
                          onClick={uploadAllFiles}
                          disabled={files.every((f) => f.status !== 'pending')}
                          className="px-2.5 py-1 bg-primary text-back rounded-lg hover:bg-primary-hover disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                        >
                          Încarcă Toate
                        </button>
                        <button
                          onClick={clearAll}
                          className="px-2.5 py-1 bg-red-900/50 text-red-200 border border-red-900 rounded-lg hover:bg-red-900 text-xs font-medium transition-colors"
                        >
                          Șterge
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {files.map((fileWithStatus, index) => (
                        <div
                          key={index}
                          className="bg-surface border border-border rounded-lg p-2.5 flex items-center justify-between hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-main truncate">
                              {fileWithStatus.file.name}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {(fileWithStatus.file.size / 1024).toFixed(2)} KB
                            </p>
                            {fileWithStatus.error && (
                              <p className="text-[11px] text-red-400 mt-0.5">
                                {fileWithStatus.error}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 ml-2">
                            {(fileWithStatus.status === 'extracting' || fileWithStatus.status === 'uploading') && (
                              <div className="flex items-center space-x-1">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                <span className="text-[11px] text-text-muted">
                                  {fileWithStatus.status === 'extracting' ? 'Extragere...' : 'Procesare...'}
                                </span>
                              </div>
                            )}
                            {fileWithStatus.status === 'success' && (
                              <span className="text-xs text-success font-medium">✓</span>
                            )}
                            {fileWithStatus.status === 'error' && (
                              <span className="text-xs text-red-400 font-medium">✗</span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFile(index)
                              }}
                              className="px-1.5 py-0.5 text-[11px] font-medium text-text-muted hover:text-red-400 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Batch List */}
                {batches.length > 0 && (
                  <div className="bg-surface rounded-xl shadow-sm p-3 space-y-2 border border-border">
                    <h2 className="text-sm font-semibold text-text-main">
                      Batch-uri ({batches.length})
                    </h2>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="bg-surface border border-border rounded-lg p-2.5 flex items-center justify-between hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-main truncate">
                              📄 {batch.fileName}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {batch.productCount} {batch.productCount === 1 ? 'produs' : 'produse'}
                            </p>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            {batch.status === 'pending' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-700/50 text-gray-300 border border-gray-600">
                                ⏳ Pending
                              </span>
                            )}
                            {batch.status === 'processing' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-900/30 text-yellow-300 border border-yellow-700/50">
                                🟡 Processing
                              </span>
                            )}
                            {batch.status === 'done' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-900/30 text-green-300 border border-green-700/50">
                                ✅ Done
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* === LINK TAB CONTENT === */}
            {activeTab === 'link' && (
              <div className="bg-surface rounded-xl shadow-sm p-4 space-y-4 border border-border">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-main block">
                    Insereaza link
                  </label>
                  <textarea
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="https://link1.com, https://link2.com, ..."
                    rows={4}
                    className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  />
                </div>
                <button
                  onClick={handleLinkSearch}
                  disabled={!linkText.trim() || linkLoading}
                  className="w-full py-2 bg-primary text-back rounded-lg hover:bg-primary-hover disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-sm font-bold transition-colors flex items-center justify-center space-x-2"
                >
                  {linkLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-back"></div>
                      <span>Se trimite...</span>
                    </>
                  ) : (
                    <span>Cautare</span>
                  )}
                </button>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Insereaza link-ul produselor gasite separate prin virgula si documentul se va genera.
                </p>
              </div>
            )}

            {/* === CERINTA TAB CONTENT === */}
            {activeTab === 'cerinta' && (
              <div className="bg-surface rounded-xl shadow-sm p-4 space-y-4 border border-border">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-main block">
                    Încarcă caiete de sarcini
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition-all duration-300 cursor-pointer ${isCerintaDragging ? 'border-primary bg-surface-hover scale-[1.02] shadow-lg' :
                      'border-border bg-surface hover:border-primary hover:shadow-md'
                      }`}
                    onDragOver={handleCerintaDragOver}
                    onDragLeave={handleCerintaDragLeave}
                    onDrop={handleCerintaDrop}
                    onClick={() => {
                      const input = document.getElementById('cerinta-file-input');
                      if (input) input.click();
                    }}
                  >
                    <input
                      id="cerinta-file-input"
                      type="file"
                      accept=".pdf,.docx,.doc"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const newFiles = Array.from(e.target.files);
                          setCerintaFiles(prev => [...prev, ...newFiles]);
                          setCerintaError(null);
                          // Reset input so same file can be re-added
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="space-y-2">
                      <div className="mx-auto w-10 h-10">
                        <svg className="w-full h-full text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-main mb-0.5">Încarcă Documente</p>
                        <p className="text-xs text-text-muted">PDF sau DOCX · mai multe fișiere acceptate</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cerinta File List */}
                {cerintaFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {cerintaFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="bg-surface border border-border rounded-lg p-2.5 flex items-center justify-between hover:bg-surface-hover transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-text-main truncate">{file.name}</p>
                          <p className="text-[11px] text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCerintaFile(index)
                          }}
                          disabled={cerintaLoading}
                          className="px-1.5 py-0.5 text-[11px] font-medium text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleCerintaUpload}
                  disabled={cerintaFiles.length === 0 || cerintaLoading}
                  className="w-full py-2 bg-primary text-back rounded-lg hover:bg-primary-hover disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-sm font-bold transition-colors flex items-center justify-center space-x-2"
                >
                  {cerintaLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-back"></div>
                      <span>{cerintaProgress || 'Se proceseaza...'}</span>
                    </>
                  ) : (
                    <span>Extrage cerinta ({cerintaFiles.length} {cerintaFiles.length === 1 ? 'fișier' : 'fișiere'})</span>
                  )}
                </button>
                {cerintaError && (
                  <p className="text-xs text-red-400 whitespace-pre-line">{cerintaError}</p>
                )}
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Încarcă caiete de sarcini și cerințele vor fi extrase automat din fiecare document, secvențial.
                </p>
              </div>
            )}

            {/* === ISTORIC OFERTE TAB CONTENT === */}
            {activeTab === 'istoric' && (
              <div className="bg-surface rounded-xl shadow-sm p-4 space-y-4 border border-border">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-main block mb-2">
                    Extragere din istoric
                  </label>
                  <button
                    onClick={handleIstoricFetch}
                    disabled={istoricLoading}
                    className="w-full py-2 bg-primary text-back rounded-lg hover:bg-primary-hover disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-sm font-bold transition-colors flex items-center justify-center space-x-2"
                  >
                    {istoricLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-back"></div>
                        <span>Se extrage...</span>
                      </>
                    ) : (
                      <span>Extrage oferte din trecut</span>
                    )}
                  </button>
                  <p className="text-[11px] text-text-muted leading-relaxed mt-2">
                    Apasă butonul pentru a prelua și genera ofertele salvate în istoric.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Results / PDF Area - Right */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-surface rounded-xl shadow-lg p-6 min-h-[600px]">
              {/* Cerinta result display — grouped by document (batch) */}
              {activeTab === 'cerinta' && (cerintaLoading || cerintaResult) ? (
                cerintaLoading ? (
                  <div className="flex items-center justify-center h-full min-h-[500px]">
                    <div className="text-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="text-lg font-medium text-text-muted">Se extrag cerințele din document...</p>
                      {cerintaProgress && <p className="text-sm text-text-muted">{cerintaProgress}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-text-main">Cerințe extrase</h2>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-text-muted">
                          {batches.length} {batches.length === 1 ? 'document' : 'documente'} · {cerintaResult?.length || 0} {(cerintaResult?.length || 0) === 1 ? 'produs' : 'produse'}
                        </span>
                        <button
                          onClick={() => { setCerintaResult(null); setCerintaFiles([]); setCerintaError(null); setBatches([]); }}
                          className="px-3 py-1.5 bg-red-900/50 text-red-200 border border-red-900 rounded-lg hover:bg-red-900 text-xs font-medium transition-colors"
                        >
                          Șterge rezultat
                        </button>
                      </div>
                    </div>


                    {/* Products grouped by document */}
                    <div className="space-y-5">
                      {batches.map((batch) => (
                        <div key={batch.id} className="border border-border rounded-xl overflow-hidden">
                          {/* Document header */}
                          <div className="bg-surface-hover px-5 py-3 flex items-center justify-between border-b border-border">
                            <div className="flex items-center space-x-3 min-w-0">
                              <span className="text-lg">📄</span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-main truncate">{batch.fileName}</p>
                                <p className="text-[11px] text-text-muted">{batch.productCount} {batch.productCount === 1 ? 'produs' : 'produse'}</p>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              {batch.status === 'pending' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-700/50 text-gray-300 border border-gray-600">
                                  ⏳ Pending
                                </span>
                              )}
                              {batch.status === 'processing' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-yellow-900/30 text-yellow-300 border border-yellow-700/50">
                                  🟡 Processing
                                </span>
                              )}
                              {batch.status === 'done' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-900/30 text-green-300 border border-green-700/50">
                                  ✅ Done
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Product list for this document */}
                          <div className="divide-y divide-border">
                            {batch.products.map((product, idx) => (
                              <div key={idx} className="px-5 py-4 hover:bg-surface-hover/50 transition-colors">
                                <div className="flex items-start space-x-4">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-primary">{idx + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-text-main mb-1">{product.productName}</h3>
                                    <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap">{product.productDescription}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : activeTab === 'link' && (linkLoading || linkWebhookResponse) ? (
                linkLoading ? (
                  <div>
                    <LoadingAnimation elapsedSeconds={linkElapsedSeconds} />
                  </div>
                ) : linkWebhookResponse ? (
                  <OffersList
                    webhookResponse={linkWebhookResponse}
                    onClear={() => {
                      setLinkWebhookResponse(null)
                    }}
                  />
                ) : null
              ) : activeTab === 'istoric' && (istoricLoading || istoricWebhookResponse) ? (
                istoricLoading ? (
                  <div>
                    <LoadingAnimation elapsedSeconds={istoricElapsedSeconds} />
                  </div>
                ) : istoricWebhookResponse ? (
                  <OffersList
                    webhookResponse={istoricWebhookResponse}
                    onClear={() => {
                      setIstoricWebhookResponse(null)
                    }}
                    onDelete={async (offer) => {
                      try {
                        await fetch('https://n8n.voisero.info/webhook/delete-seap', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(offer),
                        })
                      } catch (error) {
                        console.error('Delete webhook error:', error)
                      }
                    }}
                  />
                ) : null
              ) : isProcessing && !webhookResponse ? (
                <div>
                  <LoadingAnimation elapsedSeconds={elapsedSeconds} />
                  {uploadTimestamp && (
                    <div className="mt-6 text-center">
                      <p className="text-sm text-text-muted mb-2">
                        Dacă ați dat refresh în timpul procesării, răspunsul va apărea automat când este gata.
                      </p>
                    </div>
                  )}
                </div>
              ) : webhookResponse ? (
                <OffersList
                  webhookResponse={webhookResponse}
                  onClear={() => {
                    setWebhookResponse(null)
                    localStorage.removeItem(STORAGE_KEYS.WEBHOOK_RESPONSE)
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full min-h-[500px]">
                  <div className="text-center">
                    <div className="mx-auto w-24 h-24 mb-4 text-border">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-text-muted">
                      Încarcă documente pentru a genera oferte
                    </p>
                    <p className="text-sm text-text-muted/60 mt-2">
                      Documentele generate vor apărea aici
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}

export default App
