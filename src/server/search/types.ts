export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceDomain: string;
  engine: string;
}

export interface ISearchProvider {
  name: string;
  isAvailable(): boolean;
  search(query: string, maxResults?: number): Promise<RawSearchResult[]>;
}
