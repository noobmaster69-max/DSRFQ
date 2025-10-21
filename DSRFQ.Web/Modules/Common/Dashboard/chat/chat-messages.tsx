/** @jsxImportSource preact */
import { ReactNode } from "jsx-dom";
import { ownContact } from "./chat-mock-data";
import { ChatContact, ChatMessage } from "./chat-types";

const ChatMessageItem = ({ contact, time, children }: { contact: ChatContact, time: string, children?: ReactNode }) => {
    var own = contact === ownContact;
    return <div class={own ? "s-chat-message-own mb-4" : "s-chat-message-other pb-4"}>
        <div>
            <img src={contact.avatar} class="rounded-circle me-1" s-alt={contact.name} width="40" height="40" />
            <div class="text-muted small text-nowrap mt-2">{time}</div>
        </div>
        <div class={["s-chat-message-body flex-shrink-1 rounded py-2 px-3", own ? "me-3" : "ms-3"].filter(x => x).join(' ')}>
            {children}
        </div>
    </div >
}

export const ChatMessages = ({ messages }: { messages: ChatMessage[] }) =>
    <div class="s-chat-messages p-4">{messages.map(msg => <ChatMessageItem contact={msg.contact} time={msg.time}>{msg.message}</ChatMessageItem>)}</div>
