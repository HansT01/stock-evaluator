import { getEvent } from 'vinxi/http'

interface EnvironmentVariables {
  COOKIE_URL: string
  CRUMB_URL: string
  PRICEHISTORY_URL: string
  QUOTESUMMARY_URL: string
  QUOTES_URL: string
  TIMESERIES_URL: string
}

export const getEnv = (): EnvironmentVariables => {
  return import.meta.env.PROD ? getEvent().context.cloudflare.env : process.env
}
