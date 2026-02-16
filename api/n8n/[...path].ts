/* eslint-disable @typescript-eslint/no-explicit-any */

export const config = {
    maxDuration: 60,
}

export default async function handler(req: any, res: any) {
    const pathSegments = req.query.path
    const path = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments || ''
    const targetUrl = `https://n8n.voisero.info/${path}`

    console.log(`[api/n8n] Proxying ${req.method} -> ${targetUrl}`)

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        return res.status(200).end()
    }

    try {
        const fetchOptions: any = {
            method: req.method || 'POST',
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
            },
        }

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            fetchOptions.body = JSON.stringify(req.body)
        }

        const response = await fetch(targetUrl, fetchOptions)
        const responseText = await response.text()

        // Forward content-type header
        const contentType = response.headers.get('content-type')
        if (contentType) {
            res.setHeader('Content-Type', contentType)
        }

        // Allow CORS
        res.setHeader('Access-Control-Allow-Origin', '*')

        return res.status(response.status).send(responseText)
    } catch (error: any) {
        console.error('[api/n8n] Proxy error:', error.message)
        return res.status(502).json({ error: 'Proxy error', message: error.message })
    }
}
