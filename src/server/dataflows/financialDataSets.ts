import axios, { AxiosResponse } from 'axios';
import { getCache } from '../utils/cache';

// Global cache instance
const _cache = getCache();

// ============== Type Definitions ==============
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

// ============== API Request Helper ==============
async function _makeApiRequest({
  url,
  headers,
  method = 'GET',
  data,
  maxRetries = 3,
}: ApiRequestOptions): Promise<AxiosResponse> {
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

// ============== Exported Functions ==============
export async function getFinancialMetrics(
  ticker: string,
  endDate: string,
  period: string = 'ttm',
  limit: number = 10,
  apiKey?: string,
): Promise<FinancialMetrics[]> {
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

  const metricsResponse: FinancialMetricsResponse = response.data;
  const financialMetrics = metricsResponse.financial_metrics;

  if (!financialMetrics || financialMetrics.length === 0) {
    return [];
  }

  // Cache the results
  _cache.setFinancialMetrics(ticker, financialMetrics);
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

  return searchResults.slice(0, limit);
}

export async function getMarketCap(
  ticker: string,
  endDate: string,
  apiKey?: string,
): Promise<number | null> {
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

  return financialMetrics[0].market_cap || null;
}
