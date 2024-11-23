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
    let headerText = ""

    let isHeaderEnd = false

    while (true) {
        const { done, value } = await reader.read()
        if (done) {
            break
        }
        const content = decoder.decode(value)
        const text = JSON.parse(content).choices[0].delta.content

        if (isHeaderEnd) {
            // bodyText += text
            break
        } else {
            headerText += text
        }

        if (headerText.includes("\n\n")) {
            isHeaderEnd = true
        }

        console.log(text)
    }

    const bodyStream = new ReadableStream({
        start(controller) {
            function push() {
                reader.read().then(({ done, value }) => {
                  // If there is no more data to read
                  if (done) {
                    console.log("done", done);
                    controller.close();
                    return;
                  }

                  const content = decoder.decode(value)
                  const text = JSON.parse(content).choices[0].delta.content          

                  controller.enqueue(text);
                  // Check chunks by logging to the console
                  console.log(text);
                  push();
                });
              }
      
              push();      
        },
    })

    return new Response(bodyStream, {
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