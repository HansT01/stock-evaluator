import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { Show, createSignal, onMount } from 'solid-js'
import { PortfolioChart } from '~/components/charts/portfolio'
import { PriceHistory, fetchPriceHistory } from '~/rpc/yfinance'

dayjs.extend(utc)

const adjustRelativePerformance = (base: number[], target: number[]) => {
  const baseRatio = base[0] / target[0]
  return target.map((price, i) => (price * baseRatio) / base[i])
}

const alignHistory = (base: PriceHistory, target: PriceHistory) => {
  const result: PriceHistory = {
    ticker: target.ticker,
    currency: target.currency,
    timestamps: base.timestamps,
    prices: new Array(base.timestamps.length),
  }
  let i = 0
  let j = 0
  while (i < base.timestamps.length && j < target.timestamps.length) {
    if (base.timestamps[i] > target.timestamps[j]) {
      j++
      continue
    }
    result.prices[i] = target.prices[j]
    i++
  }
  result.timestamps.length = i
  result.prices.length = i
  return result
}

const Portfolio = () => {
  const [data, setData] = createSignal<PriceHistory[] | null>(null)

  const handleButton = async () => {
    console.log('sending rpc request')
    const start = dayjs('2024-03-18').unix()
    const end = dayjs().unix()
    const base = await fetchPriceHistory('^AXJO', start, end)
    // const base = await fetchPriceHistory('^GSPC', start, end)
    const tickers = ['CNI.AX', 'GNC.AX', 'PLS.AX', 'PRU.AX', 'SMR.AX', 'SSR.AX', 'WHC.AX', 'YAL.AX']
    const resolution = await Promise.all(tickers.map((ticker) => fetchPriceHistory(ticker, start, end)))
    setData(
      resolution.map((res) => {
        return { ...res, prices: adjustRelativePerformance(base.prices, res.prices) }
      }),
    )
  }

  onMount(() => {
    handleButton()
  })

  return (
    <main class='container mx-auto flex min-h-svh max-w-screen-lg flex-col gap-8 bg-accent p-4 text-accent-fg sm:p-8'>
      <div class='flex flex-wrap justify-center gap-4'>
        <button onClick={handleButton} class='rounded-lg bg-primary px-4 py-2 text-primary-fg'>
          Press me
        </button>
      </div>
      <div class='min-h-[400px] w-full rounded-lg border border-primary bg-background px-4 py-2 text-background-fg'>
        <Show when={data()}>{(data) => <PortfolioChart data={data()} />}</Show>
      </div>
    </main>
  )
}

export default Portfolio
