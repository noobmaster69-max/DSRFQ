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
                    console.log(this.form.ThreeDFileName.value)
                    console.log(this.form.TwoDFileName.value)
                    
                    if(this.form.TwoDFileName.value ==null && this.form.ThreeDFileName.value == null){
                        notifyError("Please at least upload a file!");
                        return;
                    }
                    // if (this.form.FileName.value.length==0 ) {
                    //     notifyError("Please at least upload a file!");
                    //     return;
                    // }
                    // let files  =this.form.FileName.value
                    //
                    //
                    CostingPartsService.Create({
                        Entity:{

                        }
                    },async response=>{
                        if(th.form.TwoDFileName.value != null){
                            const twoDext = th.form.TwoDFileName.value.OriginalName.split('.').pop().toLowerCase();
                            const twoD = ["pdf", "svg", "png", "jpg", "jpeg", "tiff", "bmp"];
                            let type = 1
                            if (twoD.includes(twoDext)){
                                type = 1
                            }
                            else{
                                type = 3
                            }
                            await CostingPartDocumentsService.Create({
                                Entity:{
                                    CostingPartId:response.EntityId,
                                    FileDirectory:th.form.TwoDFileName.value.Filename,
                                    FileName:th.form.TwoDFileName.value.OriginalName,
                                    Type: type
                                }
                            })
                        }
                        if(th.form.ThreeDFileName.value != null){
                            const threeDext = th.form.ThreeDFileName.value.OriginalName.split('.').pop().toLowerCase();
                            const threeD = ["stl", "step", "stp", "iges", "igs", "obj", "fbx", "gltf", "glb", "3mf"];
                            let type = 2
                            if (threeD.includes(threeDext)){
                                type = 2
                            }
                            else{
                                type = 3
                            }
                            await CostingPartDocumentsService.Create({
                                Entity:{
                                    CostingPartId:response.EntityId,
                                    FileDirectory:th.form.ThreeDFileName.value.Filename,
                                    FileName:th.form.ThreeDFileName.value.OriginalName,
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
                        th.element.trigger('dialogclose');

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
    protected onDialogClose(result?: string) {
        super.onDialogClose(result);
    }
}