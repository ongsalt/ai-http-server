import { handleRequest } from "./ai"

function start() {
    console.log(`Starting server at port ${Bun.env.PORT ?? 3000}`)
    Bun.serve({
        fetch: async (req) => {
            console.log("Request received")
            return handleRequest(req)
        },
        port: Bun.env.PORT ?? 3000,
        idleTimeout: 255,
    })
}

start()