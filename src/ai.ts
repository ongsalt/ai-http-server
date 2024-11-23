import { OpenAI } from "openai"

export const client = new OpenAI({
    baseURL: "http://localhost:11434/v1/",
    apiKey: "ignored"
})

export const systemPrompt = `you are an http server which serves a todo app, please response with what a todo app server would do,
also please do not include any text other than the http reponse,
you can use tailwind css for styling by including the cdn link in the head of the html document: " <script src="https://cdn.tailwindcss.com"></script>",
you can use htmx for dynamic html by including the cdn link in the head of the html document: "<script src="https://unpkg.com/htmx.org"></script>",
`

export async function handleRequest(req: Request) {
    console.log(req)
    const a = await client.chat.completions.create({
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: ""
            }
        ],
        model: "llama3.2:1b",
        stream: true,
    })
    
    const decoder = new TextDecoder()
    const stream = a.toReadableStream()

    const reader = stream.getReader()
    const headerText = []

    while (true) {
        const { done, value } = await reader.read()
        if (done) {
            break
        }
        const text = decoder.decode(value)
        headerText.push(text)

        if (headerText.join("").includes("\n\n")) {
            break
        }
    }

    console.log(headerText.join(""))

    return new Response(stream, {
        headers: {}
    })
    // while (true) {
    //     const { done, value } = await reader.read()
    //     if (done) {
    //         break
    //     }
    //     // parse to string
    //     const content = JSON.parse(decoder.decode(value))
    //     console.log(content.choices[0].delta.content)
    // }
}