type ChatMessage = {
    role: "user"
    name: "server" | "client"
    content: string
}

export const memory: ChatMessage[] = []

export function addMemory(message: ChatMessage) {
    memory.push(message)
    console.log({ memory })
}

export function addServerMemory(bodyText: string, headersText: string) {
    addMemory({ role: "user", name: "server", content: `${headersText}\n\n${bodyText}` })
}

export function addClientMemory(requestText: string) {
    addMemory({ role: "user", name: "client", content: requestText })
}
