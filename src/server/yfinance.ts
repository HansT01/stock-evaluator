'use server'

import { getEnv } from './env'
import { convertCurrency } from './exchange-rate'
import { CurrencyCode } from './exchange-rate-types'
import { FinancialStatementType, TimeSeriesInterval } from './yfinance-statement-types'

export const fetchYFinanceCookie = async () => {
  const res = await fetch(getEnv().COOKIE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    },
  })
  const cookie = res.headers.getSetCookie()[0]
  return cookie
}

export const fetchYFinanceCrumb = async (cookie: string) => {
  const res = await fetch(getEnv().CRUMB_URL, {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    },
  })
  if (!res.ok) {
    throw new Error(`fetchYFinanceCrumb; Status: ${res.status}; Body: ${await res.text()}`)
  }
  const crumb = await res.text()
  return crumb
}

const fetchTimeSeries = async (ticker: string) => {
  const period1 = Date.now() / 1000 - 6 * 365 * 24 * 60 * 60
  const period2 = Date.now() / 1000
  const types: FinancialStatementType[] = [
    'annualTotalRevenue',
    'annualNetIncome',
    'annualCashDividendsPaid',
    'annualPreferredStockDividends',
    'annualFreeCashFlow',
    'annualOrdinarySharesNumber',
    'annualTotalDebt',
    'annualCashAndCashEquivalents',
    'annualOtherShortTermInvestments',
    'annualTotalLiabilitiesNetMinorityInterest',
    'annualMinorityInterest',
    'annualPreferredStock',
    'quarterlyOrdinarySharesNumber',
    'quarterlyTotalDebt',
    'quarterlyCashAndCashEquivalents',
    'quarterlyOtherShortTermInvestments',
    'quarterlyTotalLiabilitiesNetMinorityInterest',
    'quarterlyMinorityInterest',
    'quarterlyPreferredStock',
    'quarterlyPreferredStockDividends',
  ]

  const url =
    `${getEnv().TIMESERIES_URL}/${ticker}?` +
    new URLSearchParams({
      'type': types.join(','),
      'period1': Math.floor(period1).toString(),
      'period2': Math.floor(period2).toString(),
    })
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    },
  })
  if (!res.ok) {
    throw new Error(`fetchTimeSeries; Status: ${res.status}; Body: ${await res.text()}`)
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

const fetchQuoteSummary = async (ticker: string, cookie?: string, crumb?: string) => {
  const modules = ['financialData', 'quoteType', 'defaultKeyStatistics', 'assetProfile', 'summaryDetail'] as const

  cookie ??= await fetchYFinanceCookie()
  crumb ??= await fetchYFinanceCrumb(cookie)
  const url =
    `${getEnv().QUOTESUMMARY_URL}/${ticker}?` +
    new URLSearchParams({
      'modules': modules.join(','),
      'formatted': 'false',
      'crumb': crumb,
    })
  const res = await fetch(url, {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    },
  })
  if (!res.ok) {
    throw new Error(`fetchQuoteSummary; Status: ${res.status}; Body: ${await res.text()}`)
  }
  const raw = await res.json()

  const summaries: { [module in (typeof modules)[number]]: any } = raw.quoteSummary.result[0]
  const parsed = {
    ticker: summaries['quoteType']['symbol'] as string,
    name: summaries['quoteType']['longName'] as string,
    summary: summaries['assetProfile']['longBusinessSummary'] as string,
    industry: summaries['assetProfile']['industry'] as string,
    website: summaries['assetProfile']['website'] as string,
    sharePrice: summaries['financialData']['currentPrice'] as number,
    currency: summaries['summaryDetail']['currency'] as CurrencyCode,
    financialCurrency: summaries['financialData']['financialCurrency'] as CurrencyCode,
  }
  return parsed
}

export interface YFinanceData {
  ticker: string
  name: string
  summary: string
  industry: string
  website: string
  sharePrice: number
  currency: CurrencyCode
  financialCurrency: CurrencyCode
  marketCap: number
  enterpriseValue: number
  adjustedEnterpriseValue: number
  fiscalYearEnds: string[]
  revenues: (number | null)[]
  earnings: (number | null)[]
  dividends: (number | null)[]
  freeCashFlows: (number | null)[]
}

