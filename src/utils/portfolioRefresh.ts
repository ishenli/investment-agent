// 简化的投资组合数据刷新工具
// 这个文件保留为未来扩展使用，目前核心刷新功能已集成在 refresh-button.tsx 中

export interface RefreshResult {
  success: boolean;
  totalTime: number;
  refreshedItems: string[];
}

/**
 * 刷新投资组合数据
 * @param queryClient TanStack Query 客户端实例
 * @returns 刷新结果
 */
export async function refreshPortfolioData(queryClient: any): Promise<RefreshResult> {
  const startTime = Date.now();
  const refreshedItems: string[] = [];

  try {
    // 并行刷新多个查询缓存
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['positions'] }),
      queryClient.invalidateQueries({ queryKey: ['account'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
    ]);

    refreshedItems.push('positions', 'account', 'summary', 'assets');
  } catch (error) {
    console.error('刷新投资组合数据失败:', error);
  }

  return {
    success: refreshedItems.length > 0,
    totalTime: Date.now() - startTime,
    refreshedItems,
  };
}