import { AssetMarketInfoDetail } from './asset-market-info-detail';

export default async function AssetMarketInfoDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return (
    <div className="container mx-auto p-8">
      <AssetMarketInfoDetail marketInfoId={parseInt(id)} />
    </div>
  );
}
