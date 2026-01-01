import axios from 'axios';

export interface StockHKFamousRow {
  id: number;
  code: string;
  name: string;
  latestPrice: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  volume: number | null;
  turnover: number | null;
}

/**
 * 东方财富网-行情中心-港股市场-知名港股
 * 返回与 Python 版本相同的列集合（数组形式，每项为 StockHKFamousRow）
 */
export async function stockHkFamousSpotEM(): Promise<StockHKFamousRow[]> {
  const url = 'https://69.push2.eastmoney.com/api/qt/clist/get';
  const params = {
    pn: '1',
    pz: '100000',
    po: '1',
    np: '2',
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: '2',
    invt: '2',
    dect: '1',
    wbp2u: '|0|0|0|web',
    fid: 'f3',
    fs: 'b:DLMK0106',
    fields:
      'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152',
  };

  const res = await axios.get(url, { params });
  const data = res.data;

  if (!data || !data.data || !data.data.diff) {
    return [];
  }

  const items: any[] = data.data.diff;

  // console.log(items);

  // 辅助：兼容 items 中每一项为对象（{f2:..., f3:...}）或数组（[...]）的情况
  const getField = (item: any, fnum: number) => {
    if (Array.isArray(item)) {
      // 如果是数组，fields 列表里 f1 对应索引 0，因此 fnum-1
      return item[fnum - 1];
    }
    const key = `f${fnum}`;
    return item[key];
  };

  const toNumber = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // 根据实际返回的数据结构，我们使用以下 f 字段映射：
  // f2 -> 最新价, f3 -> 涨跌幅, f4 -> 涨跌额, f5 -> 成交量, f6 -> 成交额
  // f12 -> 代码, f14 -> 名称, f16 -> 最高, f17 -> 最低, f18 -> 今开, f20 -> 昨收
  const rows: StockHKFamousRow[] = Object.values(items).map((it: any, idx: number) => {
    const code = String(getField(it, 12) ?? getField(it, 13) ?? '') || '';
    const name = String(getField(it, 14) ?? getField(it, 15) ?? '') || '';

    return {
      id: idx + 1,
      code: code,
      name: name,
      latestPrice: toNumber(getField(it, 2)),
      changeAmount: toNumber(getField(it, 4)),
      changePercent: toNumber(getField(it, 3)),
      open: toNumber(getField(it, 18)),
      high: toNumber(getField(it, 16)),
      low: toNumber(getField(it, 17)),
      previousClose: toNumber(getField(it, 20)),
      volume: toNumber(getField(it, 5)),
      turnover: toNumber(getField(it, 6)),
    };
  });

  return rows;
}

/**
 * 东方财富网-港股-实时行情
 * https://quote.eastmoney.com/center/gridlist.html#hk_stocks
 * @returns 港股-实时行情
 */
export async function stockHkSpotEm(): Promise<StockHKFamousRow[]> {
  const url = 'https://72.push2.eastmoney.com/api/qt/clist/get';
  const params = {
    pn: '1',
    pz: '100',
    po: '1',
    np: '1',
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: '2',
    invt: '2',
    fid: 'f12',
    fs: 'm:128 t:3,m:128 t:4,m:128 t:1,m:128 t:2',
    fields:
      'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152',
  };

  try {
    const res = await axios.get(url, { params });
    const data = res.data;

    if (!data || !data.data || !data.data.diff) {
      return [];
    }

    const items: any[] = data.data.diff;

    // 辅助：兼容 items 中每一项为对象（{f2:..., f3:...}）或数组（[...]）的情况
    const getField = (item: any, fnum: number) => {
      if (Array.isArray(item)) {
        // 如果是数组，fields 列表里 f1 对应索引 0，因此 fnum-1
        return item[fnum - 1];
      }
      const key = `f${fnum}`;
      return item[key];
    };

    const toNumber = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    // 根据字段映射关系提取数据
    // f1 -> 序号(忽略), f2 -> 最新价, f3 -> 涨跌幅, f4 -> 涨跌额, f5 -> 成交量, f6 -> 成交额
    // f12 -> 代码, f14 -> 名称, f16 -> 最高, f17 -> 最低, f18 -> 今开, f20 -> 昨收
    const rows: StockHKFamousRow[] = Object.values(items).map((it: any, idx: number) => {
      const code = String(getField(it, 12) ?? '') || '';
      const name = String(getField(it, 14) ?? '') || '';

      return {
        id: idx + 1,
        code: code,
        name: name,
        latestPrice: toNumber(getField(it, 2)),
        changeAmount: toNumber(getField(it, 4)),
        changePercent: toNumber(getField(it, 3)),
        open: toNumber(getField(it, 18)),
        high: toNumber(getField(it, 16)),
        low: toNumber(getField(it, 17)),
        previousClose: toNumber(getField(it, 20)),
        volume: toNumber(getField(it, 5)),
        turnover: toNumber(getField(it, 6)),
      };
    });

    return rows;
  } catch (error) {
    console.error('获取港股实时行情数据失败:', error);
    return [];
  }
}