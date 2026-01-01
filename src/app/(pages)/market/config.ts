export const HEATMAP_WIDGET_CONFIG = {
  dataSource: 'SPX500',
  blockSize: 'market_cap_basic',
  blockColor: 'change',
  grouping: 'sector',
  isTransparent: true,
  locale: 'en',
  symbolUrl: '',
  colorTheme: 'light', // changed from 'dark' to 'light'
  exchanges: [],
  hasTopBar: false,
  isDataSetEnabled: false,
  isZoomEnabled: true,
  hasSymbolTooltip: true,
  isMonoSize: false,
  width: '100%',
  height: '600',
};

export const MARKET_DATA_WIDGET_CONFIG = {
  title: 'Stocks',
  width: '100%',
  height: 600,
  locale: 'en',
  showSymbolLogo: true,
  colorTheme: 'light', // changed from 'dark' to 'light'
  isTransparent: false,
  backgroundColor: '#ffffff', // changed from '#0F0F0F' to white
  symbolsGroups: [
    {
      name: 'Technology',
      symbols: [
        { name: 'NASDAQ:MSFT', displayName: 'Microsoft' },
        { name: 'NASDAQ:AAPL', displayName: 'Apple' },
        { name: 'NASDAQ:AMZN', displayName: 'Amazon' },
        { name: 'NASDAQ:GOOGL', displayName: 'Alphabet' },
        { name: 'NASDAQ:META', displayName: 'Meta Platforms' },
        { name: 'NASDAQ:TSLA', displayName: 'Tesla Corp' },
        { name: 'NYSE:ORCL', displayName: 'Oracle Corp' },
        { name: 'NASDAQ:AMD', displayName: 'AMD Corp' },
        { name: 'NASDAQ:INTC', displayName: 'Intel Corp' },
      ],
    },
    {
      name: 'China',
      symbols: [
        { name: 'NYSE:BABA', displayName: 'Alibaba' },
        { name: 'NASDAQ:PDD', displayName: 'Pinduoduo' },
        { name: 'NASDAQ:BIDU', displayName: 'Baidu' },
        // { name: 'HKEX:3690', displayName: 'Meituan' },
      ],
    },
    {
      name: 'Services',
      symbols: [
        { name: 'NASDAQ:AMZN', displayName: 'Amazon' },
        { name: 'NYSE:BABA', displayName: 'Alibaba Group Hldg Ltd' },
        { name: 'NYSE:T', displayName: 'At&t Inc' },
        { name: 'NYSE:WMT', displayName: 'Walmart' },
        { name: 'NYSE:V', displayName: 'Visa' },
      ],
    },
    {
      name: 'Financial',
      symbols: [
        { name: 'NYSE:JPM', displayName: 'JPMorgan Chase' },
        { name: 'NYSE:WFC', displayName: 'Wells Fargo Co New' },
        { name: 'NYSE:BAC', displayName: 'Bank Amer Corp' },
        { name: 'NYSE:HSBC', displayName: 'Hsbc Hldgs Plc' },
        { name: 'NYSE:C', displayName: 'Citigroup Inc' },
        { name: 'NYSE:MA', displayName: 'Mastercard Incorporated' },
      ],
    },
  ],
};
