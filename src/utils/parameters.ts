export interface Parameters {
  discountRate: number
  growingYears: number
  terminalGrowth: number
  customGrowth: number
  growthIndicator: 'revenues' | 'earnings' | 'dividends' | 'freeCashFlows' | 'custom'
  investmentOption: 'enterpriseValue' | 'marketCap'
  includeDividends: boolean
}

export const defaultParameters: Parameters = {
  discountRate: 0.15,
  growingYears: 4,
  terminalGrowth: 0.02,
  customGrowth: 0,
  growthIndicator: 'revenues',
  investmentOption: 'enterpriseValue',
  includeDividends: true,
}
