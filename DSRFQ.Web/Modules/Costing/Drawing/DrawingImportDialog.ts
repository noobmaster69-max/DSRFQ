import {
    Decorators,
    isEmptyOrNull,
    notifyError,
    notifySuccess,
    PropertyDialog,
    serviceRequest
} from "@serenity-is/corelib";
import {DrawingImportForm} from "./DrawingImportForm";
import {CostingPartsService} from "../../ServerTypes/Costing/CostingPartsService";
import {CostingPartDocumentsService} from "../../ServerTypes/Costing/CostingPartDocumentsService";


@Decorators.registerClass('DSRFQ.Drawing.DrawingImportDialog')
export class DrawingImportDialog extends PropertyDialog<any, any> {

    private form: DrawingImportForm;

    protected getFormKey() { return DrawingImportForm.formKey; }

    constructor() {
        super();
        let th = this
        this.form = new DrawingImportForm(this.idPrefix);
       
    }

    protected getDialogTitle(): string {
        return "Upload Drawing";
    }

    protected getDialogButtons() {
        let th = this
        return [
            {
                text: 'Import',
                click: () => {
                    if (!this.validateBeforeSave())
                        return;

                    if (this.form.FileName.value.length==0 ) {
                        notifyError("Please at least upload a file!");
                        return;
                    }
                    let files  =this.form.FileName.value
                    CostingPartsService.Create({
                        Entity:{
                            
                        }
                    },async response=>{
                        for(let i =0;i<files.length;i++){
                            const ext = files[i].OriginalName.split('.').pop().toLowerCase();

                            const twoD = ["pdf", "svg", "png", "jpg", "jpeg", "tiff", "bmp"];
                            const threeD = ["stl", "step", "stp", "iges", "igs", "obj", "fbx", "gltf", "glb", "3mf"];
                            let type = 1
                            if (twoD.includes(ext)){
                                type = 1
                            }
                            if (threeD.includes(ext)) {
                                type = 2
                            }

                            if (["dwg", "dxf"].includes(ext)){
                                type = 3
                            } 
                             await CostingPartDocumentsService.Create({
                                Entity:{
                                    CostingPartId:response.EntityId,
                                    FileDirectory:files[i].Filename,
                                    FileName:files[i].OriginalName,
                                    Type: type
                                }
                            })
                        }
                        let data = {
                            Message : response.EntityId.toString(),
                        }
                        serviceRequest(
                            "/UploadDrawing",
                            data,
                            response => {

                            },
                            {
                                onError: (error) => {
                                    notifyError("Error uploading drawing: " + error.message);
                                }
                            }
                        );
                        notifySuccess("The drawings have been uploaded.")
                        th.dialogClose()
                    })
                    
                    
                },
            },
            {
                text: 'Cancel',
                click: () => this.dialogClose()
            }
        ];
    }
}