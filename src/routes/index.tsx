import dayjs from 'dayjs'
import { Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { getRequestEvent } from 'solid-js/web'
import { YFinanceSearch } from '~/components/search'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/table'
import { YFinanceData } from '~/rpc/yfinance'
import { calculateDCF, fitExponential } from '~/utils/calculate'
import { cn } from '~/utils/cn'
import { formatCamelCase, formatNum, formatPct } from '~/utils/format'
import { GrowthChart } from '../components/growth-chart'
import { parseCookies } from '../utils/cookies'

interface EvaluatorParameters {
  discountRate: number
  growingYears: number
  terminalGrowth: number
  customGrowth: number
  growthIndicator: 'revenues' | 'earnings' | 'dividends' | 'freeCashFlows' | 'custom'
  investmentOption: 'enterpriseValue' | 'marketCap'
  includeDividends: boolean
}

const defaultParameters: EvaluatorParameters = {
  discountRate: 0.15,
  growingYears: 4,
  terminalGrowth: 0.02,
  customGrowth: 0,
  growthIndicator: 'revenues',
  investmentOption: 'enterpriseValue',
  includeDividends: true,
}

const getParameters = (): EvaluatorParameters => {
  const event = getRequestEvent()
  if (event === undefined) {
    return defaultParameters
  }
  const cookies = event.request.headers.get('Cookie')
  if (cookies === null) {
    return defaultParameters
  }
  const params: EvaluatorParameters | undefined = parseCookies(cookies)['parameters']
  return { ...defaultParameters, ...params }
}

const StockEvaluator = () => {
  const [YFData, setYFData] = createSignal<YFinanceData | null>(null)
  const [isReadMore, setIsReadMore] = createSignal(false)
  const [parameters, setParameters] = createSignal<EvaluatorParameters>(getParameters())

  onMount(() => {
    const cookies = document.cookie
    const params: EvaluatorParameters | undefined = parseCookies(cookies)['parameters']
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

  const calculateGrowth = (indicator: EvaluatorParameters['growthIndicator']) => {
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
        <div class='flex min-h-[120px] flex-col px-3'>
          <div class='text-6xl font-thin'>{YFData()?.name}</div>
          <div class='mt-2 text-xl font-light'>{YFData()?.industry}</div>
          <div class='font-semibold'>
            <a href={YFData()?.website} target='_blank' class='underline hover:text-secondary'>
              {YFData()?.website}
            </a>
          </div>
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
          <button onClick={() => setIsReadMore(!isReadMore())} class='font-semibold underline hover:text-secondary'>
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
            class='rounded-lg border border-primary bg-primary px-3 py-2 font-mono text-primary-fg'
          >
            Value rating: {formatPct(valueRating(), true)}
          </button>
        </div>
        <div class='min-h-[400px] w-full rounded-lg border border-primary bg-background px-3 py-2 text-background-fg'>
          <Show when={getChartProps()}>{(props) => <GrowthChart {...props()} />}</Show>
        </div>
        <div class='flex flex-col gap-8 md:flex-row'>
          <div class='flex basis-full flex-col gap-8'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead colSpan={3}>Growth estimates (Pick one)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Revenues growth</TableCell>
                  <TableCell class='w-[96px]'>{formatPct(calculateGrowth('revenues'))}</TableCell>
                  <TableCell class='relative w-[41px]'>
                    <button
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'revenues' })}
                      class={cn(
                        'absolute left-1/2 top-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-secondary',
                        {
                          'bg-primary': parameters().growthIndicator === 'revenues',
                        },
                      )}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Earnings growth</TableCell>
                  <TableCell class='w-[96px]'>{formatPct(calculateGrowth('earnings'))}</TableCell>
                  <TableCell class='relative w-[41px]'>
                    <button
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'earnings' })}
                      class={cn(
                        'absolute left-1/2 top-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-secondary',
                        {
                          'bg-primary': parameters().growthIndicator === 'earnings',
                        },
                      )}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Dividends growth</TableCell>
                  <TableCell class='w-[96px]'>{formatPct(calculateGrowth('dividends'))}</TableCell>
                  <TableCell class='relative w-[41px]'>
                    <button
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'dividends' })}
                      class={cn(
                        'absolute left-1/2 top-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-secondary',
                        {
                          'bg-primary': parameters().growthIndicator === 'dividends',
                        },
                      )}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cash flows growth</TableCell>
                  <TableCell class='w-[96px]'>{formatPct(calculateGrowth('freeCashFlows'))}</TableCell>
                  <TableCell class='relative w-[41px]'>
                    <button
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'freeCashFlows' })}
                      class={cn(
                        'absolute left-1/2 top-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-secondary',
                        {
                          'bg-primary': parameters().growthIndicator === 'freeCashFlows',
                        },
                      )}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Custom growth</TableCell>
                  <TableCell class='w-[96px] bg-secondary text-secondary-fg'>
                    <input
                      type='text'
                      pattern='[0-9]+([\.,][0-9]+)?'
                      autocomplete='none'
                      value={formatPct(parameters().customGrowth)}
                      onFocusIn={(e) => e.target.select()}
                      onFocusOut={(e) =>
                        setParameters({ ...parameters(), customGrowth: parseFloat(e.target.value) / 100 })
                      }
                      class='h-full w-full min-w-0 border-0 bg-secondary text-secondary-fg'
                    />
                  </TableCell>
                  <TableCell class='relative w-[41px]'>
                    <button
                      onClick={() => setParameters({ ...parameters(), growthIndicator: 'custom' })}
                      class={cn(
                        'absolute left-1/2 top-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-secondary',
                        {
                          'bg-primary': parameters().growthIndicator === 'custom',
                        },
                      )}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead colSpan={3}>Investment (Pick one)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Enterprise value</TableCell>
                  <TableCell class='w-[96px]'>{formatNum(YFData()?.enterpriseValue)}</TableCell>
                  <TableCell class='relative w-[41px]'>
                    <button
                      onClick={() => setParameters({ ...parameters(), investmentOption: 'enterpriseValue' })}
                      class={cn(
                        'absolute left-1/2 top-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-secondary',
                        {
                          'bg-primary': parameters().investmentOption === 'enterpriseValue',
                        },
                      )}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Market capitalization</TableCell>
                  <TableCell class='w-[96px]'>{formatNum(YFData()?.marketCap)}</TableCell>
                  <TableCell class='relative w-[41px]'>
                    <button
                      onClick={() => setParameters({ ...parameters(), investmentOption: 'marketCap' })}
                      class={cn(
                        'absolute left-1/2 top-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-secondary',
                        {
                          'bg-primary': parameters().investmentOption === 'marketCap',
                        },
                      )}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead colSpan={3}>Extra considerations (Optional)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Dividend yield</TableCell>
                  <TableCell class='w-[96px]'>{formatPct(dividendYield())}</TableCell>
                  <TableCell class='relative w-[41px]'>
                    <button
                      onClick={() =>
                        setParameters({ ...parameters(), includeDividends: !parameters().includeDividends })
                      }
                      class={cn(
                        'absolute left-1/2 top-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-secondary',
                        {
                          'bg-primary': parameters().includeDividends,
                        },
                      )}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div class='flex basis-full flex-col gap-8'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead colSpan={2}>Parameters (Custom input)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Discount rate</TableCell>
                  <TableCell class='w-[137px] bg-secondary text-secondary-fg'>
                    <input
                      type='text'
                      pattern='[0-9]+([\.,][0-9]+)?'
                      autocomplete='none'
                      value={formatPct(parameters().discountRate, true)}
                      onFocusIn={(e) => e.target.select()}
                      onFocusOut={(e) =>
                        setParameters({ ...parameters(), discountRate: parseFloat(e.target.value) / 100 })
                      }
                      class='w-full min-w-0 bg-secondary text-secondary-fg'
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Growing years</TableCell>
                  <TableCell class='w-[137px] bg-secondary text-secondary-fg'>
                    <input
                      type='text'
                      pattern='[0-9]+([\.,][0-9]+)?'
                      autocomplete='none'
                      value={parameters().growingYears}
                      onFocusIn={(e) => e.target.select()}
                      onFocusOut={(e) => setParameters({ ...parameters(), growingYears: parseFloat(e.target.value) })}
                      class='w-full min-w-0 bg-secondary text-secondary-fg'
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Terminal growth</TableCell>
                  <TableCell class='w-[137px] bg-secondary text-secondary-fg'>
                    <input
                      type='text'
                      pattern='[0-9]+([\.,][0-9]+)?'
                      autocomplete='none'
                      value={formatPct(parameters().terminalGrowth)}
                      onFocusIn={(e) => e.target.select()}
                      onFocusOut={(e) =>
                        setParameters({ ...parameters(), terminalGrowth: parseFloat(e.target.value) / 100 })
                      }
                      class='w-full min-w-0 bg-secondary text-secondary-fg'
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead colSpan={2}>Final evaluations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Projected growth</TableCell>
                  <TableCell class='w-[137px]'>{formatPct(projectedGrowth())}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Intrinsic value</TableCell>
                  <TableCell class='w-[137px]'>{formatNum(intrinsicValue())}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Investment</TableCell>
                  <TableCell class='w-[137px]'>{formatNum(investment())}</TableCell>
                </TableRow>
                <TableRow id='value-rating'>
                  <TableCell class='bg-primary text-primary-fg'>Value rating</TableCell>
                  <TableCell class='w-[137px] bg-primary text-primary-fg'>{formatPct(valueRating(), true)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </main>
  )
}

export default StockEvaluator
