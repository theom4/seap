/* eslint-disable @typescript-eslint/no-explicit-any */
export const config = { maxDuration: 30 }

const store: {
    pending: PendingInjection[]
    logs: LogEntry[]
} = { pending: [], logs: [] }

interface PendingInjection {
    id: string
    timestamp: string
    action: 'inject_products' | 'inject_links' | 'set_status' | 'ping'
    documentName?: string
    products?: Array<{ productName: string; productDescription: string }>
    links?: Array<{ productName: string; url: string }>
    status?: string
    sessionId?: string
    metadata?: Record<string, unknown>
    consumed: boolean
}

interface LogEntry {
    timestamp: string
    level: 'info' | 'warn' | 'error'
    message: string
    data?: unknown
}

function log(level: LogEntry['level'], message: string, data?: unknown) {
    const entry: LogEntry = { timestamp: new Date().toISOString(), level, message, data }
    store.logs.unshift(entry)
    if (store.logs.length > 100) store.logs.pop()
}

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
        const action = req.query?.action
        if (action === 'logs') {
            if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })
            return res.status(200).json({ logs: store.logs })
        }
        if (action === 'poll') {
            const pending = store.pending.filter((p) => !p.consumed)
            pending.forEach((p) => { p.consumed = true })
            return res.status(200).json({ injections: pending })
        }
        return res.status(200).json({
            status: 'ok',
            pendingCount: store.pending.filter((p) => !p.consumed).length,
            totalInjections: store.pending.length,
        })
    }

    if (req.method === 'POST') {
        if (!isAuthorized(req)) {
            log('warn', 'Unauthorized injection attempt')
            return res.status(401).json({ error: 'Unauthorized. Set X-Claude-Token header.' })
        }
        const body = req.body as Partial<PendingInjection>
        if (!body.action) return res.status(400).json({ error: 'Missing required field: action' })

        const injection: PendingInjection = {
            id: `inj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            action: body.action,
            documentName: body.documentName,
            products: body.products,
            links: body.links,
            status: body.status,
            sessionId: body.sessionId,
            metadata: body.metadata,
            consumed: false,
        }
        store.pending.push(injection)
        if (store.pending.length > 20) store.pending.shift()
        log('info', `Injection received: ${injection.action}`, { id: injection.id })

        return res.status(200).json({
            ok: true,
            injectionId: injection.id,
            message: 'Injection queued. App will pick it up on next poll (every 3s).',
        })
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
