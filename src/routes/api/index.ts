import { APIEvent } from '@solidjs/start/server'
import { fetchYFinanceCookie, fetchYFinanceCrumb, fetchYFinanceData } from '~/server/yfinance'
import { calculateDCF, fitExponential } from '~/utils/calculate'

export const GET = async (props: APIEvent) => {
  const params = new URLSearchParams(props.request.url.split('?')[1])
  const tickers = (params.get('tickers') ?? '').split(',').filter((ticker) => ticker !== '')
  const discountRate = parseFloat(params.get('discountRate') ?? '0.15')
  const growingYears = parseFloat(params.get('growingYears') ?? '4')
  const terminalGrowth = parseFloat(params.get('terminalGrowth') ?? '0.02')

  const cookie = await fetchYFinanceCookie()
  const crumb = await fetchYFinanceCrumb(cookie)

  const getValueRating = async (ticker: string) => {
    const data = await fetchYFinanceData(ticker, cookie, crumb)
    const baseFCF =
      data.freeCashFlows.reduce<number>((acc, val) => (val !== null ? acc + val : acc), 0) /
      data.freeCashFlows.filter((val) => val !== null).length

    const years = data.fiscalYearEnds.map((date) => date.getUTCFullYear())
    const { base } = fitExponential(years, data.revenues)
    const growth = base - 1
    const dividendYield =
      data.dividends.reduce<number>((acc, val) => acc + (val ?? 0), 0) /
      data.dividends.length /
      data.adjustedEnterpriseValue
    const projectedGrowth = growth + dividendYield

    const intrinsicValue = calculateDCF(baseFCF, discountRate, growingYears, projectedGrowth, terminalGrowth)
    const valueRating = intrinsicValue / data.adjustedEnterpriseValue
    return {
      ...data,
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
