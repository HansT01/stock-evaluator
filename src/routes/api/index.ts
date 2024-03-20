import { APIEvent } from '@solidjs/start/server'
import dayjs from 'dayjs'
import { fetchYFinanceCookie, fetchYFinanceCrumb, fetchYFinanceData } from '~/rpc/yfinance'
import { calculateDCF, fitExponential } from '~/utils/calculate'
import { defaultParameters } from '..'

export const GET = async (props: APIEvent) => {
  const params = new URLSearchParams(props.request.url.split('?')[1])
  const tickers = (params.get('tickers') ?? '').split(',').filter((ticker) => ticker !== '')
  const discountRate = parseFloat(params.get('discountRate') ?? defaultParameters.discountRate.toString())
  const growingYears = parseFloat(params.get('growingYears') ?? defaultParameters.growingYears.toString())
  const terminalGrowth = parseFloat(params.get('terminalGrowth') ?? defaultParameters.terminalGrowth.toString())

  const cookie = await fetchYFinanceCookie()
  const crumb = await fetchYFinanceCrumb(cookie)

  const getValueRating = async (ticker: string) => {
    const data = await fetchYFinanceData(ticker, cookie, crumb)
    const baseFCF =
      data.freeCashFlows.reduce<number>((acc, val) => (val !== null ? acc + val : acc), 0) /
      data.freeCashFlows.filter((val) => val !== null).length

    const years = data.fiscalYearEnds.map((date) => dayjs(date).year())
    const { base } = fitExponential(years, data.revenues)
    const growth = base - 1
    const dividendYield =
      data.dividends.reduce<number>((acc, val) => acc + (val ?? 0), 0) / data.dividends.length / data.enterpriseValue
    const projectedGrowth = growth + dividendYield

    const intrinsicValue = calculateDCF(baseFCF, discountRate, growingYears, projectedGrowth, terminalGrowth)
    const valueRating = intrinsicValue / data.enterpriseValue
    return {
      ticker: ticker,
      currency: data.currency,
      sharePrice: data.sharePrice,
      marketCap: data.marketCap,
      enterpriseValue: data.enterpriseValue,
      valueRating: valueRating,
    }
  }

  const fulfilled: Awaited<ReturnType<typeof getValueRating>>[] = []
  const rejected: any[] = []
  const results = await Promise.allSettled(tickers.map((ticker) => getValueRating(ticker)))
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      fulfilled.push(result.value)
    }
    if (result.status === 'rejected') {
      rejected.push({
        ticker: tickers[i],
        message: result.reason.message,
      })
    }
  })

  props.response.status = 200
  const response = {
    discountRate,
    growingYears,
    terminalGrowth,
    fulfilled,
    rejected,
  }
  return response
}
