import { Chart } from 'chart.js/auto'
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm'
import { Component, createEffect, onCleanup, onMount } from 'solid-js'
import { PriceHistory } from '~/rpc/yfinance'

interface PortfolioChartProps {
  data: PriceHistory[]
}

export const PortfolioChart: Component<PortfolioChartProps> = (props) => {
  let chart: Chart
  let ref: HTMLCanvasElement

  onMount(() => {
    chart = new Chart(ref, {
      type: 'line',
      data: {
        datasets: props.data.map((data) => {
          return {
            label: data.ticker,
            data: data.timestamps.map((_, i) => {
              return { x: data.timestamps[i] * 1000, y: data.prices[i] }
            }),
            pointRadius: data.timestamps.length <= 80 ? 5 : 0,
            pointHoverRadius: data.timestamps.length <= 80 ? 5 : 0,
            pointHitRadius: 10,
            tension: 0.25,
          }
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
          },
          y: {
            beginAtZero: true,
            suggestedMax: 2 * Math.max(...props.data.map((data) => data.prices[0])),
          },
        },
      },
    })

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      chart.options.color = '#ffffffee'
      chart.options.scales!.x!.ticks!.color = '#ffffffee'
      chart.options.scales!.y!.ticks!.color = '#ffffffee'
      chart.options.scales!.x!.grid!.color = '#ffffff44'
      chart.options.scales!.y!.grid!.color = (context) => {
        if (context.tick.value === 1) {
          return '#ffffffbb'
        }
        return '#ffffff44'
      }
    } else {
      chart.options.color = '#000000ee'
      chart.options.scales!.x!.ticks!.color = '#000000ee'
      chart.options.scales!.y!.ticks!.color = '#000000ee'
      chart.options.scales!.x!.grid!.color = '#00000044'
      chart.options.scales!.y!.grid!.color = (context) => {
        if (context.tick.value === 1) {
          return '#000000bb'
        }
        return '#00000044'
      }
    }

    onCleanup(() => {
      chart.destroy()
    })
  })

  createEffect(() => {
    // chart.data.labels = props.xData
    // chart.data.datasets[0].label = props.label
    // chart.data.datasets[0].data = props.yData
    // chart.update()
  })

  return <canvas ref={(el) => (ref = el)} />
}
