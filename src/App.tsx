import { useState, useRef, useEffect, type DragEvent } from 'react'
import { OffersList } from './components/OffersList'
import { extractBinaryFromFile } from './utils/pdfBinaryExtraction'
import type { WebhookResponse } from './types'
import './App.css'

// LocalStorage keys
const STORAGE_KEYS = {
  FILES: 'pdf_uploader_files',
  WEBHOOK_RESPONSE: 'pdf_uploader_webhook_response',
  PROCESSING_STATE: 'pdf_uploader_processing_state',
  UPLOAD_TIMESTAMP: 'pdf_uploader_upload_timestamp',
}

// Loading Animation Component
function LoadingAnimation() {
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
}

type ModelProvider = keyof typeof MODELS

function App() {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [webhookResponse, setWebhookResponse] = useState<WebhookResponse | null>(null)
  const [uploadTimestamp, setUploadTimestamp] = useState<number | null>(null)

  // Model Selection State
  const [modelProvider, setModelProvider] = useState<ModelProvider>('openai')
  const [selectedModel, setSelectedModel] = useState<string>(MODELS.openai[0])

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


  const uploadAllFiles = async () => {
    const pendingFiles = files
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.status === 'pending')

    if (pendingFiles.length === 0) return

    // Save upload timestamp
    const timestamp = Date.now()
    setUploadTimestamp(timestamp)
    localStorage.setItem(STORAGE_KEYS.UPLOAD_TIMESTAMP, timestamp.toString())

    // Set all pending files to extracting
    setFiles((prev) => {
      const updated = [...prev]
      pendingFiles.forEach(({ index }) => {
        updated[index] = { ...updated[index], status: 'extracting' }
      })
      return updated
    })

    try {
      // Extract files using binary mode
      const filesData = await Promise.all(
        pendingFiles.map(async ({ file }) => {
          try {
            return await extractBinaryFromFile(file.file)
          } catch (error) {
            throw new Error(`Failed to extract data from ${file.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        })
      )

      // Set all files to uploading
      setFiles((prev) => {
        const updated = [...prev]
        pendingFiles.forEach(({ index }) => {
          updated[index] = { ...updated[index], status: 'uploading' }
        })
        return updated
      })

      // Prepare payload by adding model details to each file object
      // This maintains compatibility with n8n 'Convert to File' node which expects 'data' property on the root of each item
      const payload = filesData.map(fileData => ({
        ...fileData,
        modelProvider,
        model: selectedModel,
      }))
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20 * 60 * 1000);
      let response: any;
      // Send payload in request
      try {
        response = await fetch('https://n8n.voisero.info/webhook/seap-test', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),

        })
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }
      }
      catch (error: any) {
        if (error.name === 'AbortError') console.log('timeout');

      } finally {
        clearTimeout(timeoutId);
      }




      // Parse webhook response with better error handling
      let responseData: WebhookResponse
      try {
        const responseText = await response.text()

        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server')
        }

        try {
          responseData = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError)
          console.error('Response text:', responseText.substring(0, 500))
          throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
        }
      } catch (error) {
        throw new Error(`Failed to parse webhook response: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Validate and log webhook response structure
      // FIX: Throw error if response is not an array (prevents saving error objects to state)
      if (!Array.isArray(responseData)) {
        console.error('Invalid response format:', responseData)
        throw new Error('Server returned an invalid format (not an array)')
      }

      console.log(`Webhook response received: ${responseData.length} item(s)`)
      setWebhookResponse(responseData)

      // Clear processing state
      setUploadTimestamp(null)
      localStorage.removeItem(STORAGE_KEYS.UPLOAD_TIMESTAMP)

      // Mark all files as success
      setFiles((prev) => {
        const updated = [...prev]
        pendingFiles.forEach(({ index }) => {
          updated[index] = { ...updated[index], status: 'success' }
        })
        return updated
      })
    } catch (error) {
      // Clear processing state on error
      setUploadTimestamp(null)
      localStorage.removeItem(STORAGE_KEYS.UPLOAD_TIMESTAMP)

      // Mark all files as error
      setFiles((prev) => {
        const updated = [...prev]
        pendingFiles.forEach(({ index }) => {
          updated[index] = {
            ...updated[index],
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        })
        return updated
      })
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setFiles([])
    setWebhookResponse(null)
    setUploadTimestamp(null)

    // Clear all localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }


  const isProcessing = files.some(f => f.status === 'extracting' || f.status === 'uploading')
  const hasFiles = files.length > 0

  return (
    <div className="min-h-screen bg-back text-text-main">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-main">
            Generator Oferte PDF
          </h1>
        </div>

        {/* Main Layout: 30% Upload, 70% PDF Area */}
        <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
          {/* Upload Zone - Left Side (30%) */}
          <div className="space-y-4">
            {/* Model Selection Zone */}
            <div className="bg-surface rounded-xl shadow-md p-4 space-y-3 border border-border">
              <h2 className="text-lg font-semibold text-text-main mb-2">Model Configuration</h2>

              {/* Provider Toggle */}
              <div className="flex p-1 bg-surface-hover rounded-lg border border-border">
                <button
                  onClick={() => setModelProvider('openai')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${modelProvider === 'openai'
                    ? 'bg-primary text-back shadow-sm'
                    : 'text-text-muted hover:text-text-main'
                    }`}
                >
                  OpenAI
                </button>
                <button
                  onClick={() => setModelProvider('gemini')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${modelProvider === 'gemini'
                    ? 'bg-primary text-back shadow-sm'
                    : 'text-text-muted hover:text-text-main'
                    }`}
                >
                  Gemini
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
                    className="w-full p-2.5 bg-surface border border-border rounded-lg text-sm text-text-main focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
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
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${isDragging
                ? 'border-primary bg-surface-hover scale-105 shadow-lg'
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
              <div className="space-y-4">
                <div className="relative mx-auto w-16 h-16">
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
                  <p className="text-sm font-semibold text-text-main mb-1">
                    Încarcă Documente
                  </p>
                  <p className="text-xs text-text-muted">
                    sau trage și plasează aici
                  </p>
                </div>
              </div>
            </div>

            {hasFiles && (
              <div className="bg-surface rounded-xl shadow-md p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-text-main">
                    Fișiere ({files.length})
                  </h2>
                  <div className="space-x-2">
                    <button
                      onClick={uploadAllFiles}
                      disabled={files.every((f) => f.status !== 'pending')}
                      className="px-3 py-1.5 bg-primary text-back rounded-lg hover:bg-primary-hover disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                    >
                      Încarcă Toate
                    </button>
                    <button
                      onClick={clearAll}
                      className="px-3 py-1.5 bg-red-900/50 text-red-200 border border-red-900 rounded-lg hover:bg-red-900 text-xs font-medium transition-colors"
                    >
                      Șterge
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {files.map((fileWithStatus, index) => (
                    <div
                      key={index}
                      className="bg-surface border border-border rounded-lg p-3 flex items-center justify-between hover:bg-surface-hover transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-main truncate">
                          {fileWithStatus.file.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {(fileWithStatus.file.size / 1024).toFixed(2)} KB
                        </p>
                        {fileWithStatus.error && (
                          <p className="text-xs text-red-400 mt-1">
                            {fileWithStatus.error}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        {(fileWithStatus.status === 'extracting' || fileWithStatus.status === 'uploading') && (
                          <div className="flex items-center space-x-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                            <span className="text-xs text-text-muted">
                              {fileWithStatus.status === 'extracting' ? 'Extragere...' : 'Procesare...'}
                            </span>
                          </div>
                        )}
                        {fileWithStatus.status === 'success' && (
                          <span className="text-xs text-success font-medium">
                            ✓
                          </span>
                        )}
                        {fileWithStatus.status === 'error' && (
                          <span className="text-xs text-red-400 font-medium">
                            ✗
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                          className="px-2 py-1 text-xs font-medium text-text-muted hover:text-red-400 transition-colors"
                        >
                          Șterge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PDF Area - Right Side (70%) */}
          <div className="bg-surface rounded-xl shadow-lg p-6 min-h-[600px]">
            {isProcessing && !webhookResponse ? (
              <div>
                <LoadingAnimation />
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
  )
}

export default App
