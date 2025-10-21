import { Chart } from "../shared/chartjs-init";

export const ordersByQuarterChart = (canvas: HTMLCanvasElement): Chart<"line"> => new Chart(canvas, {
    type: 'line',
    data: {
        labels: ['2020 Q1', '2020 Q2', '2020 Q3', '2020 Q4', '2021 Q1', '2021 Q2', '2021 Q3', '2021 Q4'],
        datasets: [
            {
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgb(255, 255, 255, 0.7)',
                borderWidth: 4,
                label: 'Closed Orders',
                fill: true,
                data: [1969, 3597, 1914, 4293, 3795, 5967, 4460, 5713]
            },
            {
                label: 'All Orders',
                backgroundColor: 'rgba(54, 162, 235, 0.4)',
                borderColor: 'rgba(54, 162, 235, 0.2)',
                borderWidth: 4,
                fill: true,
                data: [4912, 3767, 6810, 5670, 4820, 15073, 10687, 8432]
            }
        ]
    },
    options: {
        elements: {
            point: {
                radius: 0,
                hitRadius: 6
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                ticks: { color: 'rgb(140, 142, 150)' },
                grid: { display: false, }
            },
            y: {
                ticks: { color: 'rgb(140, 142, 150)' },
                grid: {
                    color: 'rgba(140, 142, 150, 0.15)',
                    tickBorderDash: [8, 4]
                }
            }
        }
    }
});