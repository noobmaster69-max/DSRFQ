import {initFormType, LookupEditor, PrefixedContext} from "@serenity-is/corelib";

export interface MaterialForm { 
    MaterialId: LookupEditor; 
} 
export class MaterialForm extends PrefixedContext { 
    static formKey = "Material.MaterialForm"; 
    private static init: boolean; 
    constructor(prefix: string) { 
        super(prefix); 
        if (!MaterialForm.init) {
            MaterialForm.init = true; 
            initFormType(MaterialForm, [ "MaterialId", LookupEditor ]); 
        } 
    } 
}