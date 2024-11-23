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
    for (const [key, value] of Object.entries(headers)) {
        text += `${key}: ${value}\n`
    }
    return text
}

// Support only text body
export async function requestToString(request: Request) {
    const body = await request.text()
    return `${request.method} ${request.url} HTTP/1.1\n${headerToString(request.headers)}\n\n ${body}`
}