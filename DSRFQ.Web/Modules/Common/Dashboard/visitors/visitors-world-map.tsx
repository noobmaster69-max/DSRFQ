import jsVectorMap from "jsvectormap";
import "jsvectormap/dist/maps/world.js";
import "jsvectormap/dist/jsvectormap.css";

const visitorsByRegion = {
    "US": 398,
    "SA": 400,
    "CA": 1000,
    "DE": 500,
    "FR": 760,
    "CN": 300,
    "AU": 700,
    "BR": 600,
    "IN": 800,
    "GB": 320,
    "RU": 3000
};

const initVisitorsMap = (el: HTMLElement) => {
    new jsVectorMap({
        selector: "#" + el.id,
        map: "world",
        regionStyle: {
            initial: {
                fill: 'rgba(64, 80, 96, 0.5)',
                "fill-opacity": 1,
                stroke: 'none',
                "stroke-width": 0,
                "stroke-opacity": 1
            }
        },
        visualizeData: {
            scale: ["#72b1dc", "#f3f7ff"],
            values: visitorsByRegion
        },
        onRegionTooltipShow: (_, el: any, code: string) => {
            var visitors = visitorsByRegion[code];
            if (visitors != null)
                el.text(el.text(undefined, true) + ': ' + visitors + ' new visitors', true);
        }
    });
}

export const VisitorsWorldMap = () =>
    <div id="world-map" style="height: 253px; width: 100%;"
        ref={el => setTimeout(() => initVisitorsMap(el), 0)} />
