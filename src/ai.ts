import { OpenAI } from "openai"

export const client = new OpenAI({
    baseURL: "http://localhost:11434/v1/",
    apiKey: "ignored"
})

export const systemPrompt = `you are an http server which serves a todo app, please response with what a todo app server would do,
also please do not include any text other than the http reponse, Please return a html as you are not a json api server.
you must use tailwind css for styling by including the cdn link in the head of the html document: " <script src="https://cdn.tailwindcss.com"></script>",
please be careful about content type and status code. The generated html should be in english or thai only. Do not generate PHP, USE ONLY HTML.

# Example Response
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div class="p-4 bg-blue-500 text-white">Hello World</div>
</body>
</html>
`

export function parseHeader(text: string) {
    const headers = new Headers()
    const lines = text.split("\n")

    for (const line of lines) {
        if (line.includes("HTTP")) {
            continue
        }
        if (line === "") {
            break
        }
        const [key, value] = line.split(": ")
        headers.set(key, value)
    }
    return headers
}

export function headerToString(headers: Headers) {
    let text = ""
    for (const [key, value] of headers) {
        text += `${key}: ${value}\n`
    }
    return text
}

export async function handleRequest(req: Request) {
    const body = await req.text()
    const headers = headerToString(req.headers)
    const a = await client.chat.completions.create({
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: `${headers}\n\n${body}`
            }
        ],
        model: "llama3.2:1b",
        stream: true,
    })
    
    const decoder = new TextDecoder()
    const stream = a.toReadableStream()

    const reader = stream.getReader()
    let headerText = ""
    let cache = ""
    let isHeaderEnd = false

    while (true) {
        const { done, value } = await reader.read()
        if (done) {
            break
        }
        const content = decoder.decode(value)
        const text = JSON.parse(content).choices[0].delta.content

        if (headerText.includes("\n\n")) {
            isHeaderEnd = true
        }

        if (isHeaderEnd) {
            cache += text
            break
        } else {
            headerText += text
        }
    }
    
    const bodyStream = new ReadableStream({
        start(controller) {
            controller.enqueue(cache)
        },
        async pull(controller) {
            const { done, value } = await reader.read()
            if (done) {
                controller.close()
                console.log("done")
            } else {
                const content = decoder.decode(value)
                const text = JSON.parse(content).choices[0].delta.content
                // console.log(text)
                process.stdout.write(text)
                controller.enqueue(text)
            }
        }
    })

    console.log(headerText)
    return new Response(bodyStream, {
        headers: parseHeader(headerText)
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