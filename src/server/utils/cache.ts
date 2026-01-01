interface CacheData {
  [key: string]: any[];
}

export class Cache {
  private _pricesCache: CacheData = {};
  private _financialMetricsCache: CacheData = {};
  private _lineItemsCache: CacheData = {};
  private _insiderTradesCache: CacheData = {};
  private _companyNewsCache: CacheData = {};

  private _mergeData(existing: any[] | null | undefined, newData: any[], keyField: string): any[] {
    if (!existing) {
      return newData;
    }

    // Create a set of existing keys for O(1) lookup
    const existingKeys = new Set(existing.map((item) => item[keyField]));

    // Only add items that don't exist yet
    const merged = [...existing];
    merged.push(...newData.filter((item) => !existingKeys.has(item[keyField])));
    return merged;
  }

  getPrices(ticker: string): any[] | null {
    return this._pricesCache[ticker] || null;
  }

  setPrices(ticker: string, data: any[]): void {
    this._pricesCache[ticker] = this._mergeData(this._pricesCache[ticker], data, 'time');
  }

  getFinancialMetrics(ticker: string): any[] | null {
    return this._financialMetricsCache[ticker] || null;
  }

  setFinancialMetrics(ticker: string, data: any[]): void {
    this._financialMetricsCache[ticker] = this._mergeData(
      this._financialMetricsCache[ticker],
      data,
      'report_period',
    );
  }

  getLineItems(ticker: string): any[] | null {
    return this._lineItemsCache[ticker] || null;
  }

  setLineItems(ticker: string, data: any[]): void {
    this._lineItemsCache[ticker] = this._mergeData(
      this._lineItemsCache[ticker],
      data,
      'report_period',
    );
  }

  getInsiderTrades(ticker: string): any[] | null {
    return this._insiderTradesCache[ticker] || null;
  }

  setInsiderTrades(ticker: string, data: any[]): void {
    this._insiderTradesCache[ticker] = this._mergeData(
      this._insiderTradesCache[ticker],
      data,
      'filing_date',
    );
  }

  getCompanyNews(ticker: string): any[] | null {
    return this._companyNewsCache[ticker] || null;
  }

  setCompanyNews(ticker: string, data: any[]): void {
    this._companyNewsCache[ticker] = this._mergeData(this._companyNewsCache[ticker], data, 'date');
  }
}

// Global cache instance
let _cache: Cache | null = null;

export function getCache(): Cache {
  if (!_cache) {
    _cache = new Cache();
  }
  return _cache;
}
