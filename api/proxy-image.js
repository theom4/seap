export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    const imageUrl = req.query.url;

    if (!imageUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Basic validation
    try {
        const parsed = new URL(imageUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ error: 'URL must use http or https protocol' });
        }
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*,*/*',
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `Failed to fetch: ${response.statusText}` });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await response.arrayBuffer());

        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(buffer);
    } catch (error) {
        console.error('[proxy-image] Error:', error.message);
        return res.status(500).json({ error: `Proxy error: ${error.message}` });
    }
}
