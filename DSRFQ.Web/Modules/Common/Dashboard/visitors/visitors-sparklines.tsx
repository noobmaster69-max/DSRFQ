import { Chart } from "../shared/chartjs-init";

var sparklineData = [
    { label: "New Visitors", values: [300, 500, 220, 227, 231, 327, 119, 230, 321] },
    { label: "Online", values: [315, 319, 320, 322, 452, 610, 170, 427, 119, 430, 721] },
    { label: "Returning", values: [5, 9, 10, 12, 23, 17, 21, 17, 9, 20, 11] }
];

export const VisitorSparklines = () =>
    <div class="row">
        {sparklineData.map((data, i) =>
            <div class="col-4 text-center">
                <canvas class="sparkline-chart" id={`sparkline-${i + 1}`} style="width: 70px; height: 40px;" ref={canvas => {
                    new Chart(canvas, {
                        type: 'bar',
                        data: {
                            labels: data.values,
                            datasets: [{
                                backgroundColor: "#fff",
                                data: data.values
                            }]
                        },
                        options: {
                            responsive: false,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    callbacks: {
                                        title: s => null
                                    },
                                    displayColors: false,
                                    yAlign: 'center'
                                }
                            },
                            scales: {
                                x: { display: false },
                                y: { display: false }
                            }
                        }
                    });
                }} />
                <div class="sparkline-label text-white text-opacity-75">{data.label}</div>
            </div>)}
    </div>