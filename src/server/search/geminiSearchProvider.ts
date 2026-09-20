import { GoogleGenAI } from '@google/genai';
import { ISearchProvider, RawSearchResult } from './types.js';

export class GeminiSearchProvider implements ISearchProvider {
  public name = 'Gemini Google Search Grounding';
  private ai: GoogleGenAI | null = null;
  private disabledUntil = 0;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.ai) && Date.now() > this.disabledUntil;
  }

  public async search(query: string): Promise<RawSearchResult[]> {
    if (!this.ai || Date.now() <= this.disabledUntil) return [];

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Provide public information about this employer query: "${query}". Identify their official corporate website URL, LinkedIn URL, and any reviews or news.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const results: RawSearchResult[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

      if (chunks && Array.isArray(chunks)) {
        for (const chunk of chunks) {
          if (chunk.web?.uri) {
            let domain = '';
            try {
              domain = new URL(chunk.web.uri).hostname.replace(/^www\./, '');
            } catch {
              domain = '';
            }

            results.push({
              title: chunk.web.title || '',
              url: chunk.web.uri,
              snippet: response.text?.slice(0, 300) || '',
              sourceDomain: domain,
              engine: 'gemini-grounding',
            });
          }
        }
      }

      return results;
    } catch (err: any) {
      // 429 rate limit or quota is handled gracefully with 2-minute cooldown
      console.warn(`[GeminiSearchProvider] Notice: ${err?.status || err?.message}. Cooling down for 2 mins.`);
      this.disabledUntil = Date.now() + 120000;
      return [];
    }
  }
}
