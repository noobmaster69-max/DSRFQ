import { faIcon } from "@serenity-is/corelib";
import {DrawingImportDialog} from "./DrawingImportDialog";

export const CreateUploadButton = () => (
    <div style={{width:"100%",height:"40px"}}>
        <button id={"upload-document"} className="btn btn-primary" onClick={uploadDocument} style={{marginLeft:"auto",display:"flex",justifyContent:"center",alignItems:"center",gap:"15px"}}>
            <i class={faIcon("upload")} style={{fontSize:"20px"}}></i>
            <span>Upload Documents</span>
        </button>
    </div>
);
export function uploadDocument(){
    console.log("Upload Document")
    let dlg = new DrawingImportDialog()
    
    dlg.dialogOpen(false)
}
