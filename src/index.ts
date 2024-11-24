import { OpenAIClient, ClaudeClient, type RequestHandler } from "./clients"

const client: RequestHandler = new OpenAIClient()

function start() {
    console.log(`Starting server at port ${Bun.env.PORT ?? 3000}`)
    Bun.serve({
        fetch: async (req) => client.handleRequest(req),
        port: Bun.env.PORT ?? 3000,
        idleTimeout: 255,
    })
}

start()