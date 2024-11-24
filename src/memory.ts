import { appendFile } from "node:fs/promises";

type ChatMessage = {
    role: "user"
    name: "server" | "client"
    content: string
}

export const memory: ChatMessage[] = []

export function getMemory() {
    return memory
}

export function getClaudeMemory() {
    return memory.map(it => ({ 
        role: (it.role === "user" ? "user" : "assistant") as ("user" | "assistant"), 
        content: it.content 
    }))
}

export function addMemory(message: ChatMessage) {
    memory.push(message)
    console.log({ memory })
}

export async function rememberResponse(bodyText: string, headersText: string) {
    addMemory({ role: "user", name: "server", content: `${headersText}\n\n${bodyText}` })
    await appendFile("message.txt", JSON.stringify({ time: new Date(), type: "response", role: "user", name: "server", content: `${headersText}\n\n${bodyText}` }));
}

export async function rememberRequest(requestText: string) {
    addMemory({ role: "user", name: "client", content: requestText })
    await appendFile("message.txt", JSON.stringify({ time: new Date(), type: "request", role: "user", name: "client", content: requestText }));
}
