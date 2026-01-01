import assetMarketInfoService from '../src/server/service/assetMarketInfoService';

/**
 * 测试 assetMarketInfoService 的查询功能
 * 使用理想汽车(LI)作为测试案例
 */
async function testAssetMarketInfoQuery() {
  console.log('开始测试 assetMarketInfoService 查询功能...');
  console.log('使用理想汽车(LI)作为测试案例');
  
  try {
    // 1. 测试 getLatestAssetMarketInfoBySymbol 方法
    console.log('\n1. 测试 getLatestAssetMarketInfoBySymbol 方法...');
    const marketInfoBySymbol = await assetMarketInfoService.getLatestAssetMarketInfoBySymbol('LI');
    
    if (marketInfoBySymbol) {
      console.log('✓ 通过 symbol "LI" 成功获取 marketInfo');
      console.log('  ID:', marketInfoBySymbol.id);
      console.log('  标题:', marketInfoBySymbol.title);
      console.log('  Symbol:', marketInfoBySymbol.symbol);
      console.log('  关联的 assetMeta IDs:', marketInfoBySymbol.assetMetaIds);
      console.log('  投资倾向:', marketInfoBySymbol.sentiment);
      console.log('  重要性:', marketInfoBySymbol.importance);
    } else {
      console.log('ℹ 未找到 symbol 为 "LI" 的 marketInfo');
    }
    
    // 2. 如果有获取到数据，测试 getLatestAssetMarketInfoByAssetMetaId 方法
    if (marketInfoBySymbol && marketInfoBySymbol.assetMetaIds.length > 0) {
      console.log('\n2. 测试 getLatestAssetMarketInfoByAssetMetaId 方法...');
      const firstAssetMetaId = marketInfoBySymbol.assetMetaIds[0];
      const marketInfoByAssetMetaId = await assetMarketInfoService.getLatestAssetMarketInfoByAssetMetaId(firstAssetMetaId);
      
      if (marketInfoByAssetMetaId) {
        console.log('✓ 通过 assetMetaId 成功获取 marketInfo');
        console.log('  ID:', marketInfoByAssetMetaId.id);
        console.log('  标题:', marketInfoByAssetMetaId.title);
        console.log('  Symbol:', marketInfoByAssetMetaId.symbol);
        console.log('  关联的 assetMeta IDs:', marketInfoByAssetMetaId.assetMetaIds);
      } else {
        console.log('ℹ 未找到 assetMetaId 为', firstAssetMetaId, '的 marketInfo');
      }
    }
    
    // 3. 测试 getLatestAssetMarketInfos 方法
    console.log('\n3. 测试 getLatestAssetMarketInfos 方法...');
    const latestMarketInfos = await assetMarketInfoService.getLatestAssetMarketInfos(5);
    console.log('获取到最新的', latestMarketInfos.length, '条 marketInfo 记录');
    
    // 显示前几条记录的信息
    for (let i = 0; i < Math.min(3, latestMarketInfos.length); i++) {
      const info = latestMarketInfos[i];
      console.log(`  记录 ${i + 1}:`);
      console.log('    ID:', info.id);
      console.log('    标题:', info.title);
      console.log('    Symbol:', info.symbol);
      console.log('    关联的 assetMeta IDs 数量:', info.assetMetaIds.length);
      if (info.assetMetaIds.length > 0) {
        console.log('    关联的 assetMeta IDs:', info.assetMetaIds);
      }
    }
    
    // 4. 测试 getAssetMarketInfosByDateRange 方法
    console.log('\n4. 测试 getAssetMarketInfosByDateRange 方法...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // 最近7天
    
    const dateRangeMarketInfos = await assetMarketInfoService.getAssetMarketInfosByDateRange(startDate, endDate, 5);
    console.log('获取到时间范围内的', dateRangeMarketInfos.length, '条 marketInfo 记录');
    
    // 显示前几条记录的信息
    for (let i = 0; i < Math.min(3, dateRangeMarketInfos.length); i++) {
      const info = dateRangeMarketInfos[i];
      console.log(`  记录 ${i + 1}:`);
      console.log('    ID:', info.id);
      console.log('    标题:', info.title);
      console.log('    Symbol:', info.symbol);
      console.log('    关联的 assetMeta IDs 数量:', info.assetMetaIds.length);
      if (info.assetMetaIds.length > 0) {
        console.log('    关联的 assetMeta IDs:', info.assetMetaIds);
      }
    }
    
    console.log('\n测试完成！');
    
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 运行测试
testAssetMarketInfoQuery().then(() => {
  console.log('测试结束');
}).catch((error) => {
  console.error('测试失败:', error);
});