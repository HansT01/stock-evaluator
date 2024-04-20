import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { For, Show, createSignal, onMount } from 'solid-js'
import { PortfolioChart } from '~/components/charts/portfolio'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/table'
import { PriceHistory, fetchPriceHistory } from '~/rpc/yfinance'
import { formatNum } from '~/utils/format'

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

interface Holding {
  ticker: string
  units: number
  history: PriceHistory | null
}

const defaultHoldings: Holding[] = [
  { ticker: 'CNI.AX', units: 1300, history: null },
  { ticker: 'GNC.AX', units: 250, history: null },
  { ticker: 'PLS.AX', units: 685, history: null },
  { ticker: 'PRU.AX', units: 1100, history: null },
  { ticker: 'SMR.AX', units: 750, history: null },
  { ticker: 'SSR.AX', units: 420, history: null },
  { ticker: 'WHC.AX', units: 360, history: null },
  { ticker: 'YAL.AX', units: 870, history: null },
]

const Portfolio = () => {
  const [holdings, setHoldings] = createSignal<Holding[]>(defaultHoldings)
  const [histories, setHistories] = createSignal<PriceHistory[] | null>(null)

  const getCurrentPrice = (history: PriceHistory | null) => {
    if (history === null || history.prices.length === 0) {
      return NaN
    }
    return history.prices[history.prices.length - 1]
  }

  const handleButton = async () => {
    console.log('sending rpc request')
    const start = dayjs('2024-03-18').unix()
    const end = dayjs().unix()
    const base = await fetchPriceHistory('^AXJO', start, end)
    // const base = await fetchPriceHistory('^GSPC', start, end)
    const resolution = await Promise.all(holdings().map((ticker) => fetchPriceHistory(ticker.ticker, start, end)))
    setHistories(
      resolution.map((res) => {
        return { ...res, prices: adjustRelativePerformance(base.prices, res.prices) }
      }),
    )
  }

  onMount(async () => {
    const start = dayjs('2024-03-18').unix()
    const end = dayjs().unix()
    handleButton()
    for (let holding of holdings()) {
      fetchPriceHistory(holding.ticker, start, end).then((history) =>
        setHoldings(
          holdings().map((h) => {
            return h === holding ? { ...h, history: history } : h
          }),
        ),
      )
    }
  })

  return (
    <main class='container mx-auto flex min-h-svh max-w-screen-lg flex-col gap-8 bg-accent p-4 text-accent-fg sm:p-8'>
      <div class='flex flex-wrap justify-center gap-4'>
        <button onClick={handleButton} class='rounded-lg bg-primary px-4 py-2 text-primary-fg'>
          Press me
        </button>
      </div>
      <div class='min-h-[400px] w-full rounded-lg border border-primary bg-background px-4 py-2 text-background-fg'>
        <Show when={histories()}>{(histories) => <PortfolioChart data={histories()} />}</Show>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticker</TableHead>
            <TableHead>Units</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={holdings()}>
            {(holding) => (
              <TableRow>
                <TableCell>
                  <input
                    type='text'
                    autocomplete='none'
                    value={holding.ticker}
                    onFocusIn={(e) => e.target.select()}
                    onFocusOut={(e) =>
                      setHoldings(holdings().map((h) => (h === holding ? { ...h, ticker: e.target.value } : h)))
                    }
                    class='w-full min-w-0 bg-background text-background-fg'
                  />
                </TableCell>
                <TableCell>
                  <input
                    type='text'
                    pattern='[0-9]+([\.,][0-9]+)?'
                    autocomplete='none'
                    value={holding.units}
                    onFocusIn={(e) => e.target.select()}
                    onFocusOut={(e) =>
                      setHoldings(
                        holdings().map((h) => (h === holding ? { ...h, units: parseFloat(e.target.value) } : h)),
                      )
                    }
                    class='w-full min-w-0 bg-background text-background-fg'
                  />
                </TableCell>
                <TableCell>{getCurrentPrice(holding.history).toFixed(3)}</TableCell>
                <TableCell>{formatNum(holding.units * getCurrentPrice(holding.history))}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </main>
  )
}

export default Portfolio
