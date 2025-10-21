import { formatDate } from "@serenity-is/corelib";
import { Chart } from "chart.js";

const trafficData = [
    {
        label: 'Search',
        backgroundColor: "#206bc4",
        barPercentage: 0.7,
        data: [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 12, 5, 8, 22, 6, 8, 6, 4, 1, 8, 24, 29, 51, 40, 47, 23, 26, 50, 26, 41, 22, 46, 47, 81, 46, 6]
    },
    {
        label: 'Social',
        backgroundColor: "#79a6dc",
        barPercentage: 0.7,
        data: [2, 5, 4, 3, 3, 1, 4, 7, 5, 1, 2, 5, 3, 2, 6, 7, 7, 1, 5, 5, 2, 12, 4, 6, 18, 3, 5, 2, 13, 15, 20, 47, 18, 15, 11, 10, 0]
    },
    {
        label: 'Other',
        backgroundColor: "#bfe399",
        barPercentage: 0.7,
        data: [2, 9, 1, 7, 8, 3, 6, 5, 5, 4, 6, 4, 1, 9, 3, 6, 7, 5, 2, 8, 4, 9, 1, 2, 6, 7, 5, 1, 8, 3, 2, 3, 4, 9, 7, 1, 6]
    }
]

export const trafficChart = (canvas: HTMLCanvasElement) =>
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: Array(37).fill(null).map(function (x, n) {
                var d = new Date(); d.setDate(d.getDate() - n);
                return formatDate(d, 'MMM dd');
            }).reverse(),
            datasets: trafficData
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        callback: function (val, index) {
                            return index % 4 === 0 ? this.getLabelForValue(val as number) : '';
                        },
                        color: 'rgb(140, 142, 150)'
                    },
                    grid: {
                        color: 'rgba(140, 142, 150, 0.15)',
                        tickBorderDash: [8, 4]
                    }
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: 'rgb(140, 142, 150)'
                    },
                    grid: {
                        color: 'rgba(140, 142, 150, 0.15)',
                        tickBorderDash: [8, 4]
                    }
                }
            }
        }
    });