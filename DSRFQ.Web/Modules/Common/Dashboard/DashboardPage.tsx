import {Authorization, faIcon, stringFormat,notifyError, notifySuccess, serviceRequest,serviceCall} from "@serenity-is/corelib";
import * as preact from "preact";
import { DashboardPageModel } from "../../ServerTypes/Common/DashboardPageModel";
import { CalendarCard } from "./calendar/calendar-card";
import { ChatCard } from "./chat/chat-card";
import { OrdersCard } from "./orders/orders-card";
import { SmallCard } from "./shared/small-card";
import { TodoCard } from "./todo/todo-card";
import { TrafficCard } from "./traffic/traffic-card";
import { VisitorsCard } from "./visitors/visitors-card";
import {CompanyDiv, CreateNewDiv} from "../../Company/Organization/organizationDetail/organization-detail";
export default function pageInit({ model, nwLinkFormat }: { model: DashboardPageModel, nwLinkFormat: string }){
    serviceCall({
        url: '/FetchCompanyDetail',
        request: {},
        blockUI: false
    }).then(response => {
        if( Object.keys(response).length > 0){
            
        }
        else{
            window.location.replace('/OrganizationDetail');
        }
    })
    
   
}
// export default function pageInit({ model, nwLinkFormat }: { model: DashboardPageModel, nwLinkFormat: string }) {
//
//     const nwLink = (s: string) => stringFormat(nwLinkFormat, s);
//
//     document.getElementById("DashboardContent").append(<>
//         <div class="row">
//             <SmallCard caption="Open Orders" icon={faIcon("shopping-cart")} url={nwLink("Order?shippingState=0")} value={model.OpenOrders} />
//             <SmallCard caption="Closed Orders" icon={faIcon("truck")} url={nwLink("Order?shippingState=1")} value={<>{model.ClosedOrderPercent}<sup style="font-size: 20px">%</sup></>} />
//             <SmallCard caption="Total Customers" icon={faIcon("user-plus")} url={nwLink("Customer")} value={model.CustomerCount} />
//             <SmallCard caption="Product Types" icon={faIcon("tag")} url={nwLink("Product")} value={model.ProductCount} />
//         </div>
//
//         <div class="row">
//             <section class="col-lg-7">
//                 <OrdersCard />
//
//                 {/* Chat is implemented via preact just as a demonstration of integrating another lib like preact/react inside jsx-dom tree */}
//                 <div class="card s-dashboard-card s-chat" ref={el => preact.render(preact.h(ChatCard, {}), el)} />
//
//                 <TodoCard />
//             </section>
//
//             <section class="col-lg-5">
//                 <VisitorsCard />
//                 <TrafficCard />
//                 <CalendarCard />
//             </section>
//         </div>
//     </>)
// }