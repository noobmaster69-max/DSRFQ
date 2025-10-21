import { faIcon, resolveUrl } from "@serenity-is/corelib";

var alt = true;

export const SmallCard = ({ icon, caption, url, value }: { icon: string, caption: string, url: string, value: any }) => (
    <div class="col-lg-3 col-sm-6">
        <div class={["card s-dashboard-card-sm", (alt = !alt) && "s-alt"]}>
            <div class="card-body"><h3>{value}</h3><p>{caption}</p></div>
            <div class="icon"><i class={icon}></i></div>
            <a href={resolveUrl(url)} class="card-footer">More info <i class={faIcon("arrow-circle-right")}></i></a>
        </div>
    </div>
);
