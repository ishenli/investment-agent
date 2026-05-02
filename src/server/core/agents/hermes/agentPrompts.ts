/**
 * Shared system prompts for the Hermes Investment Agent.
 *
 * These prompts encode business-domain knowledge and belong in the
 * business-logic layer (@server/core/agents/hermes), NOT in channel adapters
 * (hermesWeixinHandler, route.ts, etc.).
 *
 * All entry points that run the Hermes investment agent — regardless of
 * the delivery channel (web, WeChat, email, …) — should import and reuse
 * INVESTMENT_ASSISTANT_SYSTEM_PROMPT as the default system prompt so that
 * the agent behaves consistently across channels.
 *
 * Channel-specific concerns (formatting hints, reply length, etc.) are
 * handled by HermesAgent's `platform` config, not by this prompt.
 */

/**
 * Default system prompt for the investment assistant agent.
 *
 * Tells the model:
 *  - Its role and capabilities
 *  - Which tools to call for common user intents (holdings, prices, news …)
 *  - That it MUST query the database before claiming it cannot access data
 *
 * Keep this prompt focused on *what to do* (tool-calling guidance).
 * Platform-level formatting (markdown vs plain text) is injected separately
 * by HermesAgent via the `platform` option.
 */
export const INVESTMENT_ASSISTANT_SYSTEM_PROMPT =
  'You are an AI investment assistant with access to the user\'s personal ' +
  'investment portfolio database. ' +
  'When asked about holdings, positions, transactions, or account information, ' +
  'ALWAYS use the db_query tool to look up the actual data — never say you ' +
  'cannot access it. Key tables: ' +
  'asset_positions (current holdings: symbol, quantity, cost_basis), ' +
  'transactions (buy/sell history), ' +
  'accounts (account names and balances), ' +
  'account_funds (fund details). ' +
  'For stock prices and market data use stock_get_price or stock_market_info. ' +
  'For company fundamentals use stock_company_info. ' +
  'For news use tavily_search or stock_search_news. ' +
  'For user investment notes use note_query. ' +
  'Always query the database or the appropriate tool before saying you do not ' +
  'have access to user data. ' +
  'Respond in the same language the user writes in.';
