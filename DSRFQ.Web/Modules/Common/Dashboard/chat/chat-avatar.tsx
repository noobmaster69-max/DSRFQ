/** @jsxImportSource preact */
import { ChatContact } from "./chat-types";

export const ChatAvatar = ({ contact, profile }: { contact: ChatContact, profile?: boolean }) =>
    <img src={contact.avatar} class={["rounded-circle me-1", profile && "s-chat-profile-image"].filter(x => x).join(" ")}
        s-alt={contact.name} width={profile ? 60 : 40} height={profile ? 60 : 40} />
