export const parseCookies = (cookies: string) => {
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
