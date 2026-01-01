import { finnhubClient } from '@server/dataflows/finnhubUtil';

finnhubClient.companyEpsEstimates('AAPL', {}, (error, data, response) => {
  console.log(data);
});
