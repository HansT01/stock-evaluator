import { getRequestEvent } from 'solid-js/web'

interface EnvironmentVariables {
  COOKIE_URL: string
  CRUMB_URL: string
  PRICEHISTORY_URL: string
  QUOTESUMMARY_URL: string
  QUOTES_URL: string
  TIMESERIES_URL: string
  EXCHANGE_RATE_API_KEY: string
}

export const getEnv = (): EnvironmentVariables => {
  return import.meta.env.PROD ? getRequestEvent()!.nativeEvent.context.cloudflare.env : process.env
}
