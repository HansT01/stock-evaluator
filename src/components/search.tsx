import { Component, For, Show, createSignal } from 'solid-js'
import { cn } from '~/util/cn'
import { YFinanceData, YFinanceQuote, getYFinanceData, getYFinanceQuotes } from '~/util/yfinance'
import { LoaderIcon, SearchIcon } from './icons'

interface SearchProps {
  onSuccess: (data: YFinanceData) => void
  onError: (reason: any) => void
}

export const YFinanceSearch: Component<SearchProps> = (props) => {
  const [ticker, setTicker] = createSignal('')
  const [quotes, setQuotes] = createSignal<YFinanceQuote[]>([])
  const [isFocused, setIsFocused] = createSignal(false)
  const [isFetchingQuotes, setIsFetchingQuotes] = createSignal(false)
  const [isFetchingData, setIsFetchingData] = createSignal(false)

  const handleSearch = () => {
    if (isFetchingData()) {
      return
    }
    setQuotes([])
    setIsFetchingData(true)
    setIsFocused(false)
    getYFinanceData(ticker())
      .then(props.onSuccess)
      .catch(props.onError)
      .finally(() => setIsFetchingData(false))
  }

  const handleSelectQuote = (quote: YFinanceQuote) => {
    setTicker(quote.symbol)
    handleSearch()
  }

  let timeoutId: NodeJS.Timeout | null = null

  const handleKeyUp = (e: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
    setQuotes([])
    const query = e.currentTarget.value
    const handleGetQuotes = () => {
      if (isFetchingQuotes()) {
        return
      }
      setIsFetchingQuotes(true)
      getYFinanceQuotes(query)
        .then(setQuotes)
        .catch(() => setQuotes([]))
        .finally(() => setIsFetchingQuotes(false))
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    timeoutId = setTimeout(handleGetQuotes, 500)
  }

  return (
    <div class='sticky top-4 z-10 mx-auto w-[500px] max-w-full px-4'>
      <div
        onClick={() => setIsFocused(false)}
        class={cn('pointer-events-none fixed inset-0 bg-black opacity-0 transition-opacity', {
          'pointer-events-auto opacity-20': isFocused(),
        })}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}
        class='relative flex w-full items-stretch'
      >
        <input
          type='text'
          autocomplete='off'
          value={ticker()}
          onFocusIn={() => setIsFocused(true)}
          onChange={(e) => setTicker(e.target.value)}
          onKeyUp={handleKeyUp}
          class='min-w-0 max-w-full grow rounded-s-full border border-primary bg-background px-4 py-2 text-background-fg'
        />
        <button
          type='submit'
          disabled={isFetchingData()}
          onClick={handleSearch}
          class='flex w-[72px] max-w-full items-center justify-center rounded-e-full bg-primary px-4 py-2 text-primary-fg'
        >
          {isFetchingData() ? <LoaderIcon class='animate-spin' size={20} /> : <SearchIcon size={20} />}
        </button>
      </form>
      <div class='absolute left-0 right-0 mt-4 w-full'>
        <Show
          when={quotes().length !== 0}
          fallback={
            <Show when={isFetchingQuotes()}>
              <div class='flex min-h-[68px] items-center justify-center rounded-lg border border-primary bg-background text-background-fg'>
                <LoaderIcon class='animate-spin' />
              </div>
            </Show>
          }
        >
          <div class='flex flex-col items-stretch divide-y divide-primary overflow-hidden rounded-lg border border-primary bg-background text-background-fg'>
            <For each={quotes()}>
              {(quote) => (
                <button
                  onClick={() => handleSelectQuote(quote)}
                  class='flex flex-col items-stretch px-3 py-2 text-left hover:bg-accent hover:text-accent-fg focus:bg-accent focus:text-accent-fg'
                >
                  <div class='line-clamp-1 text-lg font-light'>{quote.longname}</div>
                  <div class='flex flex-wrap'>
                    <div class='line-clamp-1 grow'>{quote.industryDisp}</div>
                    <div class='line-clamp-1'>{`${quote.exchDisp}: ${quote.symbol}`}</div>
                  </div>
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}
