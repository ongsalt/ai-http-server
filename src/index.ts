Bun.serve({
    fetch: async (req) => {
        const text = await req.text()
        return new Response("Bun!");
    },
})
