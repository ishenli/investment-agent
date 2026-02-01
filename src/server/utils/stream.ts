export function extractContent(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (typeof part === "object" && part) {
          const record = part as Record<string, unknown>
          if (typeof record.text === "string") return record.text
          if (typeof record.content === "string") return record.content
        }
        return ""
      })
      .join("")
  }
  return ""
}

// export function extractAssistantChunkText(data: unknown): string | null {

//   console.log("className", data)
//   const tuple = data as [unknown, unknown]
//   const msgChunk = tuple?.[0] as { id?: unknown; kwargs?: Record<string, unknown> } | undefined
//   const kwargs = msgChunk?.kwargs || {}
//   const classId = Array.isArray(msgChunk?.id) ? msgChunk?.id : []
//   const className = classId[classId.length - 1] || ""
  
//   if (!className.includes("AI")) {
//     return null
//   }
//   const content = extractContent(kwargs.content)
//   return content || null
// }

export function extractAssistantChunkText(data: unknown): string | null {
  const tuple = data as [unknown, unknown]
  const kwargs = tuple?.[0] || {} as Record<string, unknown>
  // console.info('extractAssistantChunkText', kwargs)
  const content = extractContent(kwargs?.content)
  return content || null
}


export function extractChunkId(data: unknown): string {
  const tuple = data as [unknown, unknown]
  const msgChunk = tuple?.[0] as { id?: string } | undefined
  return msgChunk?.id || '';
}
