import { OpenAI } from "openai";
import { getMemory, rememberRequest, rememberResponse } from "../memory";
import { parseHeader, parseStatusCode, requestToString } from "../message";
import { systemPrompt } from "../ai";
import type { RequestHandler } from ".";

export class OpenAIClient implements RequestHandler {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            baseURL: Bun.env.OPENAI_SERVER || "http://localhost:11434/v1/",
            apiKey: Bun.env.OPENAI_API_KEY || "ignored",
            fetch: Bun.fetch
        })
    }

    async handleRequest(req: Request) {
        const requestText = await requestToString(req)
        const completion = await this.client.chat.completions.create({
            messages: [
                ...getMemory(),
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

        // we can't stream a header, so we need to read the header first before we can stream the body 
        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                break
            }

            const content = decoder.decode(value)
            const text = JSON.parse(content).choices[0].delta.content

            headerText += text

            if (headerText.includes("\n\n")) {
                break
            }
        }

        console.log({ headerText })
        const headers = parseHeader(headerText)
        const { status, message } = parseStatusCode(headerText)

        const bodyStream = new ReadableStream({
            start(controller) {
                // bodyText += cache
                // controller.enqueue(cache)
            },
            async pull(controller) {
                const { done, value } = await reader.read()
                if (done) {
                    controller.close()
                    console.log("done")

                    rememberRequest(requestText)
                    rememberResponse(bodyText, headerText)
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

                        rememberRequest(requestText)
                        rememberResponse(bodyText, headerText)
                    }
                }
            }
        })

        return new Response(bodyStream, {
            headers,
            status,
            statusText: message
        })
    }
}