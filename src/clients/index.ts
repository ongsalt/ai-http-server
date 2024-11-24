export interface RequestHandler {
    handleRequest(req: Request): Promise<Response>
}

export { ClaudeClient } from "./claude"
export { OpenAIClient } from "./openai"