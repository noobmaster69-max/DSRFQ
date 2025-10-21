import { TranslationConfig, getLookupAsync, type LanguageList } from "@serenity-is/corelib";
import { type LanguageRow } from "../../ServerTypes/Administration/LanguageRow";
import { TranslationService } from "../../ServerTypes/Administration/TranslationService";

async function siteLanguageList(): Promise<LanguageList> {
    return (await getLookupAsync<LanguageRow>("Administration.Language")).items
        .filter(x => x.LanguageId !== "en")
        .map(x => ({ id: x.LanguageId, text: x.LanguageName }));
}

siteLanguageList().then(list => TranslationConfig.getLanguageList = () => list);

if (typeof document !== "undefined" && document.querySelector<HTMLMetaElement>("meta[name=ai-translation-enabled]")?.content == "true") {
    TranslationConfig.translateTexts = TranslationService.TranslateText;
}