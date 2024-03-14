export interface YFinanceData {
  name: string
  summary: string
  industry: string
  currency: string
  sharePrice: number
  marketCap: number
  enterpriseValue: number
  fiscalYearEnds: string[]
  revenues: (number | null)[]
  earnings: (number | null)[]
  dividends: (number | null)[]
  freeCashFlows: (number | null)[]
}

export const getYFinanceData = async (ticker: string) => {
  'use server'
  const url =
    `${process.env.VITE_YFINANCE_APP_URL}?` +
    new URLSearchParams({
      'ticker': ticker,
    })
  const response = await fetch(url)
  if (response.status !== 200) {
    throw new Error(`Server responded with status code: ${response.status}`)
  }
  const data: YFinanceData = await response.json()
  return data
}

export interface YFinanceQuote {
  shortname: string
  longname: string
  industry: string
  industryDisp: string
  exchange: string
  exchDisp: string
  symbol: string
}

export const getYFinanceQuotes = async (search: string) => {
  'use server'
  const url =
    `${process.env.VITE_YFINANCE_QUOTE_URL}?` +
    new URLSearchParams({
      'q': search,
      'lang': 'en-US',
      'region': 'US',
      'enableFuzzyQuery': 'false',
      'quotesCount': '5',
      'newsCount': '0',
      'listsCount': '0',
    })
  const response = await fetch(url)
  if (response.status !== 200) {
    throw new Error(`Server responded with status code: ${response.status}`)
  }
  const { quotes } = await response.json()
  return quotes as YFinanceQuote[]
}
