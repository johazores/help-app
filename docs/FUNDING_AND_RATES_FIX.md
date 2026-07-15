# Funding and Currency Reliability

## Add Funds

Fresh test deployments now default to XLM because Stellar Friendbot can always fund XLM. USDC remains supported when a valid funded treasury account is configured.

During database synchronization and again before an instant test top-up, Sagip checks whether a configured USDC treasury actually exists. Incomplete testnet configuration is repaired to XLM instead of attempting an impossible USDC payment.

The Add Funds screen no longer depends on the currency-rates endpoint. Users can still receive funds, copy their address, view the QR code, and request a test top-up when rate providers are unavailable.

## Currency estimates

Currency estimates use multiple providers:

1. ExchangeRate-API for USD-to-fiat reference rates.
2. Frankfurter as a fiat fallback.
3. CoinGecko for XLM-to-USD market pricing.
4. Coinbase as an XLM price fallback.

Rates are cached, stale values remain available during temporary provider outages, and the UI displays source attribution and an estimate-only warning.

## User access

The converter remains on Add Funds and is also available as a dedicated Family Tool at `/home/tools/converter` for tuition, monthly support, gifts, and emergency planning.