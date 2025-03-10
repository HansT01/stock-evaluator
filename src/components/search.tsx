import { useSearchParams } from '@solidjs/router'
import { Component, For, Show, createEffect, createSignal, onMount } from 'solid-js'
import { YFinanceData, YFinanceQuote, fetchYFinanceData, fetchYFinanceQuotes } from '~/server/yfinance'
import { cn } from '../utils/cn'
import { LoaderIcon, SearchIcon } from './icons'

interface SearchProps {
  onSuccess: (data: YFinanceData) => void
  onError: (reason: any) => void
}

export const YFinanceSearch: Component<SearchProps> = (props) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [ticker, setTicker] = createSignal((searchParams.ticker as string) ?? '')
  const [quotes, setQuotes] = createSignal<YFinanceQuote[]>([])
  const [isFocused, setIsFocused] = createSignal(false)
  const [isFetchingQuotes, setIsFetchingQuotes] = createSignal(false)
  const [isFetchingData, setIsFetchingData] = createSignal(false)

  let inputRef: HTMLInputElement

  createEffect(() => {
    if (!isFocused()) {
      inputRef.blur()
    }
  })

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsFocused(false)
    }
  }

  onMount(() => {
    handleSearch()
  })

  const handleSearch = () => {
    if (isFetchingData() || ticker().length === 0) {
      return
    }
    setQuotes([])
    setIsFetchingData(true)
    setIsFocused(false)
    fetchYFinanceData(ticker())
      .then(props.onSuccess)
      .catch(props.onError)
      .finally(() => {
        setIsFetchingData(false)
        setSearchParams({ ticker: ticker() })
      })
  }

  const handleSelectQuote = (quote: YFinanceQuote) => {
    setTicker(quote.symbol)
    handleSearch()
  }

  let iteration = 0
  let timeout: NodeJS.Timeout | null = null
  const handleInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    const query = e.currentTarget.value
    const handleGetQuotes = () => {
      iteration++
      const current = iteration
      setIsFetchingQuotes(true)
      fetchYFinanceQuotes(query)
        .then((quotes) => {
          if (current === iteration) {
            setQuotes(quotes)
          }
        })
        .catch(() => {
          if (current === iteration) {
            setQuotes([])
          }
        })
        .finally(() => {
          if (current === iteration) {
            setIsFetchingQuotes(false)
          }
        })
    }
    if (timeout !== null) {
      clearTimeout(timeout)
      timeout = null
    }
    timeout = setTimeout(handleGetQuotes, 500)
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
          ref={(el) => (inputRef = el)}
          tabIndex={1}
          type='text'
          autocomplete='off'
          value={ticker()}
          onFocusIn={(e) => {
            e.target.select()
            setIsFocused(true)
          }}
          onChange={(e) => setTicker(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          class='border-primary bg-background text-background-fg max-w-full min-w-0 grow rounded-s-full border px-4 py-2'
        />
        <button
          type='submit'
          disabled={isFetchingData()}
          onClick={handleSearch}
          class='bg-primary text-primary-fg flex w-[72px] max-w-full cursor-pointer items-center justify-center rounded-e-full px-4 py-2'
        >
          {isFetchingData() ? <LoaderIcon class='animate-spin' size={20} /> : <SearchIcon size={20} />}
        </button>
      </form>

      <Show when={isFocused()}>
        <div class='absolute right-0 left-0 mt-4 w-full'>
          <Show
            when={quotes().length !== 0}
            fallback={
              <div class='border-primary bg-background text-background-fg flex min-h-[68px] items-center justify-center rounded-lg border'>
                <Show when={isFetchingQuotes()} fallback={<div>No matching results.</div>}>
                  <LoaderIcon class='animate-spin' />
                </Show>
              </div>
            }
          >
            <div class='divide-primary border-primary bg-background text-background-fg flex flex-col items-stretch divide-y overflow-hidden rounded-lg border'>
              <For each={quotes()}>
                {(quote) => (
                  <button
                    tabIndex={1}
                    onClick={() => handleSelectQuote(quote)}
                    class='hover:bg-secondary hover:text-secondary-fg focus:bg-secondary focus:text-secondary-fg flex cursor-pointer flex-col items-stretch px-3 py-2 text-left'
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
      </Show>
    </div>
  )
}
