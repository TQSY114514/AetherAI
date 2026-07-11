import { useStore } from '@/store'
import { Sparkles, Keyboard } from 'lucide-react'
import { t } from '@/utils/i18n'

// Example prompts shown on the new-chat empty state (Claude-Code-style).
const EXAMPLES = [
  { icon: '💡', title: '解释概念', prompt: '用通俗的语言解释一下什么是向量数据库，以及它和传统数据库的区别' },
  { icon: '✍️', title: '帮我写作', prompt: '帮我写一封正式的请假邮件，说明下周三到周五因病请假' },
  { icon: '💻', title: '写代码', prompt: '用 Python 实现一个简单的 LRU 缓存类，带注释' },
  { icon: '🌍', title: '翻译润色', prompt: '把这段话翻译成英文并润色得更地道：今天天气很好，适合出去散步' },
]

// Centered hero shown when a session has no messages yet, OR when no session is
// selected. Clicking an example creates a session (if needed) and sends the prompt.
export default function EmptyState({ noSession = false }: { noSession?: boolean }) {
  const createSession = useStore((s) => s.createSession)
  const currentSessionId = useStore((s) => s.currentSessionId)

  const startWith = async (prompt: string) => {
    if (!currentSessionId) await createSession()
    // Defer one tick so createSession's state update lands before sendMessage reads it.
    setTimeout(() => useStore.getState().sendMessage(prompt), 0)
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl text-center animate-blur-fade">
        {/* Hero icon */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', boxShadow: '0 10px 30px -10px var(--accent)' }}>
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {noSession ? t('chat.no_session') : t('empty.welcome', '有什么可以帮你的？')}
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          {t('empty.subtitle', '选择一个示例，或直接在下方输入你的问题')}
        </p>

        {/* Example prompt grid */}
        {!noSession && (
          <div className="grid grid-cols-2 gap-2.5 mb-8 text-left">
            {EXAMPLES.map((ex) => (
              <button key={ex.title} onClick={() => startWith(ex.prompt)}
                className="flex items-start gap-2.5 p-3 rounded-xl border hover:shadow-soft transition-all text-left"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--content-bg, var(--bg-secondary))' }}>
                <span className="text-base leading-none mt-0.5">{ex.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{ex.title}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{ex.prompt}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Quick actions / keyboard hints */}
        <div className="flex items-center justify-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><Keyboard size={12} /> Ctrl+N 新建</span>
          <span>·</span>
          <span>Shift+Enter 换行</span>
          <span>·</span>
          <span>输入 / 查看指令</span>
        </div>

        {noSession && (
          <div className="mt-6">
            <button onClick={() => createSession()} className="px-5 py-2 text-white text-sm rounded-xl hover:opacity-80 transition-all"
              style={{ backgroundColor: 'var(--accent)' }}>{t('chat.create')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
