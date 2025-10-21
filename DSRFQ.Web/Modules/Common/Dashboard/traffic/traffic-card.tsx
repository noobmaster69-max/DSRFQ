import { trafficChart } from "./traffic-chart";
import { trafficKnob } from "./traffic-knob";

const trafficKnobData = [
    { value: 45, label: "Search" },
    { value: 20, label: "Social" },
    { value: 35, label: "Other" },
]

export const TrafficCard = ({ }) =>
    <div class="card s-dashboard-card">
        <div class="card-header d-flex">
            <h3 class="card-title">Traffic &amp; Origin</h3>
        </div>
        <div class="card-body">
            <canvas id="traffic-chart" style="height: 250px;" ref={canvas => {
                trafficChart(canvas);
            }}></canvas>
        </div>
        <div class="card-footer no-border">
            <div class="row">
                {trafficKnobData.map((item, index) =>
                    <div class="col-4 text-center" style={{ borderRight: index < trafficKnobData.length - 1 ? "1px solid #f4f4f4" : null, position: "relative" }}>
                        <span class="traffic-value">{item.value}</span>
                        <canvas class="traffic-knob" style="width: 60px; height: 60px;" 
                            ref={canvas => setTimeout(() => trafficKnob(canvas, item.value), 0)} />
                        <div class="knob-label">{item.label}</div>
                    </div>
                )}
            </div>
        </div>
    </div>
