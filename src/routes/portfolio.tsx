import dayjs from 'dayjs'
import { Show, createSignal } from 'solid-js'
import { PortfolioChart } from '~/components/charts/portfolio'
import { fetchPriceHistory } from '~/rpc/yfinance'

const Portfolio = () => {
  const [data, setData] = createSignal<Awaited<ReturnType<typeof fetchPriceHistory>> | null>(null)

  const handleButton = async () => {
    console.log('sending rpc request')
    const start = dayjs().subtract(7, 'day').unix()
    const end = dayjs().unix()
    const data = await fetchPriceHistory('msft', start, end)
    setData(data)
  }
  return (
    <main class='container mx-auto flex min-h-svh max-w-screen-lg flex-col gap-8 bg-accent p-4 text-accent-fg sm:p-8'>
      <button onClick={handleButton} class='bg-primary px-3 py-2 text-primary-fg'>
        Press me
      </button>
      <Show when={data()}>{(data) => <PortfolioChart xData={data().timestamps} yData={data().price} />}</Show>
    </main>
  )
}

export default Portfolio
