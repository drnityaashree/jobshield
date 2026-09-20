import { GoogleGenAI } from '@google/genai';
import { ISearchProvider, RawSearchResult } from './types.js';

export class GeminiKnowledgeProvider implements ISearchProvider {
  public name = 'Gemini Enterprise Knowledge Engine';
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.ai);
  }

  public async search(query: string, maxResults = 5): Promise<RawSearchResult[]> {
    if (!this.ai) return [];

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `You are an enterprise company authenticity and intelligence system.
Analyze this search query for company verification: "${query}".
Identify the company's verified public digital footprint, including:
1. LinkedIn Company page URL (e.g. https://www.linkedin.com/company/slug)
2. Official corporate website URL
3. Employee sentiment, glassdoor/reviews or known footprint
4. Any scam or fraud flags if this is an unverified or high-risk entity.

Return a JSON object:
{
  "company_name": string,
  "sources": [
    {
      "title": string,
      "url": string,
      "snippet": string,
      "sourceDomain": string
    }
  ]
}
Return ONLY valid JSON.`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim();
      if (!text) return [];

      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.sources)) {
        return parsed.sources.slice(0, maxResults).map((s: any) => ({
          title: s.title || query,
          url: s.url || `https://${s.sourceDomain || 'verified.org'}`,
          snippet: s.snippet || '',
          sourceDomain: s.sourceDomain || (s.url ? new URL(s.url).hostname.replace(/^www\./, '') : 'enterprise'),
          engine: 'gemini-knowledge',
        }));
      }

      return [];
    } catch (err: any) {
      console.warn(`[GeminiKnowledgeProvider] Notice: ${err?.message}`);
      return [];
    }
  }
}
