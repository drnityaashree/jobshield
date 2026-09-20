import { ISearchProvider, RawSearchResult } from './types.js';

export class SerperProvider implements ISearchProvider {
  public name = 'Serper Google Search';

  public isAvailable(): boolean {
    return Boolean(process.env.SERPER_API_KEY);
  }

  public async search(query: string, maxResults = 8): Promise<RawSearchResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return [];

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: maxResults }),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const results: RawSearchResult[] = [];

      if (data.organic && Array.isArray(data.organic)) {
        for (const item of data.organic) {
          let domain = '';
          try {
            domain = new URL(item.link).hostname.replace(/^www\./, '');
          } catch {
            domain = '';
          }

          results.push({
            title: item.title || '',
            url: item.link || '',
            snippet: item.snippet || '',
            sourceDomain: domain,
            engine: 'serper',
          });
        }
      }

      return results;
    } catch (err) {
      console.warn('[SerperProvider] Error:', err);
      return [];
    }
  }
}

export class TavilyProvider implements ISearchProvider {
  public name = 'Tavily Search';

  public isAvailable(): boolean {
    return Boolean(process.env.TAVILY_API_KEY);
  }

  public async search(query: string, maxResults = 8): Promise<RawSearchResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return [];

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
          search_depth: 'basic',
        }),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const results: RawSearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          let domain = '';
          try {
            domain = new URL(item.url).hostname.replace(/^www\./, '');
          } catch {
            domain = '';
          }

          results.push({
            title: item.title || '',
            url: item.url || '',
            snippet: item.content || item.snippet || '',
            sourceDomain: domain,
            engine: 'tavily',
          });
        }
      }

      return results;
    } catch (err) {
      console.warn('[TavilyProvider] Error:', err);
      return [];
    }
  }
}
