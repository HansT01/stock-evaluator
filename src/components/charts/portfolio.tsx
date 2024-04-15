import { Chart } from 'chart.js/auto'
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm'
import { Component, createEffect, onCleanup, onMount } from 'solid-js'

interface PortfolioChartProps {
  // label: string
  xData: number[]
  yData: number[]
}

export const PortfolioChart: Component<PortfolioChartProps> = (props) => {
  let chart: Chart
  let ref: HTMLCanvasElement

  onMount(() => {
    chart = new Chart(ref, {
      type: 'line',
      data: {
        datasets: [
          {
            label: '',
            data: props.xData.map((_, i) => {
              return { x: props.xData[i], y: props.yData[i] }
            }),
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHitRadius: 10,
            tension: 0.25,
          },
        ],
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
        if (context.tick.value === 0) {
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
        if (context.tick.value === 0) {
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
