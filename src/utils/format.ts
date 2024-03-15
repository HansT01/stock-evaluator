export const formatNum = (number?: number | null, significantFigures?: number) => {
  number ??= NaN
  if (Number.isNaN(number)) {
    return 'NaN'
  }
  const sigFig = significantFigures ?? 4
  const symbols = ['', 'k', 'M', 'B', 'T']
  const tier = (Math.log10(Math.abs(number)) / 3) | 0
  if (tier === 0) {
    return number.toString()
  }
  const suffix = symbols[tier]
  const scale = Math.pow(10, tier * 3)
  const scaled = number / scale
  const decimalPlaces = Math.max(0, sigFig - Math.floor(Math.abs(scaled)).toString().length)
  return scaled.toFixed(decimalPlaces) + suffix
}

export const formatPct = (number?: number | null, noSign?: boolean) => {
  number ??= NaN
  if (Number.isNaN(number)) {
    return 'NaN'
  }
  if (noSign) {
    return (number * 100).toFixed(2) + '%'
  }
  return (number >= 0 ? '+' : '-') + (Math.abs(number) * 100).toFixed(2) + '%'
}

export const formatCamelCase = (str: string) => {
  const result = str.replace(/([A-Z]|([0-9]+))/g, ' $1')
  return result.charAt(0).toUpperCase() + result.slice(1)
}
