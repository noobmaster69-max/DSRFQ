
import {faIcon, confirmDialog, serviceRequest, notifySuccess, notifyError, Authorization,informationDialog, resolveUrl, serviceCall} from "@serenity-is/corelib";
import {uuid} from "../../../Common/General/General";
import {SignUpResponse} from "../../../ServerTypes/Membership/SignUpResponse";
import {SignUpFormTexts} from "../../../ServerTypes/Texts";
import {EmailPromptDialog} from "../../../Common/Dialog/EmailPromptDialog";

export const CompanyDiv =  ({id, name, organizationId}: { id: number, name: string, organizationId: string }) => {

    return <div id={"organisation-detail-div"}>
        <div className={"block1"}>
            <input type={"hidden"} id={"company-id"} value={id}/>
            <h2 class={"section-title"}>Details</h2>

            <div class={"form-group"}>
                <label class={"form-label"}>Organization name</label>
                <p class={"form-description"}>Human-friendly label for your organization, shown in user interfaces</p>
                <input type="text" id="org-name" class="form-input" value={name}/>
            </div>

            <div class="form-group">
                <label class="form-label">Organization ID</label>
                <p class="form-description">Identifier for this organization sometimes used in API requests</p>
                <input type="text" class="form-input" value={organizationId} readOnly/>
            </div>

            <button class="btn btn-secondary" onClick="saveOrganization()">Save</button>
        </div>
        <div class="users-header">
            <div class={"title"}>Team Members</div>
            <button class="btn btn-primary" onClick={e => { e.preventDefault(); submitClick(); }}><i class={faIcon("plus")}
                                                                           style={{marginRight: "15px"}}></i>Invite
            </button>
        </div>
        <div id={"organization-member-list"}>
        </div>
    </div>
}
function submitClick() {
    // @ts-ignore
    new EmailPromptDialog({
        onSubmit: (email) => {
            let userDefinition = Authorization.userDefinition
            var request = {
                InvitedByUserId:userDefinition.UserId,
                DisplayName: userDefinition.DisplayName,
                Email: email
            }


            serviceCall({
                url: resolveUrl('~/Account/Invite'),
                request: { ...request},
                onSuccess: (response: SignUpResponse) => {
                    informationDialog(`The invitation has been sent to ${email}.`, () => {
                    });
                }
            });
        }
    }).dialogOpen();
    
    
    // confirmDialog(`<div style="white-space: initial">
    //         <input type="email" placeholder="Email Address">
    //     </div>`,()=>{
    //     let userDefinition = Authorization.userDefinition
    //     var request = {
    //         InvitedByUserId:userDefinition.UserId,
    //         DisplayName: userDefinition.DisplayName,
    //         Email: "weixuan.oh604@digitalisesolutions.com"
    //     }
    //
    //
    //     serviceCall({
    //         url: resolveUrl('~/Account/Invite'),
    //         request: { ...request},
    //         onSuccess: (response: SignUpResponse) => {
    //             informationDialog("The invitation has been sent.", () => {
    //             });
    //         }
    //     });
    // },{
    //     htmlEncode: false,
    //     title:"Invite User",
    //     icon:"trash"
    // })
    
}
export const CreateNewDiv = () => (
    <div style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",gap:"25px"}}>
        <div style={{fontSize:"18px"}}>You don't bind to any organisation yet. Start by creating an organisation.</div>
        <div id={"create-new-organization"} onClick={createNewOrganisation}>
            <div><i class={faIcon("plus")} style={{fontSize:"25px"}}> </i></div>
            <div>Create New</div>
        </div>
        <div id={"organisation-name-div"}><input type={"text"} id={"organisation-name"} placeholder={"Your Organisation Name"}/></div>
    </div>
);
export function createNewOrganisation(){
    const name = document.getElementById("organisation-name") as HTMLInputElement;
    if(name.value.length==0){
        name.style.border = "1px solid red";
        notifyError("Organization name cannot be empty.");
    }
    else{
        name.style.border="1px solid var(--s-input-border)"
        confirmDialog(`Create a new organisation with name ${name.value}?`,()=>{
            let data={
                OrganizationName:name.value,
                OrganizationId:uuid()
            }
            serviceRequest(
                "/CreateOrganization",
                data,
                response => {
                    notifySuccess("Organization created successfully!");
                    setTimeout(() => window.location.reload(), 1000); 

                },
                {
                    blockUI: true,
                    onError: (xhr) => {
                        notifyError("Error: " + xhr.responseText);
                    }
                }
            );
        })
        
    }
}