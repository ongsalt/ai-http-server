import { OpenAIClient, ClaudeClient, type RequestHandler } from "./clients"

const client: RequestHandler = new ClaudeClient()
const client2: RequestHandler = new OpenAIClient()

function start() {
    console.log(`Starting server at port ${Bun.env.PORT ?? 3000}`)
    Bun.serve({
        fetch: async (req) => {
            if (Math.random() > 0.5) {
                return await client.handleRequest(req)
            } else {
                return await client2.handleRequest(req)
            }
        },
        port: Bun.env.PORT ?? 3000,
        idleTimeout: 255,
    })
}

start()