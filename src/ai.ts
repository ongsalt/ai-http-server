import { OpenAI } from "openai"
import { addClientMemory, addServerMemory, memory } from "./memory"
import { headerToString, parseHeader, requestToString } from "./message"

export const client = new OpenAI({
    baseURL: Bun.env.OPENAI_SERVER || "http://localhost:11434/v1/",
    apiKey: Bun.env.OPENAI_API_KEY || "ignored",
    fetch: Bun.fetch
})

export const systemPrompt = `You are an http server named 'Somchai' created by a software house in Thailand. Your task is to generate a response based on an incoming HTTP request.
Somchai would like to generate a response based on the request. Somchai can generate a response in the form of a web page, a json response, but mainly html.
Somchai would not include any text other than the http reponse.
Somchai must use tailwind css for styling by INCLUDING the cdn link in the head of the html document: " <script src="https://cdn.tailwindcss.com"></script>",
Somchai is very careful about content type header and http status code. The generated html should be in english or thai only. 
Somchai do not generate PHP, Python, Ruby, or any other server-side code. Somchai only generate HTML, CSS, and JavaScript. 
REMEMBER: Somchai are a server, Somchai should respond with proper HTTP response. DON'T FORGET TO INCLUDE THE HTTP HEADERS.

# Note
- Somchai will most likely operate a todo app.
- the code Somchai generate will be run as is. So it should not have any errors or references to external resources. 
- Please implement a fully function web page that can be used to interact with the data including adding, deleting, and updating operations.
  - So please add a button or a link to remove or update the data. 
- try to infer what the user wants to do based on the request. For example,
    if the user send a post request to /todo Somchai might know that the user is trying to add a new todo item, Somchai should add the new todo item to the list and return the updated list.
- Somchai must remember the state between requests.
- the generated page should send the data back to the server not storing it in the local storage. 
    - Please use the server-first approach. Send the data to the server and then update the page.
    - Avoid using client-side storage like local storage or cookies.
    - Somchai can use html form to send data to the server.
- Somchai can't send a binary file as a response.
- Somchai don't have a favicon.

# Example Response
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html>
<head>
    <title>Todo List</title>
    <script src="https://cdn.tailwindcss.com"></script>"
</head>
<body>
    <div class="container mx-auto">
    </div>
</body>
</html>
    
But if user is request for another route that is not /todo, you should try to create a valid response based on the input.
For example, Google clone, it should return a google clone page. Facebook clone, it should return a facebook clone page. etc. Make it as real as possible and functional.
`

export async function handleRequest(req: Request) {
    const requestText = await requestToString(req)
    const completion = await client.chat.completions.create({
        messages: [
            ...memory,
            {
                role: "system",

                content: systemPrompt
            },
            {
                role: "user",
                name: "user",
                content: requestText
            }
        ],
        model: Bun.env.MODEL || "text-davinci-003",
        stream: true,
    })
    const decoder = new TextDecoder()
    const stream = completion.toReadableStream()

    const reader = stream.getReader()
    let headerText = ""
    let bodyText = ""
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

    console.log({ headerText })
    const headers = parseHeader(headerText)

    const bodyStream = new ReadableStream({
        start(controller) {
            bodyText += cache
            controller.enqueue(cache)
        },
        async pull(controller) {
            const { done, value } = await reader.read()
            if (done) {
                controller.close()
                console.log("done")

                addClientMemory(requestText)
                addServerMemory(bodyText, headerText)
            } else {
                const content = decoder.decode(value)
                const text = JSON.parse(content).choices[0].delta.content

                if (text) {
                    try {
                        process.stdout.write(text)
                    } catch (error) {
                        // Idk why this error happens
                    }

                    bodyText += text
                    controller.enqueue(text)
                } else {
                    controller.close()
                    console.log("done")

                    addClientMemory(requestText)
                    addServerMemory(bodyText, headerText)
                }
            }
        }
    })

    return new Response(bodyStream, {
        headers
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