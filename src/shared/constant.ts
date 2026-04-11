/**
 * 默认汇率（作为后备值）
 * 当数据库中没有用户设置时使用这些值
 */
export const DEFAULT_EXCHANGE_RATES = {
  HKD_TO_USD: 0.13,
  CNY_TO_USD: 0.14,
};

/**
 * @deprecated 请使用动态汇率服务获取汇率
 * 保留此常量仅用于向后兼容
 */
export const EXCHANGE_RATES = DEFAULT_EXCHANGE_RATES;

export const CURRENCY_SYMBOLS = {
  US: '$',
  HK: 'HK$',
  CN: '¥',
};


// 定义汇率常量（USD 到 HKD 和 CNY）
export const USD_TO_HKD = 7.83;
export const USD_TO_CNY = 6.89;