import { ISearchProvider, RawSearchResult } from './types.js';

export class WebSearchProvider implements ISearchProvider {
  public name = 'Public Web Search (Multi-engine)';

  public isAvailable(): boolean {
    return true;
  }

  public async search(query: string, maxResults = 8): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];

    try {
      const encoded = encodeURIComponent(query);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[WebSearchProvider] Response status: ${response.status}`);
        return results;
      }

      const html = await response.text();

      // Parse DuckDuckGo HTML results
      // Match result blocks
      const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<a[^>]+class="result__snippet"[^>]+>([\s\S]*?)<\/a>/gi;

      const matchedLinks: { url: string; title: string }[] = [];
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(html)) !== null) {
        let rawUrl = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();

        // Extract actual URL from DuckDuckGo redirect wrapper if present
        if (rawUrl.includes('uddg=')) {
          const uMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uMatch) {
            try {
              rawUrl = decodeURIComponent(uMatch[1]);
            } catch {
              // fallback to raw
            }
          }
        }

        if (rawUrl.startsWith('//')) {
          rawUrl = `https:${rawUrl}`;
        }

        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          matchedLinks.push({ url: rawUrl, title });
        }
      }

      const snippets: string[] = [];
      while ((match = snippetRegex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim();
        snippets.push(text);
      }

      for (let i = 0; i < Math.min(maxResults, matchedLinks.length); i++) {
        const { url, title } = matchedLinks[i];
        const snippet = snippets[i] || '';
        let domain = '';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          domain = '';
        }

        if (domain && !domain.includes('duckduckgo.com')) {
          results.push({
            title,
            url,
            snippet,
            sourceDomain: domain,
            engine: 'ddg-web',
          });
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn(`[WebSearchProvider] Search error for query "${query}":`, err?.message || err);
      }
    }

    return results;
  }
}
