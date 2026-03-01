/* eslint-disable @typescript-eslint/no-explicit-any */
export const config = { maxDuration: 30 }

interface BatchItem {
    id: string
    fileName: string
    productCount: number
    status: 'pending' | 'processing' | 'done'
}

const store: { batches: BatchItem[] } = { batches: [] }

function isAuthorized(req: any): boolean {
    const expectedToken = process.env.CLAUDE_INJECT_TOKEN || 'dev-token'
    const providedToken = req.headers['x-claude-token'] || req.query?.token || req.body?.token
    return providedToken === expectedToken
}

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Claude-Token')
    if (req.method === 'OPTIONS') return res.status(200).end()

    if (req.method === 'GET') {
        // Public read — Claude can GET without auth for simplicity
        return res.status(200).json({ batches: store.batches })
    }

    if (req.method === 'POST') {
        if (!isAuthorized(req)) {
            return res.status(401).json({ error: 'Unauthorized. Set X-Claude-Token header.' })
        }

        const body = req.body
        if (!body.batches || !Array.isArray(body.batches)) {
            return res.status(400).json({ error: 'Missing required field: batches (array)' })
        }

        store.batches = body.batches
        return res.status(200).json({
            ok: true,
            count: store.batches.length,
            message: 'Batch list updated.',
        })
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