export const fetchYFinanceData = async (ticker: string, cookie?: string, crumb?: string) => {
  const [timeSeries, quoteSummary] = await Promise.all([
    fetchTimeSeries(ticker),
    fetchQuoteSummary(ticker, cookie, crumb),
  ])
  const dates = Object.keys(timeSeries).sort()
  const fiscalYearEnds = dates.filter((date) => timeSeries[date].annualTotalRevenue !== undefined)

  const recentQuarter = timeSeries[dates[dates.length - 1]]
  const recentYearEnd = timeSeries[fiscalYearEnds[fiscalYearEnds.length - 1]]

  const convertedSharePrice = await convertCurrency(
    quoteSummary.sharePrice,
    quoteSummary.currency,
    quoteSummary.financialCurrency,
  )

  const marketCap =
    convertedSharePrice *
    (recentQuarter.quarterlyOrdinarySharesNumber ?? recentYearEnd.annualOrdinarySharesNumber ?? NaN)

  const enterpriseValue =
    marketCap +
    (recentQuarter.quarterlyTotalDebt ?? recentYearEnd.annualTotalDebt ?? 0) +
    (recentQuarter.quarterlyPreferredStock ?? recentYearEnd.annualPreferredStock ?? 0) +
    (recentQuarter.quarterlyMinorityInterest ?? recentYearEnd.annualMinorityInterest ?? 0) -
    (recentQuarter.quarterlyCashAndCashEquivalents ?? recentYearEnd.annualCashAndCashEquivalents ?? 0)

  const adjustedEnterpriseValue =
    marketCap +
    (recentQuarter.quarterlyTotalLiabilitiesNetMinorityInterest ??
      recentYearEnd.annualTotalLiabilitiesNetMinorityInterest ??
      0) +
    (recentQuarter.quarterlyPreferredStock ?? recentYearEnd.annualPreferredStock ?? 0) +
    (recentQuarter.quarterlyMinorityInterest ?? recentYearEnd.annualMinorityInterest ?? 0) -
    (recentQuarter.quarterlyCashAndCashEquivalents ?? recentYearEnd.annualCashAndCashEquivalents ?? 0) -
    (recentQuarter.quarterlyOtherShortTermInvestments ?? recentYearEnd.annualOtherShortTermInvestments ?? 0)

  const revenues = fiscalYearEnds.map((year) => timeSeries[year].annualTotalRevenue ?? null)
  const earnings = fiscalYearEnds.map((year) => timeSeries[year].annualNetIncome ?? null)
  const dividends = fiscalYearEnds.map((year) => {
    let cashDividends = timeSeries[year].annualCashDividendsPaid
    if (cashDividends === undefined) {
      return null
    }
    const preferredDividends = Math.abs(timeSeries[year].annualPreferredStockDividends ?? 0)
    const commonDividends = Math.abs(cashDividends) - preferredDividends
    return commonDividends
  })
  const freeCashFlows = fiscalYearEnds.map((year) => timeSeries[year].annualFreeCashFlow ?? null)

  const data: YFinanceData = {
    ...quoteSummary,
    marketCap,
    enterpriseValue,
    adjustedEnterpriseValue,
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

export const fetchYFinanceQuotes = async (query: string) => {
  const url =
    `${getEnv().QUOTES_URL}?` +
    new URLSearchParams({
      'q': query,
      'lang': 'en-US',
      'region': 'US',
      'enableFuzzyQuery': 'false',
      'quotesCount': '10',
      'newsCount': '0',
      'listsCount': '0',
    })
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    },
  })
  if (!res.ok) {
    throw new Error(`fetchYFinanceQuotes; Status: ${res.status}; Body: ${await res.text()}`)
  }
  const raw = await res.json()

  const { quotes } = raw as { quotes: YFinanceQuote[] }
  return quotes.filter((quote) => quote.quoteType === 'EQUITY' && quote.industry !== undefined).slice(0, 5)
}

export interface PriceHistory {
  ticker: string
  currency: string
  timestamps: number[]
  prices: number[]
}

export const fetchPriceHistory = async (
  ticker: string,
  startTimestamp: number,
  endTimestamp: number,
  interval: TimeSeriesInterval = '1d',
  cookie?: string,
  crumb?: string,
) => {
  cookie ??= await fetchYFinanceCookie()
  crumb ??= await fetchYFinanceCrumb(cookie)
  const url =
    `${getEnv().PRICEHISTORY_URL}?` +
    new URLSearchParams({
      'period1': startTimestamp.toString(),
      'period2': endTimestamp.toString(),
      'interval': interval,
      'includePrePost': 'False',
      'events': 'div%2Csplits%2CcapitalGains',
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

  const parsed = {
    ticker: raw.chart.result[0].meta.symbol as string,
    currency: raw.chart.result[0].meta.currency as string,
    timestamps: raw.chart.result[0].timestamp as number[],
    prices: raw.chart.result[0].indicators.quote[0].close as number[],
  }
  return parsed
}
