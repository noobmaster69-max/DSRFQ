/**
 * @jsxImportSource preact 
 * Chat is implemented via preact just as a demonstration of integrating another lib like preact/react inside jsx-dom tree
 */
import { signal } from "@preact/signals";
import { formatDate } from "@serenity-is/corelib";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { messageList, ownContact } from "./chat-mock-data";
import { ChatSidebar } from "./chat-sidebar";

const messages = signal(messageList);
const inputText = signal("");

function addMessage() {
    if (!inputText.value)
        return;
    messages.value = [...messages.value, {
        contact: ownContact,
        time: formatDate(new Date(), "hh:mm tt").toLowerCase(),
        message: inputText.value
    }];
    inputText.value = "";
}

export const ChatCard = () => {
    const onInput = (e: Event) => (inputText.value = (e.target as HTMLInputElement).value);
    const sendClick = (e: Event) => {
        addMessage();
        setTimeout(() => (e.target as HTMLElement).closest('.row')
            ?.querySelector('.s-chat-messages')?.lastElementChild?.scrollIntoView(), 0);
    }

    return (
        <div class="row g-0" data-status="online">
            <ChatSidebar />

            <div class="col-12 col-lg-7 col-xl-8">
                <ChatHeader />

                <div class="position-relative">
                    <ChatMessages messages={messages.value} />
                </div>

                <div class="flex-grow-0 py-3 px-4">
                    <div class="input-group">
                        <input type="text" class="form-control" placeholder="Type your message" onInput={onInput} value={inputText} 
                            onKeyPress={e => e.key === "Enter" && sendClick(e)} />
                        <button class="btn btn-primary" onClick={sendClick}>Send</button>
                    </div>
                </div>
            </div>
        </div>
    );
}