import { useEffect, useRef, useCallback } from 'react'

export interface InjectedProduct {
    productName: string
    productDescription: string
}

export interface InjectedLink {
    productName: string
    url: string
}

export interface InjectorCallbacks {
    onInjectProducts?: (products: InjectedProduct[], documentName: string) => void
    onInjectLinks?: (links: InjectedLink[]) => void
    onPing?: () => void
}

const POLL_INTERVAL_MS = 3000
const INJECT_ENDPOINT = '/api/claude-inject?action=poll'

export function useClaudeInjector(callbacks: InjectorCallbacks) {
    const callbacksRef = useRef(callbacks)
    callbacksRef.current = callbacks

    const poll = useCallback(async () => {
        try {
            const res = await fetch(INJECT_ENDPOINT)
            if (!res.ok) return
            const data = await res.json()
            const injections: Array<{
                id: string
                action: string
                products?: InjectedProduct[]
                links?: InjectedLink[]
                documentName?: string
            }> = data.injections || []

            for (const injection of injections) {
                switch (injection.action) {
                    case 'inject_products':
                        if (injection.products && callbacksRef.current.onInjectProducts) {
                            callbacksRef.current.onInjectProducts(injection.products, injection.documentName || 'Claude Injection')
                        }
                        break
                    case 'inject_links':
                        if (injection.links && callbacksRef.current.onInjectLinks) {
                            callbacksRef.current.onInjectLinks(injection.links)
                        }
                        break
                    case 'ping':
                        callbacksRef.current.onPing?.()
                        break
                }
            }
        } catch {
            // silent fail
        }
    }, [])

    useEffect(() => {
        poll()
        const interval = setInterval(poll, POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [poll])
}
