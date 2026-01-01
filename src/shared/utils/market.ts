export const marketToChinese = (market: string | undefined) => {
  switch (market) {
    case 'US':
      return '美国';
    case 'HK':
      return '香港';
    case 'SH':
      return '上海';
    case 'SZ':
      return '深圳';
    default:
      return '未知';
  }
};
