import axios, { AxiosResponse } from 'axios';
import { getCache } from '../utils/cache';

// Global cache instance
const _cache = getCache();

// Define interfaces for API response types
interface Price {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  time: string;
}

interface PriceResponse {
  prices: Price[];
}

interface FinancialMetrics {
  ticker: string;
  report_period: string;
  period: string;
  currency: string;
  market_cap?: number;
  enterprise_value?: number;
  price_to_earnings_ratio?: number;
  price_to_book_ratio?: number;
  price_to_sales_ratio?: number;
  enterprise_value_to_ebitda_ratio?: number;
  enterprise_value_to_revenue_ratio?: number;
  free_cash_flow_yield?: number;
  peg_ratio?: number;
  gross_margin?: number;
  operating_margin?: number;
  net_margin?: number;
  return_on_equity?: number;
  return_on_assets?: number;
  return_on_invested_capital?: number;
  asset_turnover?: number;
  inventory_turnover?: number;
  receivables_turnover?: number;
  days_sales_outstanding?: number;
  operating_cycle?: number;
  working_capital_turnover?: number;
  current_ratio?: number;
  quick_ratio?: number;
  cash_ratio?: number;
  operating_cash_flow_ratio?: number;
  debt_to_equity?: number;
  debt_to_assets?: number;
  interest_coverage?: number;
  revenue_growth?: number;
  earnings_growth?: number;
  book_value_growth?: number;
  earnings_per_share_growth?: number;
  free_cash_flow_growth?: number;
  operating_income_growth?: number;
  ebitda_growth?: number;
  payout_ratio?: number;
  earnings_per_share?: number;
  book_value_per_share?: number;
  free_cash_flow_per_share?: number;
}

interface FinancialMetricsResponse {
  financial_metrics: FinancialMetrics[];
}

interface LineItem {
  ticker: string;
  report_period: string;
  period: string;
  currency: string;
  [key: string]: string | number | undefined;
}

interface LineItemResponse {
  search_results: LineItem[];
}

interface InsiderTrade {
  ticker: string;
  issuer: string;
  name: string;
  title: string;
  is_board_director: boolean;
  transaction_date: string;
  transaction_shares: number;
  transaction_price_per_share: number;
  transaction_value: number;
  shares_owned_before_transaction: number;
  shares_owned_after_transaction: number;
  security_title: string;
  filing_date: string;
}

interface InsiderTradeResponse {
  insider_trades: InsiderTrade[];
}

interface CompanyNews {
  ticker: string;
  title: string;
  author: string;
  source: string;
  date: string;
  url: string;
  sentiment: string;
}

interface CompanyNewsResponse {
  news: CompanyNews[];
}

interface CompanyFactsResponse {
  company_facts: {
    market_cap?: number;
    [key: string]: any;
  };
}

interface ApiRequestOptions {
  url: string;
  headers: Record<string, string>;
  method?: 'GET' | 'POST';
  data?: any;
  maxRetries?: number;
}

