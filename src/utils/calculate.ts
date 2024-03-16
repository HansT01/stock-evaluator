export const fitExponential = (xData: number[], yData: (number | null)[]) => {
  const x: number[] = []
  const logY: number[] = []
  const xSqr: number[] = []
  const xLogY: number[] = []
  for (let i = 0; i < xData.length; i++) {
    const xValue = xData[i]
    const yValue = yData[i]
    if (yValue === null) {
      continue
    }
    x.push(xValue)
    logY.push(Math.log(yValue))
    xSqr.push(xValue ** 2)
    xLogY.push(xValue * Math.log(yValue))
  }
  const xSum = x.reduce((acc, val) => acc + val, 0)
  const logYSum = logY.reduce((acc, val) => acc + val, 0)
  const xSqrSum = xSqr.reduce((acc, val) => acc + val, 0)
  const xLogYSum = xLogY.reduce((acc, val) => acc + val, 0)
  const slope = (x.length * xLogYSum - xSum * logYSum) / (x.length * xSqrSum - xSum ** 2)
  const base = Math.exp(slope)
  const xPoint = xSum / x.length - x[0]
  const yPoint = Math.exp(logYSum / logY.length)
  const constant = yPoint / base ** xPoint
  return { constant, base }
}

export const calculateDCF = (baseCF: number, dr: number, growingYears: number, projGr: number, termGr: number) => {
  const nthCF = baseCF * (1 + projGr) ** growingYears
  const TV = nthCF / (dr - termGr)
  let totalDCF = 0
  for (let year = 1; year <= growingYears; year++) {
    totalDCF += (baseCF * (1 + projGr) ** year) / (1 + dr) ** year
  }
  totalDCF += TV / (1 + dr) ** growingYears
  return totalDCF
}
