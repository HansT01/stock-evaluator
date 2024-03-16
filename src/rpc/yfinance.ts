import { FinancialStatementType } from './yfinance.types'

export const getCookie = async () => {
  const res = await fetch('https://fc.yahoo.com')
  const cookie = res.headers.getSetCookie()[0]
  return cookie
}

export const getCrumb = async (cookie: string) => {
  const res = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'Cookie': cookie,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36',
    },
  })
  if (!res.ok) {
    throw new Error(`Status: ${res.status}; Body: ${await res.text()}`)
  }
  const crumb = await res.text()
  return crumb
}

const getTimeSeries = async (ticker: string) => {
  const period1 = Date.now() / 1000 - 6 * 365 * 24 * 60 * 60
  const period2 = Date.now() / 1000
  const types: FinancialStatementType[] = [
    'annualTotalRevenue',
    'annualNetIncome',
    'annualCashDividendsPaid',
    'annualFreeCashFlow',
    'quarterlyOrdinarySharesNumber',
    'quarterlyTotalDebt',
    'quarterlyCashAndCashEquivalents',
    'quarterlyOtherShortTermInvestments',
  ]

  const url =
    `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${ticker}?` +
    new URLSearchParams({
      'type': types.join(','),
      'period1': Math.floor(period1).toString(),
      'period2': Math.floor(period2).toString(),
    })
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Status: ${res.status}; Body: ${await res.text()}`)
  }
  const raw = await res.json()

  interface ParsedData {
    [date: string]: Partial<{
      [type in FinancialStatementType]: number
    }>
  }
  const parsed: ParsedData = {}

  for (let result of raw.timeseries.result) {
    for (let key in result) {
      if (key === 'meta' || key === 'timestamp') {
        continue
      }
      for (let entry of result[key]) {
        const date: string = entry['asOfDate']
        const value: number = entry['reportedValue']['raw']
        if (parsed[date] === undefined) {
          parsed[date] = {}
        }
        parsed[date][key as FinancialStatementType] = value
      }
    }
  }

  return parsed
}

const getQuoteSummary = async (ticker: string, cookie?: string, crumb?: string) => {
  const modules = ['financialData', 'quoteType', 'assetProfile'] as const

  cookie ??= await getCookie()
  crumb ??= await getCrumb(cookie)
  const url =
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?` +
    new URLSearchParams({
      'modules': modules.join(','),
      'formatted': 'false',
      'crumb': crumb,
    })
  const res = await fetch(url, {
    headers: {
      'Cookie': cookie,
    },
  })
  if (!res.ok) {
    throw new Error(`Status: ${res.status}; Body: ${await res.text()}`)
  }
  const raw = await res.json()

  const summaries: { [module in (typeof modules)[number]]: any } = raw.quoteSummary.result[0]
  const parsed = {
    name: summaries['quoteType']['longName'] as string,
    summary: summaries['assetProfile']['longBusinessSummary'] as string,
    industry: summaries['assetProfile']['industry'] as string,
    currency: summaries['financialData']['financialCurrency'] as string,
    sharePrice: summaries['financialData']['currentPrice'] as number,
  }

  return parsed
}

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

export const getYFinanceData = async (ticker: string, cookie?: string, crumb?: string) => {
  'use server'
  const [timeSeries, quoteSummary] = await Promise.all([getTimeSeries(ticker), getQuoteSummary(ticker, cookie, crumb)])
  const dates = Object.keys(timeSeries).sort()
  const fiscalYearEnds = dates.filter((date) => timeSeries[date].annualTotalRevenue !== undefined)
  const recentQuarter = timeSeries[dates[dates.length - 1]]

  const marketCap = quoteSummary.sharePrice * recentQuarter.quarterlyOrdinarySharesNumber!
  const enterpriseValue =
    marketCap +
    (recentQuarter.quarterlyTotalDebt ?? 0) -
    (recentQuarter.quarterlyCashAndCashEquivalents ?? 0) -
    (recentQuarter.quarterlyOtherShortTermInvestments ?? 0)

  const revenues = fiscalYearEnds.map((year) => timeSeries[year].annualTotalRevenue ?? null)
  const earnings = fiscalYearEnds.map((year) => timeSeries[year].annualNetIncome ?? null)
  const dividends = fiscalYearEnds.map((year) => {
    const dividends = timeSeries[year].annualCashDividendsPaid
    if (dividends === undefined) {
      return null
    }
    return -dividends
  })
  const freeCashFlows = fiscalYearEnds.map((year) => timeSeries[year].annualFreeCashFlow ?? null)

  const data: YFinanceData = {
    ...quoteSummary,
    marketCap,
    enterpriseValue,
    fiscalYearEnds,
    revenues,
    earnings,
    dividends,
    freeCashFlows,
  }
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
  quoteType: string
}

export const getYFinanceQuotes = async (query: string) => {
  'use server'
  const url =
    'https://query2.finance.yahoo.com/v1/finance/search?' +
    new URLSearchParams({
      'q': query,
      'lang': 'en-US',
      'region': 'US',
      'enableFuzzyQuery': 'false',
      'quotesCount': '10',
      'newsCount': '0',
      'listsCount': '0',
    })
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Status: ${res.status}; Body: ${await res.text()}`)
  }
  const raw = await res.json()

  const { quotes } = raw as { quotes: YFinanceQuote[] }
  return quotes.filter((quote) => quote.quoteType === 'EQUITY').slice(0, 5)
}
