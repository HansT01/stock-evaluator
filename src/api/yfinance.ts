import { FinancialStatementType } from './yfinance-types'

const getCookie = async () => {
  const res = await fetch('https://fc.yahoo.com')
  const cookie = res.headers.getSetCookie()[0]
  return cookie
}

const getCrumb = async (cookie: string) => {
  const res = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'Cookie': cookie,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36',
    },
  })
  if (!res.ok) {
    throw new Error(`Status code: ${res.status}; Error: ${await res.text()}`)
  }
  const crumb = await res.text()
  return crumb
}

const getCookieAndCrumb = async () => {
  const cookie = await getCookie()
  const crumb = await getCrumb(cookie)
  return [cookie, crumb]
}

const getTimeSeries = async (ticker: string) => {
  const period1 = Date.now() / 1000 - 6 * 365 * 24 * 60 * 60
  const period2 = Date.now() / 1000
  const types: FinancialStatementType[] = [
    'annualTotalDebt',
    'annualCashAndCashEquivalents',
    'annualTotalRevenue',
    'annualNetIncome',
    'annualCashDividendsPaid',
    'annualFreeCashFlow',
  ] as const

  const url =
    `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${ticker}?` +
    new URLSearchParams({
      'symbol': ticker,
      'type': types.join(','),
      'period1': Math.floor(period1).toString(),
      'period2': Math.floor(period2).toString(),
    })
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Status code: ${res.status}; Error: ${await res.text()}`)
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

const getQuoteSummary = async (ticker: string) => {
  const modules = ['financialData', 'quoteType', 'assetProfile', 'summaryDetail'] as const

  const [cookie, crumb] = await getCookieAndCrumb()
  console.log(cookie, crumb)
  const url =
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?` +
    new URLSearchParams({
      'symbol': ticker,
      'modules': modules.join(','),
      'corsDomain': 'finance.yahoo.com',
      'formatted': 'false',
      'crumb': crumb,
    })
  console.log(url)
  const res = await fetch(url, {
    headers: {
      'Cookie': cookie,
    },
  })
  if (!res.ok) {
    throw new Error(`Status code: ${res.status}; Error: ${await res.text()}`)
  }
  const raw = await res.json()

  const summaries: { [module in (typeof modules)[number]]: any } = raw.quoteSummary.result[0]
  const parsed = {
    name: summaries['quoteType']['longName'] as string,
    summary: summaries['assetProfile']['longBusinessSummary'] as string,
    industry: summaries['assetProfile']['industry'] as string,
    currency: summaries['financialData']['financialCurrency'] as string,
    sharePrice: summaries['financialData']['currentPrice'] as number,
    marketCap: summaries['summaryDetail']['marketCap'] as number,
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

export const getYFinanceData = async (ticker: string) => {
  'use server'
  const [timeSeries, quoteSummary] = await Promise.all([getTimeSeries(ticker), getQuoteSummary(ticker)])
  const fiscalYearEnds = Object.keys(timeSeries).sort()

  const recentYearEnd = timeSeries[fiscalYearEnds[fiscalYearEnds.length - 1]]
  const enterpriseValue =
    quoteSummary.marketCap + recentYearEnd.annualTotalDebt! + recentYearEnd.annualCashAndCashEquivalents!

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
    throw new Error(`Status code: ${res.status}; Error: ${await res.text()}`)
  }
  const raw = await res.json()

  const { quotes } = raw as { quotes: YFinanceQuote[] }
  return quotes.filter((quote) => quote.quoteType === 'EQUITY').slice(0, 5)
}
