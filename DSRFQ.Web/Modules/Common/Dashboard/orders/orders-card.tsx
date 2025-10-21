import { Fluent } from "@serenity-is/corelib";
import { Chart } from "../shared/chartjs-init";
import { ordersByQuarterChart } from "./orders-by-quarter-chart";
import { ordersByTypeChart } from "./orders-by-type-chart";

export function OrdersCard({ }) {
    var byQuarterChart: Chart<"line">;
    var byTypeChart: Chart<"doughnut">;
    return (
        <div class="card s-dashboard-card s-order-charts">
            <div class="card-body">
                <ul class="nav nav-tabs" role="tablist" ref={el => Fluent(el).on("shown.bs.tab", "a", function () {
                    byQuarterChart?.update();
                    byTypeChart?.update();
                })}>
                    <li class="header"><h3 class="card-title">Orders</h3></li>
                    <li class="nav-item ms-auto"><a class="nav-link active" href="#orders-by-quarter-pane" data-bs-toggle="tab">By Quarter</a></li>
                    <li class="nav-item"><a class="nav-link" href="#orders-by-type-pane" data-bs-toggle="tab">By Type</a></li>
                </ul>
                <div class="tab-content no-padding">
                    <div class="tab-pane fade show active" id="orders-by-quarter-pane">
                        <canvas style="height: 280px;" ref={canvas => setTimeout(() => {
                            byQuarterChart = ordersByQuarterChart(canvas)
                        }, 0)} />
                    </div>
                    <div class="tab-pane fade" id="orders-by-type-pane">
                        <canvas style="height: 280px; width: 300px; margin: 0 auto;" ref={canvas => setTimeout(() => {
                            byTypeChart = ordersByTypeChart(canvas)
                        }, 0)} />
                    </div>
                </div>
            </div>
        </div>
    )
}
