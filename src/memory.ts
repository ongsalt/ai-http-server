type ChatMessage = {
    role: "user"
    name: "server" | "client"
    content: string
}

export const memory: ChatMessage[] = []

export function addMemory(message: ChatMessage) {
    memory.push(message)
}

export function addServerMemory(bodyText: string, headersText: string) {
    addMemory({ role: "user", name: "server", content: `${bodyText}\n\n${headersText}` })
}
