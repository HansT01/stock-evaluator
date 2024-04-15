import dayjs from 'dayjs'
import { Show, createSignal } from 'solid-js'
import { PortfolioChart } from '~/components/charts/portfolio'
import { fetchPriceHistory } from '~/rpc/yfinance'

const Portfolio = () => {
  const [data, setData] = createSignal<Awaited<ReturnType<typeof fetchPriceHistory>> | null>(null)

  const handleButton = async () => {
    console.log('sending rpc request')
    const start = dayjs().subtract(365, 'day').unix()
    const end = dayjs().unix()
    const data = await fetchPriceHistory('msft', start, end)
    setData(data)
  }

  return (
    <main class='container mx-auto flex min-h-svh max-w-screen-lg flex-col gap-8 bg-accent p-4 text-accent-fg sm:p-8'>
      <div class='flex flex-wrap justify-center gap-4'>
        <button onClick={handleButton} class='rounded-lg bg-primary px-4 py-2 text-primary-fg'>
          Press me
        </button>
      </div>
      <div class='min-h-[400px] w-full rounded-lg border border-primary bg-background px-3 py-2 text-background-fg'>
        <Show when={data()}>{(data) => <PortfolioChart xData={data().timestamps} yData={data().price} />}</Show>
      </div>
    </main>
  )
}

export default Portfolio
