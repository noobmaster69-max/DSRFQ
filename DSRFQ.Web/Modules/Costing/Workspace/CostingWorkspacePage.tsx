import {CostingWorkspace} from "./CostingWorkspace";

export default function pageInit({costingPartId}: { costingPartId: number }) {
    const host = document.getElementById("CostingWorkspace");
    if (!host) return;
    new CostingWorkspace(host, costingPartId);
}
