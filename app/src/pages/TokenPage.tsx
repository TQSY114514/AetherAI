import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/store'

export default function TokenPage() {
  const messages = useStore((s) => s.messages)
  const sessions = useStore((s) => s.sessions)
  const providers = useStore((s) => s.providers)

  // Aggregate stats from current session messages
  const stats = useMemo(() => {
    let totalTokens = 0, totalMsgs = 0, userMsgs = 0, asstMsgs = 0
    const byModel: Record<string, { tokens: number; count: number; cost: number }> = {}
    for (const m of messages) {
      totalMsgs++
      if (m.role === 'user') userMsgs++
      else if (m.role === 'assistant') asstMsgs++
      const t = m.token_count || 0
      totalTokens += t
      const key = m.model_used || 'unknown'
      if (!byModel[key]) byModel[key] = { tokens: 0, count: 0, cost: 0 }
      byModel[key].tokens += t
      byModel[key].count++
    }
    return { totalTokens, totalMsgs, userMsgs, asstMsgs, byModel }
  }, [messages])

  const [localMsgs, setLocalMsgs] = useState<number[]>([])
  const [usageHistory, setUsageHistory] = useState<{ date: string; tokens: number; cost: number }[]>([])

  useEffect(() => {
    // Load all messages for historical stats
    const load = async () => {
      const all: number[] = []
      const dayMap: Record<string, { tokens: number; cost: number }> = {}
      for (const s of sessions) {
        const msgs = await window.electronAPI.message.list(s.id)
        for (const m of msgs) {
          const t = m.token_count || 0
          all.push(t)
          if (m.created_at) {
            const day = m.created_at.slice(0, 10)
            if (!dayMap[day]) dayMap[day] = { tokens: 0, cost: 0 }
            dayMap[day].tokens += t
          }
        }
      }
      setLocalMsgs(all)
      setUsageHistory(Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })))
    }
    if (sessions.length > 0) load()
  }, [sessions.length])

  const totalTokens = localMsgs.reduce((a, b) => a + b, 0)
  const totalMsgsAll = localMsgs.length

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>📊 Token 使用统计</h1>

        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{(totalTokens / 1000).toFixed(1)}K</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>总 Token 消耗</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalMsgsAll}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>总消息数</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{sessions.length}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>会话数</div>
          </div>
        </div>

        {/* Current session model breakdown */}
        {Object.keys(stats.byModel).length > 0 && (
          <div className="rounded-xl p-4 mb-6" style={{ border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>当前会话 - 模型用量</h2>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left px-2 py-1">模型</th>
                  <th className="text-right px-2 py-1">消息数</th>
                  <th className="text-right px-2 py-1">Token</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.byModel).map(([name, data]) => (
                  <tr key={name}>
                    <td className="px-2 py-1" style={{ color: 'var(--text-primary)' }}>{name}</td>
                    <td className="text-right px-2 py-1" style={{ color: 'var(--text-secondary)' }}>{data.count}</td>
                    <td className="text-right px-2 py-1 font-mono" style={{ color: 'var(--text-secondary)' }}>{(data.tokens / 1000).toFixed(1)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Daily usage chart (simple) */}
        {usageHistory.length > 0 && (
          <div className="rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>每日用量</h2>
            <div className="space-y-1">
              {usageHistory.slice(-14).map((day) => {
                const maxTokens = Math.max(...usageHistory.map(d => d.tokens), 1)
                const pct = Math.round((day.tokens / maxTokens) * 100)
                return (
                  <div key={day.date} className="flex items-center gap-2">
                    <span className="text-[10px] w-20 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{day.date}</span>
                    <div className="flex-1 h-4 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }} />
                    </div>
                    <span className="text-[10px] w-12 text-right font-mono" style={{ color: 'var(--text-muted)' }}>{(day.tokens / 1000).toFixed(0)}K</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {usageHistory.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>暂无数据，开始聊天后将自动统计</div>
        )}
      </div>
    </div>
  )
}
