import {stringFormat, faIcon, Authorization,notifyError, notifySuccess, serviceRequest,serviceCall} from "@serenity-is/corelib";
import {CompanyDiv, CreateNewDiv} from "./organizationDetail/organization-detail";
export default function pageInit({ nwLinkFormat }: { nwLinkFormat: string }){
    const nwLink = (s: string) => stringFormat(nwLinkFormat, s);
    
    serviceCall({
        url: '/FetchCompanyDetail',
        request: {},
        blockUI: false
    }).then(response => {
        if( Object.keys(response).length > 0){
            document.getElementById("OrganizationDetail").append(<>
                    <CompanyDiv id={response.Id} name={response.Name} organizationId={response.OrganizationId}/>
                </>
            )
            let data = {
                CompanyId: response.Id
            }
            let users = []
            
            let selfId = Authorization.userDefinition.UserId
            serviceRequest(
                "/FetchCompanyUser",
                data,
                response => {
                    users = response
                    let userMap = <div>
                        {users.map(user => (
                            <div className="user-item" key={user.UserId}>
                                <div className="user-info">
                                    <div className="user-avatar">{user.UserImage==undefined?"":<img src={"/upload/"+user.UserImage}/>}</div>
                                    <div className="user-details">
                                        <div style={{display:"flex",alignItems:"center"}}><div className="user-name">{user.DisplayName} </div>{user.UserId==selfId?<div className="user-you">You</div>:""}</div>
                                        <div className="user-email">{user.Username}</div>
                                    </div>
                                </div>

                                <div className="user-role">
                                    <span className={`role-badge`}></span>
                                </div>
                            </div>
                        ))}
                    </div>
                    document.getElementById("organization-member-list").append(userMap)
                },
                {
                    blockUI: true,
                    onError: (xhr) => {
                        notifyError("Error: " + xhr.responseText);
                    }
                }
            );
        }
        else{
            document.getElementById("OrganizationDetail").append(<>
                    <div><CreateNewDiv/></div>
                </>
            )
        }
    }).catch(err => {
        console.error("Error:", err);
    });
    
    
}