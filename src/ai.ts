import { OpenAI } from "openai"
import { addServerMemory, memory } from "./memory"
import { headerToString, parseHeader, requestToString } from "./message"

export const client = new OpenAI({
    baseURL: Bun.env.OPENAI_SERVER || "http://localhost:11434/v1/",
    apiKey: Bun.env.OPENAI_API_KEY || "ignored",
    fetch: Bun.fetch
})

export const systemPrompt = `you are an http server which serves a todo app, please response with what a todo app server would do,
also please do not include any text other than the http reponse, Please return a html as you are not a json api server.
you must use tailwind css for styling by INCLUDING the cdn link in the head of the html document: " <script src="https://cdn.tailwindcss.com"></script>",
please be careful about content type and status code. The generated html should be in english or thai only. Do not generate PHP, USE ONLY HTML.

# Example Response
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html>
<head>
    <title>Todo List</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body>
        <div class="container mx-auto">
            <h1 class="text-2xl font-bold">Todo List</h1>
            <ul class="mt-4">
                <li class="flex justify-between items-center">
                    <span>Buy Milk</span>
                    <button class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                </li>
                <li class="flex justify-between items-center">
                    <span>Learn TailwindCSS</span>
                    <button class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                </li>
                <li class="flex justify-between items-center">
                    <span>Build a Todo App</span>
                    <button class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                </li>
            </ul>
            <div class="mt-4">
                <input type="text" class="border-2 border-gray-300 p-2 rounded">
                <button class="bg-blue-500 text-white px-2 py-1 rounded">Add</button>
            </div>
            </div>
            <script>
                const deleteButtons = document.querySelectorAll("button");
                deleteButtons.forEach(button => {
                    button.addEventListener("click", () => {
                        button.parentElement.remove();
                    });
                });

                const addButton = document.querySelector("button");
                const input = document.querySelector("input");

                addButton.addEventListener("click", () => {
                    const li = document.createElement("li");
                    li.classList.add("flex", "justify-between", "items-center");
                    li.innerHTML = \`
                        <span>\${input.value}</span>
                        <button class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                    \`;
                    document.querySelector("ul").appendChild(li);
                    input.value = "";
                });
            </script>
        </body>
    </html>
    
But if user is request for another route that is not /todo, you should try to create a valid response based on the input.
For example, Google clone, it should return a google clone page. Facebook clone, it should return a facebook clone page. etc. Make it as real as possible and functional.`

export async function handleRequest(req: Request) {
    const requestText = await requestToString(req)
    const completion = await client.chat.completions.create({
        messages: [
            {
                role: "system",

                content: systemPrompt
            },
            ...memory,
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

                addServerMemory(bodyText, headerText)
            } else {
                const content = decoder.decode(value)
                const text = JSON.parse(content).choices[0].delta.content
                if (text !== null) {
                    process.stdout.write(text)
                }
                // console.log(text)
                bodyText += text
                controller.enqueue(text)
            }
        }
    })

    console.log(headerText)
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