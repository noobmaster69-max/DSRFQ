import { Chart } from "../shared/chartjs-init";

export const ordersByTypeChart = (canvas: HTMLCanvasElement): Chart<"doughnut"> => new Chart(canvas, {
    type: 'doughnut',
    data: {
        labels: ["Download Sales", "In-Store Sales", "Mail-Order Sales"],
        datasets: [{
            label: 'Sales by Type',
            data: [20, 50, 30],
            backgroundColor: [
                '#4dc9f6',
                '#f67019',
                '#f53794'
            ]
        }]
    },
    options: {
        responsive: false,
        maintainAspectRatio: false
    }
});