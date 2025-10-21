import {stringFormat, faIcon, Authorization,notifyError, notifySuccess, serviceRequest,serviceCall} from "@serenity-is/corelib";
import {CreateUploadButton} from "./UploadDocument";
export default function pageInit({ nwLinkFormat }: { nwLinkFormat: string }){
    const nwLink = (s: string) => stringFormat(nwLinkFormat, s);

    document.getElementById("DrawingLibrary").append(<>
            <CreateUploadButton/>
        </>
    )
    // let data = {
    //     Message: "Testing MCB 345"
    // }
    // serviceRequest(
    //     "/UploadDrawing",
    //     data,
    //     response => {
    //         notifySuccess("Drawing uploaded successfully!");
    //        
    //     },
    //     {
    //         onError: (error) => {
    //             notifyError("Error uploading drawing: " + error.message);
    //         }
    //     }
    // );
}