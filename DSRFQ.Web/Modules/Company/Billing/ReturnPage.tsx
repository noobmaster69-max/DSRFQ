import {ReturnPageModel} from "../../ServerTypes/Common/ReturnPageModel";
import {CreateNewDiv} from "../Organization/organizationDetail/organization-detail";

export default function pageInit({ model, nwLinkFormat }: { model: ReturnPageModel, nwLinkFormat: string }){
    
    const icons = {
        success: (
            // @ts-ignore
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        error: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
        ),
    };
    if(model.success){
        
    }
    else{
        let type="error"
        const icon = icons[type];

        // Determine the CSS class based on the type for styling
        const baseClass = 'notification-card';
        const typeClass = type === 'error' ? 'error' : 'success'
        // @ts-ignore
        document.getElementById("return").append(<>
            <div className={`${baseClass} ${typeClass}`}>
                <div className="notification-icon">{icon}</div>
                <p className="notification-message">{model.message}</p>
               
                   
            </div>
            </>
        )
    }
}