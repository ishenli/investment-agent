import { db } from '@server/lib/db';
import { assetMeta, assetPriceHistory } from '@/drizzle/schema';
import finnhubService from '@server/service/finnhubService';
import { eq, and, gte } from 'drizzle-orm';

async function testHistorySync() {
  console.log('Starting History Sync Test...');

  const symbol = 'AAPL';
  // Use a known past date range to verify connectivity (e.g. 2023)
  // This avoids issues if the local system time (2025) is ahead of real world time.
  const endDate = new Date('2023-12-01');
  const startDate = new Date('2023-11-01');

  console.log(`Syncing data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

  // Mock getCandles to verify DB logic despite API failure
  finnhubService.getCandles = async (sym, res, from, to) => {
    console.log('Mock getCandles called');
    return {
      c: [150.0, 152.0, 151.0],
      h: [153.0, 154.0, 152.0],
      l: [149.0, 150.0, 148.0],
      o: [149.5, 151.0, 150.0],
      s: 'ok',
      t: [
        Math.floor(startDate.getTime() / 1000) + 3600, // +1 hour
        Math.floor(startDate.getTime() / 1000) + 86400 + 3600, // +1 day + 1 hour
        Math.floor(startDate.getTime() / 1000) + 172800 + 3600 // +2 days + 1 hour
      ],
      v: [1000, 2000, 1500]
    };
  };

  await finnhubService.syncHistoricalData(symbol, startDate, endDate, 'US');

  // Verify data in DB
  const records = await db.select().from(assetPriceHistory).where(
    and(
      eq(assetPriceHistory.symbol, symbol),
      gte(assetPriceHistory.date, startDate)
    )
  );

  console.log(`Found ${records.length} records for ${symbol} in the specified range.`);
  if (records.length > 0) {
    console.log('Sample record:', records[0]);
    console.log('Verification SUCCESS');
  } else {
    console.error('Verification FAILED: No records found.');
  }
}

testHistorySync().catch(console.error);
