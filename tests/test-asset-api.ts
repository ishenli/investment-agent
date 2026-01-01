async function testAssetAPI() {
  const baseUrl = 'http://localhost:3000/api/asset';

  try {
    // Test creating a trading account
    console.log('Testing POST /account...');
    const createResponse = await fetch(`${baseUrl}/account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '1',
        initialDeposit: 5000,
        accountName: 'API测试账户',
        market: '美股',
        leverage: 1,
      }),
    });

    const createResult = await createResponse.json();
    console.log('Create account response:', createResult);

    if (!createResponse.ok) {
      console.error('Failed to create account');
      return;
    }

    const accountId = createResult.data.id;
    console.log('Created account ID:', accountId);

    // Test getting account details
    console.log('\nTesting GET /account...');
    const getResponse = await fetch(`${baseUrl}/account?accountId=${accountId}`);
    const getResult = await getResponse.json();
    console.log('Get account response:', getResult);

    // Test getting account balance
    console.log('\nTesting GET /account/[accountId]/balance...');
    const balanceResponse = await fetch(`${baseUrl}/account/${accountId}/balance`);
    const balanceResult = await balanceResponse.json();
    console.log('Get balance response:', balanceResult);

    // Test getting transaction history
    console.log('\nTesting GET /account/[accountId]/transactions...');
    const transactionsResponse = await fetch(`${baseUrl}/account/${accountId}/transactions`);
    const transactionsResult = await transactionsResponse.json();
    console.log('Get transactions response:', transactionsResult);

    // Test getting current positions
    console.log('\nTesting GET /account/[accountId]/positions...');
    const positionsResponse = await fetch(`${baseUrl}/account/${accountId}/positions`);
    const positionsResult = await positionsResponse.json();
    console.log('Get positions response:', positionsResult);

    // Test getting revenue metrics
    console.log('\nTesting GET /account/[accountId]/revenue...');
    const revenueResponse = await fetch(`${baseUrl}/account/${accountId}/revenue`);
    const revenueResult = await revenueResponse.json();
    console.log('Get revenue response:', revenueResult);

    console.log('\nAll API tests completed successfully!');
  } catch (error) {
    console.error('API test failed:', error);
  }
}

testAssetAPI();
