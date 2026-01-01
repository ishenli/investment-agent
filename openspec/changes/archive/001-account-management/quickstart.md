# Quickstart Guide: Account Management

## Overview

The Account Management feature provides users with virtual trading accounts for
practicing investment strategies without real financial risk. This guide will
help you get started with creating an account, configuring settings, managing
funds, and tracking revenue.

## Prerequisites

- Basic understanding of stock trading concepts
- Access to the investment platform
- Web browser (Chrome, Firefox, Safari, or Edge)

## Getting Started

### 1. Create an Account

To begin, you'll need to create a virtual trading account:

1. Navigate to the Account Creation page
2. Fill in the required information:
   - Username (3-30 characters)
   - Email address
   - Password (minimum 8 characters)
   - Initial deposit amount (virtual funds)
3. Select your preferred market (A股 or 美股)
4. Choose your leverage setting (1-100x)
5. Click "Create Account"

Your account will be created with the specified initial deposit, and you'll be
redirected to your account dashboard.

### 2. Configure Account Settings

After creating your account, you can adjust your trading preferences:

1. Go to Account Settings
2. Modify your market selection (A股 or 美股)
3. Adjust your leverage setting
4. Save your changes

Note: Changing markets may affect available stocks and trading rules.

### 3. Manage Virtual Funds

Track and manage your virtual funds through the Fund Management section:

1. View your current balance on the dashboard
2. Deposit additional virtual funds:
   - Click "Deposit Funds"
   - Enter the amount
   - Confirm the transaction
3. View transaction history:
   - All deposits, withdrawals, and trades are recorded
   - Transactions are sorted by date (newest first)

### 4. Monitor revenue

Track your trading revenue through the revenue Analytics dashboard:

1. View key metrics:
   - Total return percentage
   - Annualized return
   - Win rate
   - Sharpe ratio
   - Maximum drawdown
2. Analyze revenue over different time periods (7 days, 30 days, 1 year)
3. Review detailed trade history and profit/loss calculations

## Key Features

### Virtual Trading Account

- Start with virtual funds (no real money required)
- Practice trading strategies risk-free
- Experience realistic market conditions

### Market Selection

- Choose between A股 (Chinese A-shares) and 美股 (US stocks)
- Access to real-time market data for selected market
- Market-specific trading rules and regulations

### Leverage Trading

- Adjust leverage from 1x to 100x
- Amplify potential gains (and losses)
- Practice risk management with different leverage levels

### revenue Tracking

- Comprehensive revenue metrics
- Detailed trade history
- Visual charts and graphs
- Comparative analysis tools

## Best Practices

### Risk Management

1. Start with lower leverage settings (1x-5x)
2. Diversify your portfolio across multiple stocks
3. Set stop-loss orders to limit potential losses
4. Regularly review your revenue metrics

### Learning Approach

1. Begin with small virtual investments
2. Experiment with different strategies in various market conditions
3. Use revenue analytics to identify successful patterns
4. Gradually increase complexity as you gain experience

### Account Security

1. Use a strong, unique password
2. Enable two-factor authentication if available
3. Regularly review account activity
4. Log out of shared computers

## Troubleshooting

### Common Issues

**Unable to Create Account**

- Check that your email address is valid
- Ensure your password meets the minimum requirements
- Verify that your username is unique

**Incorrect Balance Display**

- Refresh the page to update balance information
- Check transaction history for recent activities
- Contact support if discrepancy persists

**revenue Metrics Not Updating**

- revenue metrics update periodically
- Ensure you have completed at least one trade
- Check that your account is active

### Support

If you encounter issues not covered in this guide:

1. Check the FAQ section
2. Contact customer support through the Help Center
3. Provide detailed information about the issue, including:
   - Steps to reproduce
   - Error messages received
   - Browser and device information

## Next Steps

After familiarizing yourself with the basic account features:

1. Explore the AI-powered investment assistant
2. Try different trading strategies with virtual funds
3. Participate in community discussions
4. Review educational resources to improve your trading skills

## API Integration

For developers interested in building custom tools:

1. All account operations are available through REST API
2. API documentation can be found in
   `/specs/001-account-management/contracts/account-api.yaml`
3. Authentication is required for all API calls
4. Rate limits apply to prevent abuse

Example API call to get account balance:

```bash
curl -X GET /api/account/{accountId}/balance \
  -H "Authorization: Bearer {access_token}"
```

## Glossary

- **Leverage**: Borrowed capital to increase potential returns (and risks)
- **Virtual Funds**: Simulated money for practice trading
- **revenue Metrics**: Statistical measures of trading success
- **Positions**: Current holdings of stocks in your portfolio
- **Transactions**: Records of all account activities (deposits, withdrawals,
  trades)
