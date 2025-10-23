import {
    BaseDialog,
    Criteria,
    Decorators,
    faIcon,
    LookupEditor, LookupEditorOptions,
    notifyWarning,
    ServiceLookupEditor,
    initFormType, notifySuccess
} from "@serenity-is/corelib";
import {CostingPartDocumentsService} from "../../ServerTypes/Costing/CostingPartDocumentsService";
import {CostingPartDocumentImagesService} from "../../ServerTypes/Costing/CostingPartDocumentImagesService";
import panzoom from "panzoom"
import  Zoomist from "zoomist"
import {CostingPartsService} from "../../ServerTypes/Costing/CostingPartsService";
import {MaterialForm} from "./MaterialForm";
import {MaterialsRow} from "../../ServerTypes/Material/MaterialsRow";
import {CostingPartBomResultsRow} from "../../ServerTypes/Costing/CostingPartBomResultsRow";
import {CostingPartBomResultsService} from "../../ServerTypes/Costing/CostingPartBomResultsService";
import {
    CostingPartSpecialProcessResultsService
} from "../../ServerTypes/Costing/CostingPartSpecialProcessResultsService";
import {CostingPartCostingResultsService} from "../../ServerTypes/Costing/CostingPartCostingResultsService";
@Decorators.panel(true)
export class CostingResultDialog<P = {}> extends BaseDialog<P> {
    protected costingPartId;
    private state: { fileUrl?: string } = {};
    protected documentId
    protected bomId = []
    constructor(costingPartId?) {
        super();
        let th = this
        let mainId = `${this.idPrefix}Main`
        this.costingPartId = costingPartId

        const typeColors: Record<number, { color: string; label: string }> = {
            1: { color: "#007bff", label: "2D" },
            2: { color: "#28a745", label: "3D" },
            3: { color: "#6c757d", label: "Other" }
        };


        CostingPartDocumentsService.List({
            Criteria:Criteria.and(Criteria("IsActive").eq("1"),Criteria("CostingPartID").eq(this.costingPartId)),
            Sort:["Type ASC"]
        },response => {
            let header :any
            let host = window.location.protocol + "//" + window.location.host;
            let directory = response.Entities.find(item=>item.Type==1)
            let structure = <>
                {response.Entities.map((data,index)=>{
                    const { color, label } = typeColors[data.Type] ?? {
                        color: "#6c757d",
                        label: "Other"
                    };
                    return (<li key={index}
                                className={index === 0 ? "nav-item header" : "nav-item"}>
                        <a
                            className={`nav-link ${index === 0 ? "active" : ""}`}
                            href="#"
                            data-bs-toggle="tab"
                            aria-selected={index === 0 ? "true" : "false"}
                            role="tab"
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "start",
                                    alignItems: "center",
                                    gap: "10px",
                                    marginBottom: "5px"
                                }}
                            >
                                <div
                                    style={{
                                        width: "40px",
                                        height: "30px",
                                        lineHeight: "30px",
                                        textAlign: "center",
                                        borderRadius: "5px",
                                        backgroundColor: color,
                                        color: "#ffffff"
                                    }}
                                >
                                    {label}
                                </div>
                                <div>
                                    <a
                                        href={`${host}/upload/${data.FileDirectory}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{textDecoration:"none"}}
                                    >
                                        {data.FileName}
                                    </a>
                                </div>
                                <div onClick={()=>{
                                    window.open(`${host}/upload/${data.FileDirectory}`,"_blank")
                                }} style={{backgroundColor:"#2778b9",color:"#ffffff",fontSize:"16px",width:"25px",height:"25px",borderRadius:"5px",display:"flex",justifyContent:"center",alignItems:"center"}}>
                                    <i class={[faIcon("file-download")]}></i>
                                </div>
                            </div>
                        </a>
                    </li>)
                })}
            </>

            document.getElementById(`drawingTab`).append(structure)

            if(directory){
                let filePath = `${host}/upload/${directory.FileDirectory}`;

                let documentId = directory.Id
                this.documentId = documentId
                th.changeCarousel(documentId,true)
                document.getElementById("download-converted-button").onclick = function(){

                    const url = `${host}/upload/${directory.ConvertedFileDirectory}`;

                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }


            }

        })
        CostingPartsService.Retrieve({
            EntityId: costingPartId
        },costingPartResponse=>{
            let weightUnitCode = costingPartResponse.Entity.WeightUnitCode == undefined? "": costingPartResponse.Entity.WeightUnitCode
            let volumeUnitCode = costingPartResponse.Entity.VolumeUnitCode == undefined? "" : costingPartResponse.Entity.VolumeUnitCode
            document.getElementById("PartNumber").value = costingPartResponse.Entity.PartNumber
            document.getElementById("Revision").value = costingPartResponse.Entity.Revision
            document.getElementById("Description").value = costingPartResponse.Entity.Description
            document.getElementById("CustomerName").value = costingPartResponse.Entity.CustomerName
            document.getElementById("Uom").value = costingPartResponse.Entity.Uom
            document.getElementById("Material").value = costingPartResponse.Entity.Material
            document.getElementById("NumberOfFace").innerText = String(costingPartResponse.Entity.NumberOfFace)
            document.getElementById("NumberOfHole").innerText = String(costingPartResponse.Entity.NumberOfHole)
            document.getElementById("GrossWeight").innerText = String(costingPartResponse.Entity.GrossWeight) + " " + String(weightUnitCode)
            document.getElementById("NetWeight").innerText = String(costingPartResponse.Entity.NetWeight) + " " + String(weightUnitCode)
            document.getElementById("RemovedWeight").innerText = (costingPartResponse.Entity.GrossWeight - costingPartResponse.Entity.NetWeight).toFixed(2) + " " +  String(weightUnitCode)
            document.getElementById("GrossVolume").innerText = String(costingPartResponse.Entity.GrossVolume) + " " + String(volumeUnitCode)
            document.getElementById("NetVolume").innerText = String(costingPartResponse.Entity.NetVolume) + " " + String(volumeUnitCode)
            document.getElementById("RemovedVolume").innerText = (costingPartResponse.Entity.GrossVolume - costingPartResponse.Entity.NetVolume).toFixed(2) + " " +  String(volumeUnitCode)
            document.getElementById("Length").value = String(costingPartResponse.Entity.Length==undefined?0:costingPartResponse.Entity.Length)
            document.getElementById("Width").value = String(costingPartResponse.Entity.Width==undefined?0:costingPartResponse.Entity.Width)
            document.getElementById("Height").value = String(costingPartResponse.Entity.Height==undefined?0:costingPartResponse.Entity.Height)

            if(costingPartResponse.Entity.PartPicture!=undefined){
                document.getElementById("PartImage").innerHTML = `<div style="width:250px;height:180px">
                    <img src="/upload/${costingPartResponse.Entity.PartPicture}" style="width:250px;max-width: 100%; height:auto;max-height:100%" />
                </div>`
            }

            if(costingPartResponse.Entity.MaterialId==undefined){
                document.getElementById("MaterialLink").innerHTML = `<i class="fa fa-unlink"></i>`

                document.getElementById("MaterialLink").style.backgroundColor = "#ff0055"
                document.getElementById("MaterialLink").style.color = "#ffffff"
                document.getElementById("MaterialLink").title = "Not link to material in master table."

            }
            else{
                document.getElementById("MaterialLink").innerHTML = `<i class="fa fa-link"></i>`

                document.getElementById("MaterialLink").style.backgroundColor = "#27dc3c"
                document.getElementById("MaterialLink").style.color = "#ffffff"
                document.getElementById("MaterialLink").title = "Linked to material in master table."
            }

            if(costingPartResponse.Entity.DimensionUnitId==undefined){
                document.getElementById("DimensionUnitLink").innerHTML = `<i class="fa fa-unlink"></i>`

                document.getElementById("DimensionUnitLink").style.backgroundColor = "#ff0055"
                document.getElementById("DimensionUnitLink").style.color = "#ffffff"
                document.getElementById("DimensionUnitLink").title = "Not link to dimension unit in master table."

            }
            else{
                document.getElementById("DimensionUnitLink").innerHTML = `<i class="fa fa-link"></i>`

                document.getElementById("DimensionUnitLink").style.backgroundColor = "#27dc3c"
                document.getElementById("DimensionUnitLink").style.color = "#ffffff"
                document.getElementById("DimensionUnitLink").title = "Linked to dimension unit in master table."
            }


        })
        CostingPartBomResultsService.List({
            Criteria:Criteria.and(Criteria("IsActive").eq("1"),Criteria("CostingPartID").eq(th.costingPartId))
        },bomResponse=>{
            th.bomId = bomResponse.Entities.map(item=>item.Id)
            let bom = <>
                {

                    bomResponse.Entities.map((data,index)=>{
                        return (<tr className={"bom-row"} data-id={data.Id}>
                            <td>
                                <button className="btn"
                                        style="margin-left:5px;width:25px;height:25px;font-weight:bold;
                                          border-radius:5px;display:flex;justify-content:center;align-items:center;
                                          background-color:#ff5500;color:#ffffff;font-size:15px">
                                    <i className="fa fa-trash"></i>
                                </button>
                            </td>
                            <td className={"row-index"}>{index + 1}


                            </td>
                            <td><input name={"BomPartNumber"} className={"table-input"} value={data.PartNumber} type={"text"}/></td>
                            <td><input name={"BomDescription"} className={"table-input"}
                                       value={data.Description == undefined ? "" : data.Description} type={"text"}/>
                            </td>
                            <td><input name={"BomQuantity"} className={"table-input"} value={data.Quantity} type={"text"}/></td>
                            <td><input name={"BomInternalEngineeringNumber"} className={"table-input"} value={data.InternalEngineeringNumber==undefined?"":data.InternalEngineeringNumber} type={"text"}/></td>
                        </tr>)
                    })
                }
            </>

            document.getElementById("bom-body").innerHTML = ""
            document.getElementById("bom-body").append(bom)
        })
        CostingPartSpecialProcessResultsService.List({
            Criteria:Criteria.and(Criteria("IsActive").eq("1"),Criteria("CostingPartID").eq(th.costingPartId))
        },spResponse=>{

            let sp = <>
                {
                    spResponse.Entities.map((data,index)=>{
                        return (<tr>
                            <td>{index+1}</td>
                            <td>{data.SpecialProcessName}</td>

                        </tr>)
                    })
                }
            </>

            document.getElementById("sp-body").innerHTML = ""
            document.getElementById("sp-body").append(sp)
        })
        CostingPartCostingResultsService.List({
            Criteria:Criteria.and(Criteria("IsActive").eq("1"),Criteria("CostingPartID").eq(th.costingPartId))
        },costingResult=>{
            let total = costingResult.Entities.reduce((accumulator,currentValue)=>{
                return accumulator + currentValue.Total
            },0).toFixed(2)
            let currencyCode = ""
            if(costingResult.Entities.length>0){
                currencyCode = costingResult.Entities[0].CurrencyCode
            }
            let cr = <>
                {
                    costingResult.Entities.map((data,index)=>{
                        return (<tr>
                            <td>{index+1}</td>
                            <td>{data.CostingCategoryId==undefined?"":data.CostingCategoryId}</td>
                            <td>{data.Name}</td>
                            <td>{data.Description}</td>
                            <td>{data.Quantity}</td>
                            <td>{data.UnitPrice}</td>
                            <td>{data.Total}</td>
                            <td>{data.CurrencyCode}</td>

                        </tr>)
                    })

                }

            </>
            let footer = <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td className={"footer-total"}>{total}</td>
                <td className={"footer-total"}>{currencyCode}</td>
            </tr>
            document.getElementById("costing-body").innerHTML = ""
            document.getElementById("costing-body").append(cr)
            document.getElementById("costing-footer").innerHTML = ""
            document.getElementById("costing-footer").append(footer)
            document.getElementById("costing-summary-currency").innerHTML = currencyCode
            document.getElementById("costing-summary-total").innerHTML = String(total)


        })
        this.addBom()
        this.saveResult()

    }
    protected addBom(){
        const bomButton = document.getElementById("add-bom-button");
        const bomBody = document.getElementById("bom-body");

        bomButton.addEventListener("click", function () {
            const rowCount = bomBody.rows.length;
            const newRow = document.createElement("tr");
            newRow.classList.add("bom-row");

            newRow.innerHTML = `
               <td><button class="btn"
                    style="margin-left:5px;width:25px;height:25px;font-weight:bold;
                      border-radius:5px;display:flex;justify-content:center;align-items:center;
                      background-color:#ff5500;color:#ffffff;font-size:15px">
                <i class="fa fa-trash"></i>
                </button></td>
              <td class="row-index">${rowCount + 1}</td>
              <td><input class="table-input" type="text" value="" name="BomPartNumber"/></td>
              <td><input class="table-input" type="text" value="" name="BomDescription"/></td>
              <td><input class="table-input" type="text" value="" name="BomQuantity"/></td>
              <td><input class="table-input" type="text" value="" name="BomInternalEngineeringNumber"/></td>
            `;

            bomBody.appendChild(newRow);
        });
        function updateRowNumbers() {
            [...bomBody.rows].forEach((row, index) => {
                const td = row.cells[1];
                td.innerHTML = `${index + 1}`;
            });
        }


        bomBody.addEventListener("click", function (e) {
            if (e.target.closest(".fa-trash")) {
                const row = e.target.closest("tr");
                row.remove();
                updateRowNumbers();
            }
        });
    }
    protected saveResult(){
        let th = this
        const savableFields = ['PartNumber', 'Revision', 'Description','CustomerName','Uom','Length','Width','Height'];
        let saveButton = document.getElementById("save-button");
        saveButton.addEventListener('click', async (event) => {
            const target = event.target;
            let request = {}
            for (let  i = 0;i<savableFields.length; i++){
                let className = savableFields[i]
                let input:HTMLInputElement = document.getElementById(className)
                if(input!=null){
                    let inputValue = input.value
                    request[className] = inputValue
                }



            }
            const rows = document.querySelectorAll("#bom-body .bom-row");
            const currentIds = [];

            function safeVal(row, name) {
                const el = row.querySelector(`input[name="${name}"]`);
                return (el && el.value) ? el.value.trim() : "";
            }
            async function syncBomRows(th) {
                const rows = document.querySelectorAll("#bom-body .bom-row");
                const currentIds = [];

                for (const row of rows) {
                    const id = row.getAttribute("data-id");

                    const partNumber = safeVal(row, "BomPartNumber");
                    const description = safeVal(row, "BomDescription");
                    const quantity = safeVal(row, "BomQuantity");
                    const internalEngineeringNumber = safeVal(row, "BomInternalEngineeringNumber");
                    if (!id || id === "null") {
                        // Insert
                        await CostingPartBomResultsService.Create({
                            Entity: {
                                CostingPartId: th.costingPartId,
                                PartNumber: partNumber,
                                Description: description,
                                Quantity: quantity,
                                InternalEngineeringNumber: internalEngineeringNumber,
                                IsManual: true
                            }
                        });
                    } else {
                        const parsedId = parseInt(id, 10);
                        currentIds.push(parsedId);

                        if (th.bomId.includes(parsedId)) {
                            // Update
                            await CostingPartBomResultsService.Update({
                                EntityId: parsedId,
                                Entity: {
                                    CostingPartId: th.costingPartId,
                                    PartNumber: partNumber,
                                    Description: description,
                                    Quantity: quantity,
                                    InternalEngineeringNumber: internalEngineeringNumber
                                }
                            });
                        }
                    }
                }

                // Delete missing
                for (const dbId of th.bomId) {
                    if (!currentIds.includes(dbId)) {
                        await CostingPartBomResultsService.Delete({
                            EntityId: dbId
                        });
                    }
                }
            }
            await syncBomRows(th);

            CostingPartsService.Update({
                EntityId:this.costingPartId,
                Entity:request
            },saveResponse=>{
                notifySuccess("Info has been saved.")
            })


        })

    }
    protected detectChanges(){

        const savableFields = ['PartNumber', 'Revision', 'Description','Uom'];


        const Service = {
            Update: function(request) {
                console.log('🚀 Saving to server:', request);
                // This is where your real API call (e.g., fetch) would go.
                // fetch(`/api/YourEndpoint/Update`, { 
                //   method: 'POST', 
                //   body: JSON.stringify(request) 
                // });

                // Simulating a network delay
                return new Promise(resolve => {
                    setTimeout(() => {
                        console.log('✅ Save successful!');
                        resolve({ success: true, data: request });
                    }, 400);
                });
            }
        };

        function debounce(func, delay = 500) {
            let timeoutId;
            return function(...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                }, delay);
            };
        }


        document.body.addEventListener('input', (event) => {
            const target = event.target;

            // Find which 'savable' class this input has
            const fieldName = Array.from(target.classList).find(cls => savableFields.includes(cls));

            // If this input's class isn't in our savableFields list, do nothing.
            if (!fieldName) {
                return;
            }

            // Get the new value
            const value = target.value;


            const debouncedServiceUpdate = debounce(CostingPartsService.Update, 1500);


            const request = {
                EntityId: parseInt(this.costingPartId),
                Entity: {
                    [fieldName]: value
                }
            };
            debouncedServiceUpdate(request);
        });
    }
    protected changeCarousel(documentId,original){
        let isOriginal = original ==true?1:0
        CostingPartDocumentImagesService.List({
            Criteria:Criteria.and(Criteria("IsActive").eq("1"),Criteria("CostingPartDocumentID").eq(documentId),Criteria("Original").eq(isOriginal)),
            Sort:["Page ASC"]
        },imagesResponse=>{
            document.getElementById("carousel-display").innerHTML = ''
            document.getElementById("carousel-indicator").innerHTML = ''

            if(imagesResponse.Entities.length==0){
                notifyWarning("There are no images available.")
            }
            let structure = <> {imagesResponse.Entities.map((data,index)=>{
                return (<div id={"image-" + index} className={["carousel-item",index==0?"active":""]}>
                    <div className={"zoomist-wrapper"}>
                        <div className={"zoomist-image"} style={{width:"100%",height:"680px"}}>
                            <img className={"d-block w-100"} src={'/upload/' + data.FileDirectory} style={{width:"100%",maxHeight:"100%",height:"auto"}} />
                        </div>
                    </div>
                </div>)

            }) } </>

            let indicator = <>
                {
                    imagesResponse.Entities.map((data,index)=>{
                        return (<button
                            type="button"
                            data-bs-target="#carouselExampleControls"
                            data-bs-slide-to={index}
                            className="active"
                            aria-current="true"
                            aria-label={"Slide " + String(index+1)}
                            style={{width:"fit-content"}}
                        >
                            <img src={'/upload/' + data.FileDirectory} className="d-block" width="150" />
                        </button>)
                    })
                }
            </>
            document.getElementById("carousel-display").append(structure)
            document.getElementById("carousel-indicator").append(indicator)
            let zoomists: Record<number, Zoomist> = {};
            let  carouselRef: HTMLDivElement | null = null;
            let zoomist:any
            imagesResponse.Entities.forEach((data,index)=>{
                // var element = document.getElementById("image-" + index)
                //
                // panzoom(element)
                if(index==0){
                    zoomist = new Zoomist("#image-" +index, {
                        slider: true,
                        zoomer: true,
                        smooth: true,
                    });
                }

            })
            document.getElementById("carouselExampleControls").addEventListener("slide.bs.carousel", (e: any) => {
                const newIndex = e.to;

                const selector = "#image-" + newIndex;
                const element = document.querySelector(selector) as HTMLElement;

                function initWhenVisible() {
                    if (element && window.getComputedStyle(element).display !== "none") {
                        zoomist = new Zoomist(selector, {
                            slider: true,
                            zoomer: true,
                            smooth: true,
                        });
                    } else {
                        requestAnimationFrame(initWhenVisible);
                    }
                }

                initWhenVisible();
            });
        })
    }


    protected renderContents(): any {
        // @ts-ignore
        return (
            <>
                <style>
                    {`.carousel {
                    position: relative;
                 }           
                 .carousel-control-prev , .carousel-control-next {
                    position: absolute;
                    top: 50%;
                    transform: TranslateY(-75%);
                    width:50px;
                 }
                 .carousel-control-prev {
                    right: auto;
                 }
                 .carousel-control-next {
                    left: auto;
                 }
                 .carousel-indicators{
                    position: static !important;   
                      display: flex !important;      
                      justify-content: flex-start;   
                      width: 100%;
                      overflow-x: auto;              
                      margin-left: 0 !important;
                      margin-right: 0 !important;
                      gap: 0.5rem;                  
                      height: 140px;
                 }
                 
                
                  .zoomer-btn {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 3rem;
                    height: 3rem;
                    background-color: #efefef;
                  }
                  .zoomer-btn.zoomer-disabled {
                    opacity: 0.2;
                  }
                  .change-image-btn {
                    padding: 0.5rem;
                    background-color: #eee;
                  }
                  #drawingDetail{
                    display:flex;
                    flex-direction: column;
                    justify-content: start;
                    align-items: center;
                    padding:15px;
                
                  }
                  .detail-item{
                    display:flex;
                    justify-content:start;
                    align-items: start;
                    gap:20px;
                    min-height: 40px;
                    width:100%;
                    margin:15px 0
                  }
                  .detail-title{
                    width:150px;
                    text-align: right;
                    font-weight:500;
                    color:var(--s-pager-text);
                    display: flex;
                    justify-content: end;
                    align-items:center;
                    gap:10px;
                  }
                  .detail-content{
                    flex:1;
                    text-align: left;
                    font-weight:500;
                  }
                  .link-status{
                    width:30px;
                    height:30px;
                    border-radius:5px;
                    text-align: center;
                    line-height:30px;
                  }
                  .link{
                    color:#ffffff;
                    background-color:#747870;
                    width:30px;
                    height:30px;
                    border-radius:5px;
                    text-align: center;
                    line-height:30px;
                  }
                  .detail-item-dropdown{
                    width:100%;
                    display:flex;
                    justify-content: start;
                    align-items: center;
                    gap:10px;
                  }
                  .detail-item-dropdown-input{
                    flex: 1
                  }
                  table {
                        width: 100%;
                        border-collapse: collapse; /* Removes space between cell borders */
                        font-size: 0.9rem;
                    }
            
                    thead th {
                        text-align: left;
                        padding: 12px 15px;
                        color: #6c757d; /* Brighter, more prominent text for headers */
                        font-weight: 600;
                        letter-spacing: 0.05em; /* Adds a touch of class */
                        text-transform: uppercase;
                       
                    }
            
                    tbody td {
                        padding: 12px 15px;
                        border-top: 1px solid #233554;
                    }
                    tfoot td{
                        padding: 12px 15px;
                    }
                    
                    tbody tr:first-child td {
                        border-top: none;
                    }
            
                    tbody tr:hover {
                        cursor: pointer;
                    }
                    #bom{
                        width:100%
                    }
                    .panel-body,.s-Panel{
                        min-height:100%;
                        height:fit-content;
                    }
                    section{
                         min-height:100%;
                        height:fit-content;
                    }
                    .tab-content{
                        width:100%;
                    }
                    .footer-total{
                        font-size:18px;
                        font-weight:bold;
                    }
                    #costing-summary{
                        width:250px;
                        height:60px;
                        display:flex;
                        justify-content:space-around;
                        align-items: center;
                        font-size:20px;
                        font-weight:bold;
                        border-radius:10px;
                        background-color:var(--s-placeholder);
                        margin:15px 0;
                        
                    }
                    .dimension{
                        width:80px;
                        height:36px;
                        line-height:36px;
                        text-align:center;
                    }
                    .dimension-category{
                        width:80px;
                        height:36px;
                        line-height:36px;
                        color:#ffffff;
                        text-align:center;
                        background-color:#27dc3c;
                        margin-top:10px;
                    }
                    
                     .table-input{
                        width:100%;
                    }
                    :root {
                        --primary-color: #2563eb;
                        --accent-color: #f97316;
                        --background-light: #f8fafc;
                        --border-light: #e2e8f0;
                        --text-dark: #1e293b;
                        --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                        --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                        --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                    }
                
                    .enhanced-table {
                        background-color: var(--s-card-bg) !important;
                        border-radius: 20px;
                        overflow: hidden;
                        box-shadow: var(--shadow-md);
                        border: 1px solid var(--border-light);
                    }
                
                    .table-header {
                        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                        border-bottom: 2px solid var(--border-light);
                    }
                
                    .table th {
                        border: none;
                        padding: 20px 16px;
                        font-weight: 700;
                        font-size: 0.875rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        color: var(--s-card-title);
                        position: relative;

                    }
                
                    .table th:not(:last-child)::after {
                        content: '';
                        position: absolute;
                        right: 0;
                        top: 25%;
                        height: 50%;
                        width: 1px;
                        background: var(--border-light);
                    }
                
                    .table td {
                        border: none;
                        padding: 20px 16px;
                        vertical-align: middle;
                        border-bottom: 1px solid #f1f5f9;
                        transition: all 0.3s ease;
                    }
                
                    .table tbody tr {
                        transition: all 0.3s ease;
                    }
                
                    .table tbody tr:hover {
                        background: linear-gradient(135deg, rgba(37, 99, 235, 0.02), rgba(59, 130, 246, 0.02));
                        transform: translateX(4px);
                        box-shadow: inset 4px 0 0 var(--primary-color);
                    }
                
                    /* Enhanced Add Button */
                    .btn-add {
                        width: 44px;
                        height: 44px;
                        border-radius: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, var(--accent-color), #ea580c);
                        border: none;
                        color: white;
                        font-size: 18px;
                        box-shadow: var(--shadow-md);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        overflow: hidden;
                    }
                    #bom{
                        background-color: var(--s-card-bg);
                    }
                    #bom:not(.show) {
                      display: none; 
                    }
                    .tab-pane.active {
                      display: block;
                    }
                    #costingDetail:not(.show) {
                        display: none;
                    }
                    .drawing-error-category{
                      display:flex;
                      height:40px;
                      justify-content: start;
                      align-items: center;
                      border:1px solid var(--s-input-border);
                      border-radius:5px;
                      margin-top:10px;
                    }
                    .drawing-error-category-input-div{
                      width: 40px;
                      height: 40px;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      margin-right:10px;
                      
                    }
                    .drawing-error-category-input{
                        width:100%
                    }
                    .drawing-error-category-name{
                      word-wrap: break-word;    
                        white-space: normal;
                        padding:10px;
                    }
                 `

                    }
                </style>
                <div id={`${this.idPrefix}Main`} >
                    <ul  className="nav nav-tabs" role="tablist" id={"drawingTab"}></ul>
                    <div style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:'center'}}>
                        <div id={"costing-summary"}>
                            <div id={"costing-summary-currency"}></div>
                            <div id={"costing-summary-total"}>800</div>
                        </div>
                        <div>
                            <button className={"btn btn-primary"} id={"save-button"} style={{width:"150px",fontSize:"18px"}}><i className={"fa fa-save"} style={{marginRight:"20px"}}></i>Save</button>
                        </div>
                    </div>

                    <div style={{display:"flex",justifyContent:"center",alignItems:"start",flexWrap: "wrap",gap:"10px"}}>
                        <div  style={{maxWidth:"1200px",height:"850px"}}>
                            <div id="carouselExampleControls" class="carousel slide" style={{width:"100%",height:"100%"}}>
                                <div className={"carousel-inner"} id={"carousel-display"}>

                                </div>
                                <a class="carousel-control-prev" href="#carouselExampleControls" role="button" data-bs-slide="prev">
                                    <span class="carousel-control-prev-icon" style={{filter:"invert(100%)"}} aria-hidden="true"></span>
                                    <span class="sr-only">Previous</span>
                                </a>
                                <a class="carousel-control-next" href="#carouselExampleControls" role="button" data-bs-slide="next">
                                    <span class="carousel-control-next-icon" style={{filter:"invert(100%)"}} aria-hidden="true"></span>
                                    <span class="sr-only">Next</span>
                                </a>

                                <div className="carousel-indicators position-static mt-3" id={"carousel-indicator"}>

                                </div>
                            </div>


                        </div>
                        <div style={{flex:"1 1 450px",height:"850px",overflowY:"auto"}}>
                            <ul  className="nav nav-tabs" role="tablist" >
                                <li className={ "nav-item header"}>
                                    <a className={`nav-link active`} href="#drawingDetail" data-bs-toggle="tab" aria-selected="true" role="tab">Drawing Detail</a>
                                </li>
                                <li  className={"nav-item"}>
                                    <a className={`nav-link`} href="#costingDetail" data-bs-toggle="tab" aria-selected="false" role="tab">Costing</a>
                                </li>
                                <li className={"nav-item"}>
                                    <a className={`nav-link`} href="#ballooningDetail" data-bs-toggle="tab" aria-selected="false" role="tab">Ballooning</a>
                                </li>
                            </ul>
                            <div class="tab-content">
                                <div class="tab-pane fade" id="ballooningDetail" role="tabpane3">

                                </div>
                                <div className="tab-pane fade" id="costingDetail" role="tabpanel">
                                        <table  class="table enhanced-table table-striped">
                                            <thead class="table-header">
                                            <tr>
                                                <th>#</th>
                                                <th>Costing Category</th>
                                                <th>Name</th>
                                                <th>Description</th>
                                                <th>Quantity</th>
                                                <th>Unit Price</th>
                                                <th>Total</th>
                                                <th>Currency</th>
                                            </tr>
                                            </thead>
                                            <tbody id={"costing-body"}>

                                            </tbody>
                                            <tfoot id={"costing-footer"}></tfoot>
                                        </table>
                                </div>
                                <div class="tab-pane fade show active" id="drawingDetail" role="tabpane1">
                                    <div style={{
                                        color: "var(--s-category-title)",
                                        textTransform: "uppercase",
                                        margin: "15px",
                                        fontSize: "1rem",
                                        width: "100%",
                                        fontWeight: " 600"
                                    }}>Drawing Conversion
                                    </div>
                                    <div style={{
                                        display: "flex",
                                        width: "100%",
                                        justifyContent: "space-evenly",
                                        alignItems: "center"
                                    }}>
                                        <button className={"btn btn-primary"} id={"view-original-button"}
                                                onClick={() => this.changeCarousel(this.documentId, true)}>View Original
                                        </button>
                                        <button className={"btn btn-primary"} id={"view-converted-button"}
                                                onClick={() => this.changeCarousel(this.documentId,false)} >View Converted</button>
                                        <button className={"btn btn-primary"} id={"download-converted-button"}>Download Converted</button>
                                    </div>
                                    <div style={{color: "var(--s-category-title)",
                                        textTransform: "uppercase",
                                        margin: "15px",
                                        fontSize: "1rem",
                                        width: "100%",
                                        fontWeight:" 600"}}>Drawing Detail</div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Part Image</div>
                                        <div className={"detail-content"} id={"PartImage"}>

                                        </div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Part Number</div>
                                        <div className={"detail-content"}>
                                            <input id={"PartNumber"} className={"auto-save PartNumber"} type={"text"} style={{width:"100%",height:"36px"}}/>
                                        </div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Revision</div>
                                        <div className={"detail-content"}>
                                            <input id={"Revision"} className={"auto-save Revision"} type={"text"} style={{width:"100%",height:"36px"}}/>
                                        </div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Description</div>
                                        <div className={"detail-content"}>
                                            <input id={"Description"} className={"auto-save Description"} type={"text"} style={{width:"100%",height:"36px"}}/>
                                        </div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Customer</div>
                                        <div className={"detail-content"}>
                                            <input id={"CustomerName"} className={"auto-save CustomerName"} type={"text"} style={{width:"100%",height:"36px"}}/>
                                        </div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Unit Of Measurement
                                            <span><div id={"DimensionUnitLink"} className={"link-status"}></div></span></div>
                                        <div className={"detail-content"}>
                                            <input id={"Uom"} type={"text"} className={"auto-save Uom"} style={{width:"100%",height:"36px"}}/>
                                        </div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Dimension</div>
                                        <div className={"detail-content"} id={"Dimension"} style={{display:"flex",justifyContent:"start",alignItems:"center",gap:"20px"}}>
                                            <div>
                                                <div className={"dimension"}><input id={"Length"} type={"text"} className={"auto-save Length"} style={{width:"100%",height:"36px"}}/></div>
                                                <div className={"dimension-category"}>Length</div>
                                            </div>
                                            <div>
                                                <div className={"dimension"}><input id={"Width"} type={"text"} className={"auto-save Width"} style={{width:"100%",height:"36px"}}/></div>
                                                <div className={"dimension-category"}>Width</div>
                                            </div>
                                            <div>
                                                <div className={"dimension"}><input id={"Height"} type={"text"} className={"auto-save Height"} style={{width:"100%",height:"36px"}}/></div>
                                                <div className={"dimension-category"}>Height</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Material
                                            <span><div id={"MaterialLink"} className={"link-status"}></div></span></div>
                                        <div className={"detail-content"}>
                                            <input id={"Material"} type={"text"} className={"auto-save Material"} style={{width:"100%",height:"36px"}}/>

                                        </div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Gross Volume</div>
                                        <div className={"detail-content"} id={"GrossVolume"}></div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Net Volume</div>
                                        <div className={"detail-content"} id={"NetVolume"}></div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Removed Volume</div>
                                        <div className={"detail-content"} id={"RemovedVolume"}></div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Gross Weight</div>
                                        <div className={"detail-content"} id={"GrossWeight"}></div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Net Weight</div>
                                        <div className={"detail-content"} id={"NetWeight"}></div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Removed Weight</div>
                                        <div className={"detail-content"} id={"RemovedWeight"}></div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Number Of Faces</div>
                                        <div className={"detail-content"} id={"NumberOfFace"}></div>
                                    </div>
                                    <div className={"detail-item"}>
                                        <div className={"detail-title"}>Number Of Holes</div>
                                        <div className={"detail-content"} id={"NumberOfHole"}></div>
                                    </div>


                                    <ul  className="nav nav-tabs" role="tablist" style={{width:"100%"}} >
                                        <li className={ "nav-item header"}>
                                            <a className={`nav-link active`} href="#bom" data-bs-toggle="tab" aria-selected="true" role="tab">BOM</a>
                                        </li>
                                        <li  className={"nav-item"}>
                                            <a className={`nav-link`} href="#specialProcess" data-bs-toggle="tab" aria-selected="false" role="tab">Special Process</a>
                                        </li>

                                    </ul>
                                    <div className={"tab-content"}>
                                        <div class="tab-pane fade show active" id="bom" role="tabpane1">
                                            <table class="table enhanced-table table-striped">
                                                <thead class="table-header">
                                                <tr>
                                                    <th></th>
                                                    <th><button id="add-bom-button" className={"btn"} style={{width:"30px",height:"30px",fontWeight:"bold",borderRadius:"5px",display:"flex",justifyContent:"center",alignItems:"center",backgroundColor:"var(--bs-orange)",color:"#ffffff",fontSize:"18px"}}><i className={"fa fa-plus"}></i></button></th>
                                                    <th>Part Number</th>
                                                    <th>Description</th>
                                                    <th>Quantity</th>
                                                    <th>TC Eng No</th>
                                                </tr>
                                                </thead>
                                                <tbody id={"bom-body"}>

                                                </tbody>
                                            </table>
                                        </div>
                                        <div class="tab-pane fade" id="specialProcess" role="tabpane1">
                                            <table  class="table enhanced-table table-striped">
                                                <thead class="table-header">
                                                <tr>
                                                    <th>#</th>
                                                    <th>Name</th>

                                                </tr>
                                                </thead>
                                                <tbody id={"sp-body"}>

                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div></>)

    }
    protected event(){

    }
    protected getDialogOptions() {
        var opt = super.getDialogOptions();
        opt.title = 'Results';
        opt.modal = false;
        opt.backdrop = true;
        return opt;
    }
}
