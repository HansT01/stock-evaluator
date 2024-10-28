'use server'

import dayjs, { Dayjs } from 'dayjs'
import { getEnv } from './env'
import { CurrencyCode } from './exchange-rate-types'

interface ExchangeRateInstance {
  nextUpdateTimestamp: Dayjs
  rates: Record<CurrencyCode, number>
}

declare global {
  var exchangeRate: ExchangeRateInstance | undefined
}

const updateExchangeRates = async () => {
  const app = globalThis
  const res = await fetch(`https://v6.exchangerate-api.com/v6/${getEnv().EXCHANGE_RATE_API_KEY}/latest/USD`)
  if (!res.ok) {
    throw new Error(`updateExchangeRates; Status: ${res.status}; Body: ${await res.text()}`)
  }
  const raw = await res.json()
  app.exchangeRate = {
    nextUpdateTimestamp: dayjs.unix(raw['time_next_update_unix']),
    rates: raw['conversion_rates'],
  }
}

const validateExchangeRates = async () => {
  const app = globalThis
  if (app.exchangeRate === undefined) {
    await updateExchangeRates()
  }
  if (dayjs().isAfter(app.exchangeRate!.nextUpdateTimestamp)) {
    await updateExchangeRates()
  }
}

export const convertCurrency = async (amount: number, from: CurrencyCode, to: CurrencyCode) => {
  if (from === to) {
    return amount
  }
  await validateExchangeRates()
  const app = globalThis
  const rates = app.exchangeRate!.rates
  return (amount / rates[from]) * rates[to]
}
