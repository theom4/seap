/* eslint-disable @typescript-eslint/no-explicit-any */

export const config = {
    maxDuration: 60,
}

export default async function handler(req: any, res: any) {
    const targetUrl = 'https://n8n.voisero.info/webhook/seap-test'

    console.log(`[api/webhook-proxy] ${req.method} -> ${targetUrl}`)
    console.log(`[api/webhook-proxy] Content-Type: ${req.headers['content-type']}`)
    console.log(`[api/webhook-proxy] Body size: ${JSON.stringify(req.body).length} chars`)

    // Handle CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        })

        console.log(`[api/webhook-proxy] n8n response status: ${response.status}`)

        const responseText = await response.text()
        console.log(`[api/webhook-proxy] n8n response length: ${responseText.length} chars`)

        const contentType = response.headers.get('content-type')
        if (contentType) {
            res.setHeader('Content-Type', contentType)
        }

        return res.status(response.status).send(responseText)
    } catch (error: any) {
        console.error('[api/webhook-proxy] Error:', error.message)
        return res.status(502).json({
            error: 'Proxy error',
            message: error.message,
            target: targetUrl,
        })
    }
}