async function _makeApiRequest({
  url,
  headers,
  method = 'GET',
  data,
  maxRetries = 3,
}: ApiRequestOptions): Promise<AxiosResponse> {
  /**
   * Make an API request with rate limiting handling and moderate backoff.
   *
   * @param url - The URL to request
   * @param headers - Headers to include in the request
   * @param method - HTTP method (GET or POST)
   * @param data - JSON data for POST requests
   * @param maxRetries - Maximum number of retries (default: 3)
   * @returns The response object
   * @throws Error if the request fails with a non-429 error
   */
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios({
        url,
        headers,
        method,
        data,
        timeout: 30000,
      });

      if (response.status === 429 && attempt < maxRetries) {
        // Linear backoff: 60s, 90s, 120s, 150s...
        const delay = 60 + 30 * attempt;
        console.log(
          `Rate limited (429). Attempt ${attempt + 1}/${maxRetries + 1}. Waiting ${delay}s before retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        continue;
      }

      return response;
    } catch (error: any) {
      if (error.response?.status === 429 && attempt < maxRetries) {
        const delay = 60 + 30 * attempt;
        console.log(
          `Rate limited (429). Attempt ${attempt + 1}/${maxRetries + 1}. Waiting ${delay}s before retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function getPrices(
  ticker: string,
  startDate: string,
  endDate: string,
  apiKey?: string,
): Promise<Price[]> {
  /** Fetch price data from cache or API. */
  // Create a cache key that includes all parameters to ensure exact matches
  const cacheKey = `${ticker}_${startDate}_${endDate}`;

  // Check cache first - simple exact match
  const cachedData = _cache.getPrices(cacheKey);
  if (cachedData) {
    return cachedData.map((price) => ({
      open: price.open,
      close: price.close,
      high: price.high,
      low: price.low,
      volume: price.volume,
      time: price.time,
    }));
  }

  // If not in cache, fetch from API
  const headers: Record<string, string> = {};
  const financialApiKey = apiKey || process.env.FINANCIAL_DATASETS_API_KEY;
  if (financialApiKey) {
    headers['X-API-KEY'] = financialApiKey;
  }

  const url = `https://api.financialdatasets.ai/prices/?ticker=${ticker}&interval=day&interval_multiplier=1&start_date=${startDate}&end_date=${endDate}`;
  const response = await _makeApiRequest({ url, headers });

  if (response.status !== 200) {
    throw new Error(`Error fetching data: ${ticker} - ${response.status} - ${response.data}`);
  }

  // Parse response
  const priceResponse: PriceResponse = response.data;
  const prices = priceResponse.prices;

  if (!prices || prices.length === 0) {
    return [];
  }

  // Cache the results using the comprehensive cache key
  _cache.setPrices(cacheKey, prices);
  return prices;
}

export async function getFinancialMetrics(
  ticker: string,
  endDate: string,
  period: string = 'ttm',
  limit: number = 10,
  apiKey?: string,
): Promise<FinancialMetrics[]> {
  /** Fetch financial metrics from cache or API. */
  // Create a cache key that includes all parameters to ensure exact matches
  const cacheKey = `${ticker}_${period}_${endDate}_${limit}`;

  // Check cache first - simple exact match
  const cachedData = _cache.getFinancialMetrics(cacheKey);
  if (cachedData) {
    return cachedData.map((metric) => ({
      ticker: metric.ticker,
      report_period: metric.report_period,
      period: metric.period,
      currency: metric.currency,
      market_cap: metric.market_cap,
      enterprise_value: metric.enterprise_value,
      price_to_earnings_ratio: metric.price_to_earnings_ratio,
      price_to_book_ratio: metric.price_to_book_ratio,
      price_to_sales_ratio: metric.price_to_sales_ratio,
      enterprise_value_to_ebitda_ratio: metric.enterprise_value_to_ebitda_ratio,
      enterprise_value_to_revenue_ratio: metric.enterprise_value_to_revenue_ratio,
      free_cash_flow_yield: metric.free_cash_flow_yield,
      peg_ratio: metric.peg_ratio,
      gross_margin: metric.gross_margin,
      operating_margin: metric.operating_margin,
      net_margin: metric.net_margin,
      return_on_equity: metric.return_on_equity,
      return_on_assets: metric.return_on_assets,
      return_on_invested_capital: metric.return_on_invested_capital,
      asset_turnover: metric.asset_turnover,
      inventory_turnover: metric.inventory_turnover,
      receivables_turnover: metric.receivables_turnover,
      days_sales_outstanding: metric.days_sales_outstanding,
      operating_cycle: metric.operating_cycle,
      working_capital_turnover: metric.working_capital_turnover,
      current_ratio: metric.current_ratio,
      quick_ratio: metric.quick_ratio,
      cash_ratio: metric.cash_ratio,
      operating_cash_flow_ratio: metric.operating_cash_flow_ratio,
      debt_to_equity: metric.debt_to_equity,
      debt_to_assets: metric.debt_to_assets,
      interest_coverage: metric.interest_coverage,
      revenue_growth: metric.revenue_growth,
      earnings_growth: metric.earnings_growth,
      book_value_growth: metric.book_value_growth,
      earnings_per_share_growth: metric.earnings_per_share_growth,
      free_cash_flow_growth: metric.free_cash_flow_growth,
      operating_income_growth: metric.operating_income_growth,
      ebitda_growth: metric.ebitda_growth,
      payout_ratio: metric.payout_ratio,
      earnings_per_share: metric.earnings_per_share,
      book_value_per_share: metric.book_value_per_share,
      free_cash_flow_per_share: metric.free_cash_flow_per_share,
    }));
  }

  // If not in cache, fetch from API
  const headers: Record<string, string> = {};
  const financialApiKey = apiKey || process.env.FINANCIAL_DATASETS_API_KEY;
  if (financialApiKey) {
    headers['X-API-KEY'] = financialApiKey;
  }

  const url = `https://api.financialdatasets.ai/financial-metrics/?ticker=${ticker}&report_period_lte=${endDate}&limit=${limit}&period=${period}`;
  const response = await _makeApiRequest({ url, headers });

  if (response.status !== 200) {
    throw new Error(`Error fetching data: ${ticker} - ${response.status} - ${response.data}`);
  }

  // Parse response
  const metricsResponse: FinancialMetricsResponse = response.data;
  const financialMetrics = metricsResponse.financial_metrics;

  if (!financialMetrics || financialMetrics.length === 0) {
    return [];
  }

  // Cache the results as dicts using the comprehensive cache key
  _cache.setFinancialMetrics(cacheKey, financialMetrics);
  return financialMetrics;
}

export async function searchLineItems(
  ticker: string,
  lineItems: string[],
  endDate: string,
  period: string = 'ttm',
  limit: number = 10,
  apiKey?: string,
): Promise<LineItem[]> {
  /** Fetch line items from API. */
  // If not in cache or insufficient data, fetch from API
  const headers: Record<string, string> = {};
  const financialApiKey = apiKey || process.env.FINANCIAL_DATASETS_API_KEY;
  if (financialApiKey) {
    headers['X-API-KEY'] = financialApiKey;
  }

  const url = 'https://api.financialdatasets.ai/financials/search/line-items';

  const body = {
    tickers: [ticker],
    line_items: lineItems,
    end_date: endDate,
    period: period,
    limit: limit,
  };

  const response = await _makeApiRequest({
    url,
    headers,
    method: 'POST',
    data: body,
  });

  if (response.status !== 200) {
    throw new Error(`Error fetching data: ${ticker} - ${response.status} - ${response.data}`);
  }

  const data = response.data;
  const responseModel: LineItemResponse = data;
  const searchResults = responseModel.search_results;

  if (!searchResults || searchResults.length === 0) {
    return [];
  }

  // Cache the results
  return searchResults.slice(0, limit);
}

export async function getInsiderTrades(
  ticker: string,
  endDate: string,
  startDate?: string,
  limit: number = 1000,
  apiKey?: string,
): Promise<InsiderTrade[]> {
  /** Fetch insider trades from cache or API. */
  // Create a cache key that includes all parameters to ensure exact matches
  const cacheKey = `${ticker}_${startDate || 'none'}_${endDate}_${limit}`;

  // Check cache first - simple exact match
  const cachedData = _cache.getInsiderTrades(cacheKey);
  if (cachedData) {
    return cachedData.map((trade) => ({
      ticker: trade.ticker,
      issuer: trade.issuer,
      name: trade.name,
      title: trade.title,
      is_board_director: trade.is_board_director,
      transaction_date: trade.transaction_date,
      transaction_shares: trade.transaction_shares,
      transaction_price_per_share: trade.transaction_price_per_share,
      transaction_value: trade.transaction_value,
      shares_owned_before_transaction: trade.shares_owned_before_transaction,
      shares_owned_after_transaction: trade.shares_owned_after_transaction,
      security_title: trade.security_title,
      filing_date: trade.filing_date,
    }));
  }

  // If not in cache, fetch from API
  const headers: Record<string, string> = {};
  const financialApiKey = apiKey || process.env.FINANCIAL_DATASETS_API_KEY;
  if (financialApiKey) {
    headers['X-API-KEY'] = financialApiKey;
  }

  const allTrades: InsiderTrade[] = [];
  let currentEndDate = endDate;

  while (true) {
    let url = `https://api.financialdatasets.ai/insider-trades/?ticker=${ticker}&filing_date_lte=${currentEndDate}`;
    if (startDate) {
      url += `&filing_date_gte=${startDate}`;
    }
    url += `&limit=${limit}`;

    const response = await _makeApiRequest({ url, headers });

    if (response.status !== 200) {
      throw new Error(`Error fetching data: ${ticker} - ${response.status} - ${response.data}`);
    }

    const data = response.data;
    const responseModel: InsiderTradeResponse = data;
    const insiderTrades = responseModel.insider_trades;

    if (!insiderTrades || insiderTrades.length === 0) {
      break;
    }

    allTrades.push(...insiderTrades);

    // Only continue pagination if we have a startDate and got a full page
    if (!startDate || insiderTrades.length < limit) {
      break;
    }

    // Update endDate to the oldest filing date from current batch for next iteration
    currentEndDate = new Date(
      Math.min(...insiderTrades.map((trade: InsiderTrade) => new Date(trade.filing_date).getTime())),
    )
      .toISOString()
      .split('T')[0];

    // If we've reached or passed the startDate, we can stop
    if (currentEndDate <= startDate) {
      break;
    }
  }

  if (allTrades.length === 0) {
    return [];
  }

  // Cache the results using the comprehensive cache key
  _cache.setInsiderTrades(cacheKey, allTrades);
  return allTrades;
}

export async function getCompanyNews(
  ticker: string,
  endDate: string,
  startDate?: string,
  limit: number = 1000,
  apiKey?: string,
): Promise<CompanyNews[]> {
  /** Fetch company news from cache or API. */
  // Create a cache key that includes all parameters to ensure exact matches
  const cacheKey = `${ticker}_${startDate || 'none'}_${endDate}_${limit}`;

  // Check cache first - simple exact match
  const cachedData = _cache.getCompanyNews(cacheKey);
  if (cachedData) {
    return cachedData.map((news) => ({
      ticker: news.ticker,
      title: news.title,
      author: news.author,
      source: news.source,
      date: news.date,
      url: news.url,
      sentiment: news.sentiment,
    }));
  }

  // If not in cache, fetch from API
  const headers: Record<string, string> = {};
  const financialApiKey = apiKey || process.env.FINANCIAL_DATASETS_API_KEY;
  if (financialApiKey) {
    headers['X-API-KEY'] = financialApiKey;
  }

  const allNews: CompanyNews[] = [];
  let currentEndDate = endDate;

  while (true) {
    let url = `https://api.financialdatasets.ai/news/?ticker=${ticker}&end_date=${currentEndDate}`;
    if (startDate) {
      url += `&start_date=${startDate}`;
    }
    url += `&limit=${limit}`;

    const response = await _makeApiRequest({ url, headers });

    if (response.status !== 200) {
      throw new Error(`Error fetching data: ${ticker} - ${response.status} - ${response.data}`);
    }

    const data = response.data;
    const responseModel: CompanyNewsResponse = data;
    const companyNews = responseModel.news;

    if (!companyNews || companyNews.length === 0) {
      break;
    }

    allNews.push(...companyNews);

    // Only continue pagination if we have a startDate and got a full page
    if (!startDate || companyNews.length < limit) {
      break;
    }

    // Update endDate to the oldest date from current batch for next iteration
    currentEndDate = new Date(Math.min(...companyNews.map((news: CompanyNews) => new Date(news.date).getTime())))
      .toISOString()
      .split('T')[0];

    // If we've reached or passed the startDate, we can stop
    if (currentEndDate <= startDate) {
      break;
    }
  }

  if (allNews.length === 0) {
    return [];
  }

  // Cache the results using the comprehensive cache key
  _cache.setCompanyNews(cacheKey, allNews);
  return allNews;
}

export async function getMarketCap(
  ticker: string,
  endDate: string,
  apiKey?: string,
): Promise<number | null> {
  /** Fetch market cap from the API. */
  // Check if endDate is today
  const today = new Date().toISOString().split('T')[0];
  if (endDate === today) {
    // Get the market cap from company facts API
    const headers: Record<string, string> = {};
    const financialApiKey = apiKey || process.env.FINANCIAL_DATASETS_API_KEY;
    if (financialApiKey) {
      headers['X-API-KEY'] = financialApiKey;
    }

    const url = `https://api.financialdatasets.ai/company/facts/?ticker=${ticker}`;
    const response = await _makeApiRequest({ url, headers });

    if (response.status !== 200) {
      console.log(`Error fetching company facts: ${ticker} - ${response.status}`);
      return null;
    }

    const data = response.data;
    const responseModel: CompanyFactsResponse = data;
    return responseModel.company_facts.market_cap || null;
  }

  const financialMetrics = await getFinancialMetrics(ticker, endDate, 'ttm', 1, apiKey);
  if (!financialMetrics || financialMetrics.length === 0) {
    return null;
  }

  const marketCap = financialMetrics[0].market_cap;

  if (!marketCap) {
    return null;
  }

  return marketCap;
}
