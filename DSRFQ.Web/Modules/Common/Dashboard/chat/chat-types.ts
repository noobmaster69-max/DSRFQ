export type ChatContact = {
    name: string,
    avatar?: string,
    online?: boolean,
    unread?: number
}

export type ChatMessage = {
    contact: ChatContact,
    time: string,
    message: string
}