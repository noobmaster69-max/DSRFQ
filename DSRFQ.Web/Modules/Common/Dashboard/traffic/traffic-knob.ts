import { Chart } from "../shared/chartjs-init";

export const trafficKnob = (el: HTMLCanvasElement, value: number) =>
    new Chart(el, {
        type: 'doughnut',
        data: {
            labels: ["", ""],
            datasets: [{
                data: [value, 100 - value],
                backgroundColor: [
                    '#39a0ff',
                    '#39a0ff50'
                ],
                weight: 0.5
            }]
        },
        options: {
            cutout: '65%',
            responsive: false,
            maintainAspectRatio: false,
            borderColor: 'transparent',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: null
            }
        }
    });
