import { stockHkFamousSpotEM, stockHkSpotEm } from '@server/dataflows/akshare';
import { TencentHKQuote } from '@/server/dataflows/tencentUtil';
import accountService from '@server/service/accountService';

async function testInitAPI() {
  try {
    console.log('Testing getAllAccounts...');
    const accounts = await accountService.getAllAccounts();
    console.log('All accounts:', accounts);

    // 如果没有账户，创建一个测试账户
    if (accounts.length === 0) {
      console.log('Creating a test account...');
      const createRequest = {
        userId: '1',
        initialDeposit: 10000,
        accountName: '测试美股账户',
        market: '美股' as const,
        leverage: 2,
      };

      const createdAccount = await accountService.createTradingAccount(createRequest as any);
      console.log('Created account:', createdAccount);
    }

    // 再次获取所有账户
    const updatedAccounts = await accountService.getAllAccounts();
    console.log('Updated accounts:', updatedAccounts);

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }

  const data = await stockHkFamousSpotEM();
  const data1 = await stockHkSpotEm();
  // fs.outputJson('xiaomi.json', data);
  // fs.outputJson('data1.json', data1);
  // console.log('Stock HK Famous Spot EM:', data);

  // 测试HKQuote数据
  const hkQuote = new TencentHKQuote();
  const hkQuoteData = await hkQuote.getStockData(['01810']);
  console.log('HK Quote Data:', hkQuoteData);

}

testInitAPI();
