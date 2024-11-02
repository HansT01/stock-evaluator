'use server'

import { getEnv } from './env'
import { CurrencyCode } from './exchange-rate-types'

interface ExchangeRateInstance {
  nextUpdateTimestamp: Date
  rates: Record<CurrencyCode, number>
}

declare global {
  var exchangeRate: ExchangeRateInstance | undefined
  var exchangeRateUpdatePromise: Promise<void> | undefined
}

const updateExchangeRate = async () => {
  const app = globalThis
  if (app.exchangeRateUpdatePromise) {
    return app.exchangeRateUpdatePromise
  }
  app.exchangeRateUpdatePromise = (async () => {
    try {
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${getEnv().EXCHANGE_RATE_API_KEY}/latest/USD`)
      if (!res.ok) {
        throw new Error(`updateExchangeRate; Status: ${res.status}; Body: ${await res.text()}`)
      }
      const raw = await res.json()
      app.exchangeRate = {
        nextUpdateTimestamp: new Date(raw['time_next_update_unix'] * 1000),
        rates: raw['conversion_rates'],
      }
    } finally {
      app.exchangeRateUpdatePromise = undefined
    }
  })()
  return app.exchangeRateUpdatePromise
}

const validateExchangeRate = async () => {
  const app = globalThis
  if (app.exchangeRate === undefined || new Date() > app.exchangeRate!.nextUpdateTimestamp) {
    await updateExchangeRate()
  }
}

export const convertCurrency = async (amount: number, from: CurrencyCode, to: CurrencyCode) => {
  if (from === to) {
    return amount
  }
  await validateExchangeRate()
  const app = globalThis
  const rates = app.exchangeRate!.rates
  return (amount / rates[from]) * rates[to]
}
