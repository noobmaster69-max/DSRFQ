import {notifyError, notifySuccess, stringFormat, serviceRequest, serviceCall, RemoteView,Authorization, informationDialog, resolveUrl} from "@serenity-is/corelib";
import React, {useEffect, useState} from 'react';

import {ReturnPageModel} from "../../ServerTypes/Common/ReturnPageModel";
import {CreateNewDiv} from "../Organization/organizationDetail/organization-detail";
import {BillingPage} from "./BillingDashboard";
import {Column,Grid} from "@serenity-is/sleekgrid";
import {EmailPromptDialog} from "../../Common/Dialog/EmailPromptDialog";
import {WalletTransactionsRow} from "../../ServerTypes/Wallet/WalletTransactionsRow";
import {data} from "react-router-dom";
import {BillingHistoryModel} from "../../ServerTypes/Common/BillingHistoryModel";

export default function pageInit({model, nwLinkFormat }: { model: ReturnPageModel,nwLinkFormat: string }) {
    const nwLink = (s: string) => stringFormat(nwLinkFormat, s);
    if(model!=undefined){
        if(model.success){
            notifySuccess(model.message,"Success",{
                timeOut:5000
            })
        }
        else{
            notifyError(model.message,"Error",{
                timeOut:5000
            })
        }
    }
    document.getElementById("BillingPage").append(<>
            <BillingPage/>
        </>
    )
    serviceCall({
        url: '/FetchBalance',
        request: {},
        blockUI: false
    }).then(response => {
        if( Object.keys(response).length > 0){
            document.getElementById("balance").innerHTML = response[0]
        }
    })
    serviceCall({
        url: '/FetchBillingHistory',
        request: {},
        blockUI: false
    }).then(response => {
    
                // let dataArray =[
                //     {Amount:"$100",Status:"unpaid",Description:"Credit card",Date:"2023-01-01",Invoice:"cs_test_a1HM6bhgWD2IDlJE5EbqDM7bMdtq7jfk3Q3zI8ARuSl7PKnNYOl09VELo5"},
                //     {Amount:"$50",Status:"paid",Description:"Credit card",Date:"2023-01-02",Invoice:"cs_test_a1HM6bhgWD2IDlJE5EbqDM7bMdtq7jfk3Q3zI8ARuSl7PKnNYOl09VELo5"},
                //     {Amount:"$20",Status:"no_payment_required",Description:"Credit card",Date:"2023-01-02",Invoice:"cs_test_a1HM6bhgWD2IDlJE5EbqDM7bMdtq7jfk3Q3zI8ARuSl7PKnNYOl09VELo5"},
                // ]
                response = response.sort((a,b)=>{
                    return new Date(b.InsertDate).getTime() - new Date(a.InsertDate).getTime()
                })
                let dataArray = response.map(item=>{
                    return {
                        Amount:item.Amount,
                        Status:item.PaymentStatus,
                        Description:item.Description,
                        By: item.InsertBy,
                        Date:item.InsertDate,
                        Invoice:item.SessionId,
                    }
                })
                var slickGridData = dataArray.map((item, index) => {
                    const newItem = {
                        id: index+1,
                        ...item };
    
    
                    if (!('id' in newItem)) {
                        newItem.id = index + 1;
                    }
    
                    return newItem;
                });
                var slickGridColumn:Column[] = [
                    {
                        id: "Amount",
                        name: "Amount",
                        field: "Amount",
                        minWidth:150,
    
                        resizable: true,
                        sortable: true,
                        formatter: (_row, _cell, value) => {
                            return {
                                html:true,
                                text: `<span style="font-weight: bold;font-size: 16px">$ ${value}</span>`
                            }
                        }
    
                    },
                    {
                        id: "Status",
                        name: "Status",
                        field: "Status",
                        minWidth: 150,
                        resizable: true,
                        sortable: true,
                        formatter: (_row, _cell, value) => {
                            if (!value) return { text: "-" };
    
                            let color = "";
                            let text = "";
                            let icon = "";
                            let textColor = "";
    
                            switch (value.toLowerCase()) {
                                case "paid":
                                    color = "#eafcdd";
                                    textColor = "#42961b";
                                    text = "Paid";
                                    icon = `<i class="fa fa-check"></i>`;
                                    break;
    
                                case "unpaid":
                                    color = "#fef4f6";
                                    textColor = "#e61947";
                                    text = "Unpaid";
                                    icon = `<i class="fa fa-times"></i>`;
                                    break;
    
                                case "no_payment_required":
                                    color = "#f5f6f8";
                                    textColor = "#6c7688";
                                    text = "No Payment Required";
                                    icon = `<i class="fa fa-clock"></i>`;
                                    break;
                            }
    
                            return {
                                html: true,
                                text: `<span style="background:${color}; color:${textColor}; border:1px solid ${textColor}; 
                         padding:2px 8px; border-radius:4px; font-size:12px; display:inline-flex; font-weight: bold;
                         align-items:center; gap:4px;">
                           ${text} ${icon}
                         </span>`
                            };
                        }
                    },
                    {
                        id: "Description",
                        name: "Description",
                        field: "Description",
                        minWidth: 150,
                        resizable: true,
                        sortable: true,
    
                    },

                    {
                        id: "By",
                        name: "By",
                        field: "By",
                        minWidth: 150,
                        resizable: true,
                        sortable: true,

                    },
                    {
                        id: "Date",
                        name: "Date",
                        field: "Date",
                        minWidth: 150,
                        resizable: true,
                        sortable: true,
    
                    },
                    
                    {
                        id: "Invoice",
                        name: "Invoice",
                        field: "Invoice",
                        minWidth: 150,
                        resizable: true,
                        sortable: true,
                        formatter:(_row, _cell, value) => {
                            return <button className={"btn btn-primary"} onClick={e => { e.preventDefault(); openInvoice(value); }}>
                                View Invoice
                            </button>
    
                        }
                    },
                ]
                var options = {
                    enableCellNavigation: true,
                    enableFiltering: true,
                    enableColumnReorder: false,
                    rowHeight: 40,
                    headerRowHeight:40,
                    footerRowHeight:50,
                    forceFitColumns: true,
                    fullWidthRows: true,
                    enableTextSelectionOnCells:true,
                    showHeaderRow: true,
                    explicitInitialization: true,
                    editable: true,
                    enableAddRow: false,
                    autoEdit: false,
                    showFooterRow: true,
    
    
    
    
                };
    
                let dataView = new RemoteView<any>({})
                const columnFilters = {};
                dataView.setFilter((item) => {
    
                    let pass = true;
    
                    for (let key in item) {
                        if (key in columnFilters && columnFilters[key].length) {
                            pass = pass && !!String(item[key]).match(new RegExp(columnFilters[key], 'ig'));
                        }
                    }
                    return pass;
                });
                dataView.setItems(slickGridData,"id")
                function Filter(props: { columnId: string, columnFilters: Record<string, number>, view: RemoteView<any> }) {
    
    
                    const input = document.createElement('input');
                    input.className = 'slick-editor-text';
                    input.type = 'text';
                    input.value = props.columnFilters[props.columnId] || '';
                    input.style.cssText = `    
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    outline: 0;
                    padding: 5px;
                    font-weight: inherit;`
                    input.onchange = handleChange
    
                    function handleChange({ target }) {
                        const value = target.value.trim()
                        if (value.length) {
                            props.columnFilters[props.columnId] = value;
                        }
                        else {
                            delete props.columnFilters[props.columnId]
                        }
    
                        props.view.refresh()
                    }
                    return input;
                    //return `<input value={props.columnFilters[props.columnId]} type="text" className="slick-editor-text" onChange={handleChange} />`
                }
                function isNumeric(value) {
                    return !isNaN(parseFloat(value)) && isFinite(value);
                }
                var grid = new Grid(document.getElementById("billing-history"), dataView, slickGridColumn, options);
                // var pager = new SlickPager($(`#${containerId}`),{
                //     showRowsPerPage: true,
                //     rowsPerPage:50,
                //     rowsPerPageOptions:[10,50,100,500]
                //
                // })
                grid.onHeaderRowCellRendered.subscribe((e, { node, column }) => {
                    if (['_checkbox_selector'].indexOf(column.id) === -1) {
                        node.innerText = "";
                        node.append(Filter({
                            columnId: column.id,
                            columnFilters: columnFilters,
                            view:dataView
                        }));
                        node.classList.add('slick-editable');
                    }
    
                    else {
                        node.classList.add('slick-uneditable');
                    }
    
                    if (column.id === '_checkbox_selector') {
                        node.innerText = "";
                        node.append(`<i class="fa fa-filter" />`);
                    }
                });
    
                grid.onSort.subscribe(function (e, args) {
                    const comparer = function (a, b) {
                        return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
                    }
                    dataView.sort(comparer, args.sortAsc);
                });
    
                dataView.onRowCountChanged.subscribe(() => {
                    grid.invalidate();
                    grid.render();
                });
    
                grid.onCellChange.subscribe((e, { item }) => {
                    dataView.updateItem(item.id, item)
                })
    
                dataView.onRowsChanged.subscribe((e, { rows }) => {
                    grid.invalidateRows(rows);
                    grid.render();
                });
    
                grid.init();
        }
    )
    
    
}
function openInvoice(session_id) {
    


    serviceCall({
        url: resolveUrl('~/Billing/GetInvoiceUrl'),
        request: {
            session_id:session_id
        },
        onSuccess: (response) => {
            if(response.success){
                window.open(response.url, '_blank');
            }
            else{
                notifyError(response.message)
            }
        }
    });
      



}
