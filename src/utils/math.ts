export const fitExponential = (xData: number[], yData: (number | null)[]) => {
  const x: number[] = []
  const y: number[] = []
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
    y.push(yValue)
    logY.push(Math.log(yValue))
    xSqr.push(xValue ** 2)
    xLogY.push(xValue * Math.log(yValue))
  }
  const xSum = x.reduce((acc, val) => acc + val, 0)
  const ySum = y.reduce((acc, val) => acc + val, 0)
  const logYSum = logY.reduce((acc, val) => acc + val, 0)
  const xSqrSum = xSqr.reduce((acc, val) => acc + val, 0)
  const xLogYSum = xLogY.reduce((acc, val) => acc + val, 0)
  const slope = (x.length * xLogYSum - xSum * logYSum) / (x.length * xSqrSum - xSum ** 2)
  const base = Math.exp(slope)
  const xMean = xSum / x.length - x[0]
  const yMean = ySum / y.length
  const constant = yMean / base ** xMean
  return { constant, base }
}
