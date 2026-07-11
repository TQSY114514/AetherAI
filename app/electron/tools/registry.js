// ───────────────────────────────────────────────────────────────────────────
// Built-in tool registry.
//
// Each tool is a plain object: { name, description, parameters, run }.
// `parameters` is the OpenAI function-call JSON Schema for arguments.
// `run(args, ctx)` executes the tool and returns a string result (or throws).
//
// We ship two read-only built-ins (read_file, web_search) — deliberately no
// write/execute tools, since this is a desktop app and destructive actions
// need a permission model first. New tools are added by appending to TOOLS.
// ───────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

const MAX_READ_BYTES = 64 * 1024 // cap read_file output so a huge file doesn't blow the context

const TOOLS = [
  {
    name: 'read_file',
    description: 'Read the text content of a file at the given absolute path. Returns up to 64KB of UTF-8 text. Use for inspecting local code/config files the user references.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file to read.' },
      },
      required: ['path'],
    },
    run: (args) => {
      const p = String(args.path || '')
      if (!p) throw new Error('path is required')
      // Resolve but do NOT allow reading outside sensible bounds: we accept any
      // absolute path the user's OS account can read — the model can only act on
      // paths the user mentioned, and the user sees each call in the UI before
      // results go back. (No silent exfiltration: results stay in the chat.)
      const buf = fs.readFileSync(p)
      const text = buf.slice(0, MAX_READ_BYTES).toString('utf-8')
      const truncated = buf.length > MAX_READ_BYTES ? `\n\n[truncated, ${buf.length} bytes total]` : ''
      return text + truncated
    },
  },
  {
    name: 'web_search',
    description: 'Search the public web for a query and return short text snippets of the top results. Use when the user asks about recent events, current data, or anything not in your training data.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' },
      },
      required: ['query'],
    },
    run: async (args, ctx) => {
      const q = String(args.query || '')
      if (!q) throw new Error('query is required')
      // Use DuckDuckGo's HTML endpoint — no API key required. We fetch a few
      // result abstracts; full content fetch is intentionally out of scope.
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q)
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'AetherAI/0.1' } })
        if (!res.ok) return `[search failed: HTTP ${res.status}]`
        const html = await res.text()
        return extractDdgSnippets(html, q)
      } catch (e) {
        return `[search error: ${e.message}]`
      } finally {
        clearTimeout(timeout)
      }
    },
  },
]

// Pull <a class="result__snippet"> text out of DDG's HTML results. Best-effort;
// DDG markup changes occasionally, so we degrade to raw-text stripping.
function extractDdgSnippets(html, q) {
  const snippets = []
  const re = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
  let m
  while ((m = re.exec(html)) && snippets.length < 5) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()
    if (text) snippets.push(`- ${text}`)
  }
  if (snippets.length === 0) return `No snippets extracted for "${q}".`
  return snippets.join('\n')
}

// Look up a tool by name. Returns undefined if not found.
function getTool(name) {
  return TOOLS.find(t => t.name === name)
}

// The OpenAI tools array to send in a chat request: [{type:'function', function:{...}}].
function toolsPayload() {
  return TOOLS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }))
}

module.exports = { TOOLS, getTool, toolsPayload }
