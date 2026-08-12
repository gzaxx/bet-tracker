export interface Profile {
  id: number
  name: string
  defaultCurrency: string
  createdAt: string
  updatedAt: string
}

export interface Portfolio {
  id: number
  profileId: number
  name: string
  currency: string
  createdAt: string
  updatedAt: string
}

export interface CreateProfileRequest {
  name: string
  defaultCurrency: string
}

export interface UpdateProfileRequest {
  name: string
  defaultCurrency: string
}

export interface CreatePortfolioRequest {
  profileId: number
  name: string
}

export interface UpdatePortfolioRequest {
  name: string
}

export enum TradeType {
  Buy = 0,
  Sell = 1
}

export interface Trade {
  id: number
  portfolioId: number
  ticker: string
  tradeType: TradeType
  shares: number
  price: number
  commission: number
  executedAt: string
  notes: string | null
  isin: string | null
  currency: string
}

export interface CreateTradeRequest {
  portfolioId: number
  ticker: string
  tradeType: TradeType
  shares: number
  price: number
  commission: number
  executedAt: string
  currency: string
  notes: string | null
  isin: string | null
}

export interface UpdateTradeRequest {
  ticker: string
  tradeType: TradeType
  shares: number
  price: number
  commission: number
  executedAt: string
  currency: string
  notes: string | null
  isin: string | null
}

export interface PriceObservation {
  id: number
  ticker: string
  currency: string
  price: number
  effectiveAt: string
  createdAt: string
  source: string
  providerSymbol: string | null
}

export interface CreatePriceObservationRequest {
  ticker: string
  currency: string
  price: number
  effectiveAt: string
  source: string
  providerSymbol: string | null
}

export type UpdatePriceObservationRequest = Omit<CreatePriceObservationRequest, 'source'> & {
  source: string
}

export interface HoldingSummary {
  ticker: string
  shares: number
  averageCost: number
  costBasis: number
  currentPrice: number | null
  currentValue: number | null
  unrealizedProfitLoss: number | null
}

export interface PortfolioSummary {
  portfolioId: number
  currency: string
  totalCostBasis: number
  totalMarketValue: number
  realizedProfitLoss: number
  unrealizedProfitLoss: number
  missingPriceTickers: string[]
  holdings: HoldingSummary[]
}

export interface ETF {
  id: number
  ticker: string
  name: string | null
  exchange: string | null
  isin: string | null
  currency: string | null
  expenseRatio: number | null
  createdAt: string
}

export interface CreateETFRequest {
  ticker: string
  name: string | null
  exchange: string | null
  isin: string | null
  currency: string | null
  expenseRatio: number | null
}

export type UpdateETFRequest = CreateETFRequest
