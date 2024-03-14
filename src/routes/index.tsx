import { Chart } from 'chart.js/auto'
import dayjs from 'dayjs'
import { Component, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { YFinanceSearch } from '~/components/search'
import { cn } from '~/util/cn'
import { formatCamelCase, formatNum, formatPct } from '~/util/format'
import { YFinanceData } from '~/util/yfinance'

interface GrowthChartProps {
  label: string
  xData: string[]
  yData: (number | null)[]
  yGrowth: number[]
}

const GrowthChart: Component<GrowthChartProps> = (props) => {
  let chart: Chart
  let ref: HTMLCanvasElement

  onMount(() => {
    chart = new Chart(ref, {
      type: 'line',
      data: {
        labels: props.xData,
        datasets: [
          {
            label: props.label,
            data: props.yData,
            pointRadius: 10,
            pointHoverRadius: 10,
            pointHitRadius: 10,
            tension: 0.25,
          },
          {
            label: 'Growth estimate',
            data: props.yGrowth,
            pointRadius: 10,
            pointHoverRadius: 10,
            pointHitRadius: 10,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return formatNum(value as number, 3)
              },
            },
          },
        },
      },
    })

    onCleanup(() => {
      chart.destroy()
    })
  })

  createEffect(() => {
    chart.data.labels = props.xData
    chart.data.datasets[0].label = props.label
    chart.data.datasets[0].data = props.yData
    chart.data.datasets[1].data = props.yGrowth
    chart.update()
  })

  return <canvas ref={(el) => (ref = el)} />
}

type GrowthIndicator = 'revenues' | 'earnings' | 'dividends' | 'freeCashFlows' | 'custom'

