import Anthropic from "@anthropic-ai/sdk";
import type { RequestHandler } from ".";
import { parseHeader, parseStatusCode, requestToString } from "../message";
import { systemPrompt } from "../ai";
import { getClaudeMemory, rememberRequest, rememberResponse } from "../memory";

export class ClaudeClient implements RequestHandler {
    client: Anthropic;
    constructor() {
        this.client = new Anthropic({
            apiKey: Bun.env.ANTHROPIC_API_KEY,
            fetch: Bun.fetch
        })        
    }

    async handleRequest(req: Request) {
        const requestText = await requestToString(req)
        const completion = await this.client.messages.create({
            messages: [
                ...getClaudeMemory(),
                {
                    role: "assistant",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: requestText
                }
            ],
            model: Bun.env.CLAUDE_MODEL || "text-davinci-003",
            stream: true,
            max_tokens: 8192,
        })
        const decoder = new TextDecoder()
        const stream = completion.toReadableStream()
    
        const reader = stream.getReader()
        let headerText = ""
        let bodyText = ""
        let leftOver = ""
    
        console.log(requestText)
    
        // we can't stream a header, so we need to read the header first before we can stream the body 
        while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
                break
            }
    
            const content = decoder.decode(value)
            const a = JSON.parse(content)
            // console.log(a)
            
            if (a.type != "content_block_delta") {
                continue
            }
            
            const text = a?.delta?.text ?? ""
            headerText += text
            console.log(text)
    
            if (headerText.includes("\n\n")) {
                [headerText, leftOver] = headerText.split("\n\n")
                break
            }
        }
    
        console.log(headerText)
        const headers = parseHeader(headerText)
        const { status, message } = parseStatusCode(headerText)
    
        const bodyStream = new ReadableStream({
            start(controller) {
                bodyText += leftOver
                process.stdout.write(leftOver)
                controller.enqueue(leftOver)
            },
        
            async pull(controller) {
                const { done, value } = await reader.read()
                if (done) {
                    controller.close()
                    console.log("done")
                    // console.log(bodyText)
    
                    rememberRequest(requestText)
                    rememberResponse(bodyText, headerText)
                } else {
                    const content = decoder.decode(value)
                    const a = JSON.parse(content)
                    if (a.type != "content_block_delta") {
                        return
                    }
                    
                    const text = a?.delta?.text
            
                    if (text) {
                        try {
                            process.stdout.write(text)
                        } catch (error) {
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