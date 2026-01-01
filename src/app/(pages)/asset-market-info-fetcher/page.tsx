import { CombinedStepperMarketFetcher } from './components/market-fetcher';

export default function MarketFetcherV2Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="grid gap-6">
        <CombinedStepperMarketFetcher />
      </div>
    </div>
  );
}
