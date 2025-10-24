import {Decorators, EntityGrid, htmlEncode, indexOf, SettingStorage, ToolButton} from '@serenity-is/corelib';
import { CostingPartsColumns, CostingPartsRow, CostingPartsService } from '../../ServerTypes/Costing';
import { CostingPartsDialog } from './CostingPartsDialog';
import {DrawingImportDialog} from "../Drawing/DrawingImportDialog";
import {Column, GridOptions} from "@serenity-is/sleekgrid";
import {CostingResultDialog} from "./CostingResultDialog";
import mqtt from "mqtt"

@Decorators.registerClass('DSRFQ.Costing.CostingPartsGrid')
export class CostingPartsGrid extends EntityGrid<CostingPartsRow> {
    protected getColumnsKey() { return CostingPartsColumns.columnsKey; }
    protected getDialogType() { return CostingPartsDialog; }
    protected getRowDefinition() { return CostingPartsRow; }
    protected getService() { return CostingPartsService.baseUrl; }
    protected getPersistanceStorage(): SettingStorage {
        return window.localStorage;
    }

    protected afterInit() {
        super.afterInit();
        const queueName = 'NewCostingParts'; // The queue to listen to

        let th = this
        let i = 0
        const QUEUE_NAME = 'NewCostingParts';
        const client = mqtt.connect("ws://localhost:15675/ws",{
            username:"guest",
            password:"guest",
        })
        
        client.on("connect", () => {
            console.log("Connected to RabbitMQ Web Mqtt")
            client.subscribe("Progress",err=>{
                if(!err){
                    console.log("Subscribed to Progress")
                }
            })
        })
        
        client.on("message", (topic,message) => {
            const msg = JSON.parse(message.toString());
            let id = msg["Id"]
            let receivedMsg = msg["Message"]
            th.view.setItems(th.view.getFilteredItems().map(item => {
                if(item.Id===Number(id)){
                    item.Message = receivedMsg;
                    
                }
                return item
            }))
        })
        // setInterval(()=>{
        //    
        //     console.log(i+1)
        //     i += 1
        //     this.view.setItems(this.view.getFilteredItems().map(item => {
        //         if(item.Id===41){
        //             item.Message = i
        //         }
        //         return item
        //     }))
        // },1000)
        
    }

    protected getButtons(): ToolButton[] {
        let grid = this
        var buttons = super.getButtons();
        buttons.splice(indexOf(buttons, x => x.cssClass == "add-button"), 1);
        buttons.push({
            title: 'Upload Drawing',
            icon:"fa fa-upload text-green",
            cssClass: 'export-xlsx-button',
            onClick: () => {

                var dialog = new DrawingImportDialog();
                dialog.element.on('dialogclose', () => {
                    grid.refresh();
                    dialog = null;
                });
                
                dialog.dialogOpen();
            }
        });

        return buttons;
    }
    protected getColumns(): Column[] {
        let columns =  super.getColumns();
        let documentListCol = columns.find(item=>item.field == "DocumentList")
        if(documentListCol){
            documentListCol.format = (ctx)=>{
                if (!ctx.item.DocumentList) return "";
                let items = JSON.parse(ctx.item.DocumentList);
                let host = window.location.protocol + "//" + window.location.host;

                let html = items.map((x: any) =>
                    `<div style="display: flex;justify-content: start;align-items: center;gap:10px;margin-bottom: 5px"><div style="width:40px;height:30px;line-height:30px;text-align: center;border-radius:5px;background-color:${x.Color};color:#ffffff">${x.Type}</div>
                    <div><a href="${host + "/upload/" + x.FileDirectory}"  target="_blank">${x.FileName}</a></div> </div>`
                ).join('');
                return `<div style="overflow-y:auto; margin-top: 3px; height: 100%; min-width:300px;">${html}</div>`
            }
        }

        
        let drawingConversionStatusCol = columns.find(item=>item.field == "DrawingConversionStatusName")
        if(drawingConversionStatusCol){
            drawingConversionStatusCol.formatter = (row,cell,value,column,item)=>{
                let html = `<b style="cursor:pointer;color:${item.DrawingConversionStatusColor};margin-right:10px" title="${item.DrawingConversionStatusName}">⬤</b> ${item.DrawingConversionStatusName}`
                return html
            }
        }

        let ocrStatusCol = columns.find(item=>item.field == "OcrStatusName")
        if(ocrStatusCol){
            ocrStatusCol.formatter = (row,cell,value,column,item)=>{
                let html = `<b style="cursor:pointer;color:${item.OcrStatusColor};margin-right:10px" title="${item.OcrStatusName}">⬤</b> ${item.OcrStatusName}`
                return html
            }
        }

        let costingStatusCol = columns.find(item=>item.field == "CostingStatusName")
        if(costingStatusCol){
            costingStatusCol.formatter = (row,cell,value,column,item)=>{
                let html = `<b style="cursor:pointer;color:${item.CostingStatusColor};margin-right:10px" title="${item.CostingStatusName}">⬤</b> ${item.CostingStatusName}`
                return html
            }
        }
        let balloonStatusCol = columns.find(item=>item.field == "BalloonStatusName")
        if(balloonStatusCol){
            balloonStatusCol.formatter = (row,cell,value,column,item)=>{
                let html = `<b style="cursor:pointer;color:${item.BalloonStatusColor};margin-right:10px" title="${item.BalloonStatusName}">⬤</b> ${item.BalloonStatusName}`
                return html
            }
        }
        columns.splice(1,0,{
            field: "View Result",
            name: '',
            format:ctx=>{
                return  `<div><button class="inline-action view-result-button btn btn-primary">View Result</button></div>`
            },
            width:150,
            minWidth:150
        })
        
        return columns
    }
    protected onClick(e,row:number,cell:number){
        super.onClick(e,row,cell);
        if(e.isDefaultPrevented()){
            return
        }

        let target = e.target as HTMLElement;
        if (target.parentElement && target.parentElement.classList.contains('inline-action')) {
            target = target.parentElement;
        }
        let item = this.itemAt(row);
        if (target.classList.contains("inline-action")) {
            e.preventDefault();

            if (target.classList.contains("view-result-button")) {
                let dlg = new CostingResultDialog(item.Id)
                dlg.dialogOpen()
            }
        }
    }
    protected getSlickOptions(): GridOptions {
        let opt = super.getSlickOptions();
        opt.rowHeight = 120;
        return opt;
    }
}