const StockCalculator = () => {
  const [YFData, setYFData] = createSignal<YFinanceData | null>(null)
  const [isReadMore, setIsReadMore] = createSignal(false)

  const [parameters, setParameters] = createSignal({
    discountRate: 0.2,
    growingYears: 5,
    terminalGrowth: 0,
    customGrowth: 0,
  })
  const [growthIndicator, setGrowthIndicator] = createSignal<GrowthIndicator>('revenues')
  const [investmentOption, setInvestmentOption] = createSignal<'marketCap' | 'enterpriseValue'>('enterpriseValue')
  const [extraConsiderations, setExtraConsiderations] = createSignal({
    includeDividends: true,
  })

  const dividendYield = createMemo(() => {
    const data = YFData()
    if (data === null) {
      return NaN
    }
    const mean = data.dividends.reduce<number>((acc, val) => acc + (val || 0), 0) / data.dividends.length
    return mean / Math.max(data.marketCap || 0, data.enterpriseValue || 0)
  })

  const fitGrowth = (indicator: Exclude<GrowthIndicator, 'custom'>) => {
    const data = YFData()
    if (data === null) {
      return { constant: NaN, base: NaN }
    }
    const x: number[] = []
    const y: number[] = []
    const logY: number[] = []
    const xSqr: number[] = []
    const xLogY: number[] = []
    for (let i = 0; i < data.fiscalYearEnds.length; i++) {
      const xValue = dayjs(data.fiscalYearEnds[i]).year()
      const yValue = data[indicator][i]
      if (yValue === null) {
        continue
      }
      x.push(xValue)
      y.push(yValue)
      logY.push(Math.log(yValue))
      xSqr.push(xValue ** 2)
      xLogY.push(xValue * Math.log(yValue))
    }
    const xSum = x.reduce((acc, val) => acc + val, 0)
    const ySum = y.reduce((acc, val) => acc + val, 0)
    const logYSum = logY.reduce((acc, val) => acc + val, 0)
    const xSqrSum = xSqr.reduce((acc, val) => acc + val, 0)
    const xLogYSum = xLogY.reduce((acc, val) => acc + val, 0)
    const slope = (x.length * xLogYSum - xSum * logYSum) / (x.length * xSqrSum - xSum ** 2)
    const base = Math.exp(slope)
    const xMean = xSum / x.length
    const yMean = ySum / y.length
    const constant = yMean / base ** xMean
    return { constant, base }
  }

  const calculateGrowth = (indicator: GrowthIndicator) => {
    if (indicator === 'custom') {
      return parameters().customGrowth
    }
    return fitGrowth(indicator).base - 1
  }

  const projectedGrowth = createMemo(() => {
    return calculateGrowth(growthIndicator()) + (extraConsiderations().includeDividends ? dividendYield() : 0)
  })

  const intrinsicValue = createMemo(() => {
    const data = YFData()
    if (data === null) {
      return NaN
    }
    const r = parameters().discountRate
    const n = parameters().growingYears
    const gT = parameters().terminalGrowth
    const gP = projectedGrowth()
    const FCF0 =
      data.freeCashFlows.reduce<number>((acc, val) => (val !== null ? acc + val : acc), 0) /
      data.freeCashFlows.filter((val) => val !== null).length
    const FCFn = FCF0 * (1 + gP) ** n
    const TV = FCFn / (r - gT)

    let totalDiscountedFCF = 0
    for (let year = 1; year <= n; year++) {
      totalDiscountedFCF += (FCF0 * (1 + gP) ** year) / (1 + r) ** year
    }
    totalDiscountedFCF += TV / (1 + r) ** n
    return totalDiscountedFCF
  })

  const investment = createMemo(() => {
    const data = YFData()
    if (data === null) {
      return NaN
    }
    return data[investmentOption()]
  })

  const valueRating = createMemo(() => {
    const data = YFData()
    if (data === null) {
      return NaN
    }
    return intrinsicValue() / investment()
  })

  const getChartProps = createMemo(() => {
    const data = YFData()
    const indicator = growthIndicator()
    if (data === null || indicator === 'custom') {
      return null
    }
    const label = `Historical ${formatCamelCase(indicator)}`
    const xData = data.fiscalYearEnds.map((end) => dayjs(end).year())
    const yData = data[indicator]
    for (let i = 0; i < parameters().growingYears; i++) {
      xData.push(xData[xData.length - 1] + 1)
      yData.push(null)
    }
    const { constant, base } = fitGrowth(indicator)
    const yGrowth = []
    for (let x of xData) {
      yGrowth.push(constant * base ** x)
    }
    const xDataStr = xData.map((x) => x.toString())
    return { label, xData: xDataStr, yData, yGrowth }
  })

  return (
    <main class='container mx-auto flex min-h-svh max-w-screen-lg flex-col gap-8 bg-accent p-4 text-accent-fg sm:p-8'>
      <YFinanceSearch onSuccess={setYFData} onError={console.error} />
      <div class='flex flex-col gap-8'>
        <div class='flex min-h-[96px] flex-col gap-2 px-3'>
          <div class='text-6xl font-thin'>{YFData()?.name}</div>
          <div class='text-xl font-light'>{YFData()?.industry}</div>
        </div>
        <div class='flex min-h-[122px] flex-col items-center gap-2 rounded-lg border border-primary bg-background px-3 py-2 text-background-fg'>
          <p
            class={cn(
              'line-clamp-3 grow bg-gradient-to-b from-background-fg to-transparent bg-clip-text text-left text-transparent',
              {
                'line-clamp-none text-background-fg': isReadMore(),
              },
            )}
          >
            {YFData()?.summary}
          </p>
          <button onClick={() => setIsReadMore(!isReadMore())} class='underline hover:text-secondary'>
            {isReadMore() ? 'Read less' : 'Read more'}
          </button>
        </div>
        <div class='flex flex-wrap gap-4'>
          <div class='rounded-lg border border-primary bg-background px-3 py-2 font-mono text-background-fg'>
            Currency: {YFData()?.currency || 'N/A'}
          </div>
          <div class='rounded-lg border border-primary bg-background px-3 py-2 font-mono text-background-fg'>
            Share price: {YFData()?.sharePrice || NaN}
          </div>
          <button
            onClick={() => document.getElementById('value-rating')?.scrollIntoView()}
            class='rounded-lg border border-primary bg-background px-3 py-2 font-mono text-background-fg'
          >
            Value rating: {formatPct(valueRating(), true)}
          </button>
        </div>
        <div class='min-h-[400px] w-full rounded-lg border border-primary bg-background px-3 py-2 text-background-fg'>
          <Show when={getChartProps()}>{(props) => <GrowthChart {...props()} />}</Show>
        </div>
        <div class='flex flex-col gap-8 md:flex-row'>
          <div class='flex basis-full flex-col gap-8'>
            <table class='table-fixed rounded-lg border border-primary bg-background font-mono text-background-fg'>
              <thead>
                <tr>
                  <td colSpan={3} class='border border-primary px-3 py-2 font-bold'>
                    Growth estimates (Pick one)
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class='border border-primary px-3 py-2'>Revenues growth</td>
                  <td class='w-[90px] border border-primary px-3 py-2'>{formatPct(calculateGrowth('revenues'))}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setGrowthIndicator('revenues')}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': growthIndicator() === 'revenues',
                      })}
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Earnings growth</td>
                  <td class='border border-primary px-3 py-2'>{formatPct(calculateGrowth('earnings'))}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setGrowthIndicator('earnings')}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': growthIndicator() === 'earnings',
                      })}
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Dividends growth</td>
                  <td class='border border-primary px-3 py-2'>{formatPct(calculateGrowth('dividends'))}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setGrowthIndicator('dividends')}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': growthIndicator() === 'dividends',
                      })}
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Cash flows growth</td>
                  <td class='border border-primary px-3 py-2'>{formatPct(calculateGrowth('freeCashFlows'))}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setGrowthIndicator('freeCashFlows')}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': growthIndicator() === 'freeCashFlows',
                      })}
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Custom growth</td>
                  <td class='border border-primary px-3 py-2'>
                    <input
                      type='text'
                      autocomplete='none'
                      value={formatPct(parameters().customGrowth)}
                      onFocusIn={(e) => e.target.select()}
                      onFocusOut={(e) =>
                        setParameters({ ...parameters(), customGrowth: parseFloat(e.target.value) / 100 })
                      }
                      class='h-full w-full min-w-0 border-0 bg-background text-background-fg'
                    />
                  </td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setGrowthIndicator('custom')}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': growthIndicator() === 'custom',
                      })}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <table class='table-fixed bg-background font-mono text-background-fg'>
              <thead>
                <tr>
                  <td colSpan={3} class='border border-primary px-3 py-2 font-bold'>
                    Investment (Pick one)
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class='border border-primary px-3 py-2'>Enterprise value</td>
                  <td class='w-[90px] border border-primary px-3 py-2'>{formatNum(YFData()?.enterpriseValue)}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setInvestmentOption('enterpriseValue')}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': investmentOption() === 'enterpriseValue',
                      })}
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Market capitalization</td>
                  <td class='border border-primary px-3 py-2'>{formatNum(YFData()?.marketCap)}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setInvestmentOption('marketCap')}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': investmentOption() === 'marketCap',
                      })}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <table class='table-fixed bg-background font-mono text-background-fg'>
              <thead>
                <tr>
                  <td colSpan={3} class='border border-primary px-3 py-2 font-bold'>
                    Extra considerations (Optional)
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class='border border-primary px-3 py-2'>Dividend yield</td>
                  <td class='w-[90px] border border-primary px-3 py-2'>{formatPct(dividendYield())}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() =>
                        setExtraConsiderations({
                          ...extraConsiderations(),
                          includeDividends: !extraConsiderations().includeDividends,
                        })
                      }
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': extraConsiderations().includeDividends,
                      })}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class='flex basis-full flex-col gap-8'>
            <table class='table-fixed bg-background font-mono text-background-fg'>
              <thead>
                <tr>
                  <td colSpan={2} class='border border-primary px-3 py-2 font-bold'>
                    Parameters (Custom input)
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class='border border-primary px-3 py-2'>Discount rate</td>
                  <td class='w-[131px] border border-primary px-3 py-2'>
                    <input
                      type='text'
                      autocomplete='none'
                      value={formatPct(parameters().discountRate, true)}
                      onFocusIn={(e) => e.target.select()}
                      onFocusOut={(e) =>
                        setParameters({ ...parameters(), discountRate: parseFloat(e.target.value) / 100 })
                      }
                      class='h-full w-full min-w-0 border-0 bg-background text-background-fg'
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Growing years</td>
                  <td class='border border-primary px-3 py-2'>
                    <input
                      type='text'
                      autocomplete='none'
                      value={parameters().growingYears}
                      onFocusIn={(e) => e.target.select()}
                      onFocusOut={(e) => setParameters({ ...parameters(), growingYears: parseFloat(e.target.value) })}
                      class='w-full min-w-0 bg-background text-background-fg'
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Terminal growth</td>
                  <td class='border border-primary px-3 py-2'>
                    <input
                      type='text'
                      autocomplete='none'
                      value={formatPct(parameters().terminalGrowth)}
                      onFocusIn={(e) => e.target.select()}
                      onFocusOut={(e) =>
                        setParameters({ ...parameters(), terminalGrowth: parseFloat(e.target.value) / 100 })
                      }
                      class='w-full min-w-0 bg-background text-background-fg'
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <table class='table-fixed bg-background font-mono text-background-fg'>
              <thead>
                <tr>
                  <td colSpan={2} class='border border-primary px-3 py-2 font-bold'>
                    Final evaluations
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class='border border-primary px-3 py-2'>Projected growth</td>
                  <td class='w-[131px] border border-primary px-3 py-2'>{formatPct(projectedGrowth())}</td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Intrinsic value</td>
                  <td class='border border-primary px-3 py-2'>{formatNum(intrinsicValue())}</td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Investment</td>
                  <td class='border border-primary px-3 py-2'>{formatNum(investment())}</td>
                </tr>
                <tr id='value-rating'>
                  <td class='border border-primary px-3 py-2'>Value rating</td>
                  <td class='border border-primary px-3 py-2'>{formatPct(valueRating(), true)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

export default StockCalculator
