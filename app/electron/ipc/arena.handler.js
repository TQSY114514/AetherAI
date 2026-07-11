const { completeChat } = require('../llm/providerAdapter')
const abortControllers = new Map()

function registerArenaHandlers(ipcMain, db) {
  ipcMain.handle('arena:send', async (event, { sessionId, content, modelIds }) => {
    const allModels = db.getAllModels()
    const selected = allModels.filter(m => modelIds.includes(m.id))
    if (!selected.length) return { results: [] }

    const results = []
    const requestId = Date.now()
    const controller = new AbortController()
    abortControllers.set(requestId, controller)

    for (const m of selected) {
      try {
        const start = Date.now()
        const timeout = setTimeout(() => controller.abort(), 60000)
        const answer = await completeChat({
          provider: { api_url: m.api_url, api_key: m.api_key, api_format: 'openai' },
          model: m,
          messages: [{ role: 'user', content }],
          signal: controller.signal,
        })
        clearTimeout(timeout)
        results.push({ model_id: m.id, model_name: m.model_name, provider_name: m.provider_name,
          content: answer, latency_ms: Date.now() - start })
      } catch (err) {
        if (err.name === 'AbortError') break
        results.push({ model_id: m.id, model_name: m.model_name, provider_name: m.provider_name,
          content: `[Error: ${err.message}]` })
      }
    }

    abortControllers.delete(requestId)
    return { results }
  })

  ipcMain.handle('arena:stop', () => {
    for (const [, c] of abortControllers) c.abort()
    abortControllers.clear()
  })

  ipcMain.handle('arena:vote', async (_e, data) => {
    const { prompt, winnerModelId, winnerModelName, loserModelIds, loserModelNames, intent } = data
    const detectedIntent = intent || db.classifyIntent(prompt)
    db.recordArenaVote({ prompt, winnerModelId, winnerModelName, loserModelIds, loserModelNames, intent: detectedIntent })
    return { success: true }
  })

  ipcMain.handle('arena:scores', () => db.getModelScores())
  ipcMain.handle('arena:auto-route', (_e, query) => {
    const intent = db.classifyIntent(query)
    return { intent, route: db.autoRoute(intent) }
  })
}

module.exports = { registerArenaHandlers }
