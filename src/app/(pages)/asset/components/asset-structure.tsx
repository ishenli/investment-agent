import { ConcentrationChart } from './ConcentrationChart';
import { AllocationChart } from './AllocationChart';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { useRiskDataQuery } from '@renderer/hooks/usePositionQueries';
import { Card, CardContent } from '@renderer/components/ui/card';

export function AssetStructure() {
  // 使用React Query获取数据
  const {
    data: riskData,
    isLoading: isRiskDataLoading,
    isError: isRiskDataError,
  } = useRiskDataQuery();
  // 准备图表数据
  const concentrationData =
    riskData?.concentrationData?.topAssets?.map((asset: any) => ({
      name: asset.symbol,
      value: asset.weight,
    })) || [];

  const allocationChartData =
    riskData?.allocationData.categoryAllocation?.map((category: any) => ({
      category: category.category,
      allocation: category.weight,
    })) || [];
  // 如果获取风险数据失败
  if (isRiskDataError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">风险洞察</h1>
          <p className="text-muted-foreground">实时风险洞察和投资组合分析</p>
        </div>
        <Card>
          <CardContent>
            <div className="text-center py-8 text-red-500">
              <div className="h-12 w-12 mx-auto mb-4 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-lg font-medium">加载风险数据时出错</p>
              <p className="mt-2">请稍后重试</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <>
    {/* Charts */}
    < div className="grid gap-6 md:grid-cols-2" >
      {
        isRiskDataLoading ? (
          <Card>
            <CardContent className="">
              <Skeleton className="h-64 w-full rounded" />
            </CardContent>
          </Card >
        ) : (
          <ConcentrationChart data={concentrationData} />
        )
      }

      {
        isRiskDataLoading ? (
          <Card>
            <CardContent className="">
              <Skeleton className="h-64 w-full rounded" />
            </CardContent>
          </Card>
        ) : (
          <AllocationChart data={allocationChartData} />
        )
      }
    </div >
  </>;
}