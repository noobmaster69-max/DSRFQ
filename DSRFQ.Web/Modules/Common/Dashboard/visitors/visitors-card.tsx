import { VisitorSparklines } from "./visitors-sparklines";
import { visitorsRangePicker } from "./visitors-range-picker";
import { VisitorsWorldMap } from "./visitors-world-map";
import { faIcon } from "@serenity-is/corelib";

export const VisitorsCard = () =>
    <div class="card s-dashboard-card s-dashboard-worldmap bg-world-map">
        <div class="card-header d-flex">
            <h3 class="card-title text-white">
                <i class={faIcon("map-marker")}></i> Visitors
            </h3>
            <div class="ms-auto s-dashboard-card-tools">
                <button class="btn btn-primary btn-sm daterange" data-toggle="tooltip"
                    title="Date range" ref={el => visitorsRangePicker(el)}>
                    <i class={faIcon("calendar")}></i>
                </button>
            </div>
        </div>
        <div class="card-body">
            <VisitorsWorldMap />
        </div>
        <div class="card-footer border-top-0">
            <VisitorSparklines />
        </div>
    </div>