import { handleRequest } from "./ai"

function start() {
    Bun.serve({
        fetch: async (req) => {            
            return handleRequest(req)
        },
        port: 3000
    })
}


start()