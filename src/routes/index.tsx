import { Chart } from 'chart.js/auto'
import dayjs from 'dayjs'
import { Component, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { getRequestEvent } from 'solid-js/web'
import { YFinanceSearch } from '~/components/search'
import { calculateDCF, fitExponential } from '~/utils/calculate'
import { cn } from '~/utils/cn'
import { formatCamelCase, formatNum, formatPct } from '~/utils/format'
import { YFinanceData } from '../rpc/yfinance'

interface GrowthChartProps {
  label: string
  xData: string[]
  yData: (number | null)[]
  yGrowth: number[]
}

const GrowthChart: Component<GrowthChartProps> = (props) => {
  let chart: Chart<'line'>
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

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      chart.options.color = '#ffffffee'
      chart.options.scales!.x!.ticks!.color = '#ffffffee'
      chart.options.scales!.y!.ticks!.color = '#ffffffee'
      chart.options.scales!.x!.grid!.color = '#ffffff44'
      chart.options.scales!.y!.grid!.color = '#ffffff44'
    } else {
      chart.options.color = '#000000ee'
      chart.options.scales!.x!.ticks!.color = '#000000ee'
      chart.options.scales!.y!.ticks!.color = '#000000ee'
      chart.options.scales!.x!.grid!.color = '#00000044'
      chart.options.scales!.y!.grid!.color = '#00000044'
    }

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

interface Parameters {
  discountRate: number
  growingYears: number
  terminalGrowth: number
  customGrowth: number
  growthIndicator: 'revenues' | 'earnings' | 'dividends' | 'freeCashFlows' | 'custom'
  investmentOption: 'enterpriseValue' | 'marketCap'
  includeDividends: boolean
}

const defaultParameters: Parameters = {
  discountRate: 0.1,
  growingYears: 10,
  terminalGrowth: 0,
  customGrowth: 0,
  growthIndicator: 'revenues',
  investmentOption: 'enterpriseValue',
  includeDividends: true,
}

const parseCookies = (cookies: string) => {
  if (cookies === '') {
    return {}
  }
  return cookies
    .split('; ')
    .map((c) => c.split('=', 2))
    .reduce<Record<string, any>>((acc, [name, value]) => {
      acc[decodeURIComponent(name)] = JSON.parse(decodeURIComponent(value))
      return acc
    }, {})
}

const getParameters = (): Parameters => {
  const event = getRequestEvent()
  if (event === undefined) {
    return defaultParameters
  }
  const cookies = event.request.headers.get('Cookie')
  if (cookies === null) {
    return defaultParameters
  }
  const params: Parameters | undefined = parseCookies(cookies)['parameters']
  return { ...defaultParameters, ...params }
}

const StockEvaluator = () => {
  const [YFData, setYFData] = createSignal<YFinanceData | null>(null)
  const [isReadMore, setIsReadMore] = createSignal(false)
  const [parameters, setParameters] = createSignal<Parameters>(getParameters())

  onMount(() => {
    const cookies = document.cookie
    const params: Parameters | undefined = parseCookies(cookies)['parameters']
    setParameters({ ...parameters(), ...params })
  })

  createEffect(() => {
    const setCookie = (name: string, value: any) => {
      const cookieValue = encodeURIComponent(JSON.stringify(value))
      document.cookie = `${name}=${cookieValue}; Max-Age=31536000; Path=/; SameSite=Strict`
    }
    setCookie('parameters', parameters())
  })

  const dividendYield = createMemo(() => {
    const data = YFData()
    if (data === null) {
      return NaN
    }
    const mean = data.dividends.reduce<number>((acc, val) => acc + (val ?? 0), 0) / data.dividends.length
    return mean / data[parameters().investmentOption]
  })

  const calculateGrowth = (indicator: Parameters['growthIndicator']) => {
    if (indicator === 'custom') {
      return parameters().customGrowth
    }
    const data = YFData()
    if (data === null) {
      return NaN
    }
    const xData = data.fiscalYearEnds.map((date) => dayjs(date).year())
    const yData = data[indicator]
    return fitExponential(xData, yData).base - 1
  }

  const projectedGrowth = createMemo(() => {
    return calculateGrowth(parameters().growthIndicator) + (parameters().includeDividends ? dividendYield() : 0)
  })

  const intrinsicValue = createMemo(() => {
    const data = YFData()
    if (data === null) {
      return NaN
    }
    const baseFCF =
      data.freeCashFlows.reduce<number>((acc, val) => (val !== null ? acc + val : acc), 0) /
      data.freeCashFlows.filter((val) => val !== null).length
    const dr = parameters().discountRate
    const growingYears = parameters().growingYears
    const projGr = projectedGrowth()
    const termGr = parameters().terminalGrowth
    return calculateDCF(baseFCF, dr, growingYears, projGr, termGr)
  })

  const investment = createMemo(() => {
    const data = YFData()
    if (data === null) {
      return NaN
    }
    return data[parameters().investmentOption]
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
    const indicator = parameters().growthIndicator
    if (data === null || indicator === 'custom') {
      return null
    }
    const label = `Historical ${formatCamelCase(indicator)}`
    const xData = data.fiscalYearEnds.map((date) => dayjs(date).year())
    const yData = [...data[indicator]]
    const { constant, base } = fitExponential(xData, yData)
    for (let i = 0; i < parameters().growingYears; i++) {
      xData.push(xData[xData.length - 1] + 1)
      yData.push(null)
    }
    const yGrowth = []
    for (let x of xData) {
      yGrowth.push(constant * base ** (x - xData[0]))
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
            Currency: {YFData()?.currency ?? 'N/A'}
          </div>
          <div class='rounded-lg border border-primary bg-background px-3 py-2 font-mono text-background-fg'>
            Share price: {YFData()?.sharePrice ?? NaN}
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
                  <td class='w-[96px] border border-primary px-3 py-2'>{formatPct(calculateGrowth('revenues'))}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'revenues' })}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': parameters().growthIndicator === 'revenues',
                      })}
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Earnings growth</td>
                  <td class='border border-primary px-3 py-2'>{formatPct(calculateGrowth('earnings'))}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'earnings' })}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': parameters().growthIndicator === 'earnings',
                      })}
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Dividends growth</td>
                  <td class='border border-primary px-3 py-2'>{formatPct(calculateGrowth('dividends'))}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'dividends' })}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': parameters().growthIndicator === 'dividends',
                      })}
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Cash flows growth</td>
                  <td class='border border-primary px-3 py-2'>{formatPct(calculateGrowth('freeCashFlows'))}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'freeCashFlows' })}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': parameters().growthIndicator === 'freeCashFlows',
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
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'custom' })}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': parameters().growthIndicator === 'custom',
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
                  <td class='w-[96px] border border-primary px-3 py-2'>{formatNum(YFData()?.enterpriseValue)}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setParameters({ ...parameters(), investmentOption: 'enterpriseValue' })}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': parameters().investmentOption === 'enterpriseValue',
                      })}
                    />
                  </td>
                </tr>
                <tr>
                  <td class='border border-primary px-3 py-2'>Market capitalization</td>
                  <td class='border border-primary px-3 py-2'>{formatNum(YFData()?.marketCap)}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() => setParameters({ ...parameters(), investmentOption: 'marketCap' })}
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': parameters().investmentOption === 'marketCap',
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
                  <td class='w-[96px] border border-primary px-3 py-2'>{formatPct(dividendYield())}</td>
                  <td class='relative w-[41px] border border-primary'>
                    <button
                      onClick={() =>
                        setParameters({ ...parameters(), includeDividends: !parameters().includeDividends })
                      }
                      class={cn('absolute inset-0 h-full w-full hover:bg-secondary', {
                        'bg-primary': parameters().includeDividends,
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
                  <td class='w-[137px] border border-primary px-3 py-2'>
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
                  <td class='w-[137px] border border-primary px-3 py-2'>{formatPct(projectedGrowth())}</td>
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

export default StockEvaluator
