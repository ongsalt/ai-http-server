import { handleRequest } from "./ai"

function start() {
    Bun.serve({
        fetch: async (req) => {            
            console.log("Request received")
            return handleRequest(req)
        },
        port: 3000
    })
}


start()