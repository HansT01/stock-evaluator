import { APIEvent } from '@solidjs/start/server'
import dayjs from 'dayjs'
import { getCookie, getCrumb, getYFinanceData } from '~/rpc/yfinance'
import { calculateDCF, fitExponential } from '~/utils/calculate'

export const GET = async (props: APIEvent) => {
  const params = new URLSearchParams(props.request.url.split('?')[1])
  const tickers = (params.get('tickers') ?? '').split(',').filter((ticker) => ticker !== '')
  const discountRate = parseFloat(params.get('discountRate') ?? '0.2')
  const growingYears = parseFloat(params.get('growingYears') ?? '5')
  const terminalGrowth = parseFloat(params.get('terminalGrowth') ?? '0.0')

  const cookie = await getCookie()
  const crumb = await getCrumb(cookie)

  const getValueRating = async (ticker: string) => {
    const data = await getYFinanceData(ticker, cookie, crumb)
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
      currency: data.currency,
      sharePrice: data.sharePrice,
      marketCap: data.marketCap,
      enterpriseValue: data.enterpriseValue,
      valueRating: valueRating,
    }
  }

  const results = await Promise.allSettled(tickers.map((ticker) => getValueRating(ticker)))

  const valueRatings: { [ticker: string]: Awaited<ReturnType<typeof getValueRating>> } = {}
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      valueRatings[tickers[i]] = result.value
    }
  })
  return valueRatings
}
