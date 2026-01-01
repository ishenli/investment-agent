export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/search', label: 'Search' },
  // { href: '/watchlist', label: 'Watchlist' },
];

// Sign-up form select options
export const INVESTMENT_GOALS = [
  { value: 'Growth', label: 'Growth' },
  { value: 'Income', label: 'Income' },
  { value: 'Balanced', label: 'Balanced' },
  { value: 'Conservative', label: 'Conservative' },
];

// TradingView Charts
export const MARKET_OVERVIEW_WIDGET_CONFIG = {
  colorTheme: 'light', // light mode
  dateRange: '12M', // last 12 months
  locale: 'en', // language
  largeChartUrl: '', // link to a large chart if needed
  isTransparent: true, // makes background transparent
  showFloatingTooltip: true, // show tooltip on hover
  plotLineColorGrowing: '#0FEDBE', // line color when price goes up
  plotLineColorFalling: '#0FEDBE', // line color when price falls
  gridLineColor: 'rgba(240, 243, 250, 0)', // grid line color
  scaleFontColor: '#434343', // font color for scale (darker for light theme)
  belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)', // fill under line when growing
  belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)', // fill under line when falling
  belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
  belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
  symbolActiveColor: 'rgba(15, 237, 190, 0.05)', // highlight color for active symbol
  tabs: [
    {
      title: 'Financial',
      symbols: [
        { s: 'NYSE:JPM', d: 'JPMorgan Chase' },
        { s: 'NYSE:WFC', d: 'Wells Fargo Co New' },
        { s: 'NYSE:BAC', d: 'Bank Amer Corp' },
        { s: 'NYSE:HSBC', d: 'Hsbc Hldgs Plc' },
        { s: 'NYSE:C', d: 'Citigroup Inc' },
        { s: 'NYSE:MA', d: 'Mastercard Incorporated' },
      ],
    },
    {
      title: 'Technology',
      symbols: [
        { s: 'NASDAQ:AAPL', d: 'Apple' },
        { s: 'NASDAQ:GOOGL', d: 'Alphabet' },
        { s: 'NASDAQ:MSFT', d: 'Microsoft' },
        { s: 'NASDAQ:META', d: 'Meta Platforms' },
        { s: 'NYSE:ORCL', d: 'Oracle Corp' },
        { s: 'NASDAQ:INTC', d: 'Intel Corp' },
      ],
    },
    {
      title: 'Services',
      symbols: [
        { s: 'NASDAQ:AMZN', d: 'Amazon' },
        { s: 'NYSE:BABA', d: 'Alibaba Group Hldg Ltd' },
        { s: 'NYSE:T', d: 'At&t Inc' },
        { s: 'NYSE:WMT', d: 'Walmart' },
        { s: 'NYSE:V', d: 'Visa' },
      ],
    },
  ],
  support_host: 'https://www.tradingview.com', // TradingView host
  backgroundColor: '#ffffff', // background color (white)
  width: '100%', // full width
  height: 600, // height in px
  showSymbolLogo: true, // show logo next to symbols
  showChart: true, // display mini chart
};

export const TOP_STORIES_WIDGET_CONFIG = {
  displayMode: 'regular',
  feedMode: 'market',
  colorTheme: 'light', // changed from 'dark' to 'light'
  isTransparent: true,
  locale: 'en',
  market: 'stock',
  width: '100%',
  height: '600',
};
