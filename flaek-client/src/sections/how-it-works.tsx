import { motion } from 'framer-motion'
import SectionDivider from '@/components/section-divider'

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-demo scroll-mt-24 md:scroll-mt-28">
      <div className="container-outer pt-20 md:pt-32">
        <SectionDivider />
      </div>
      <div className="container-outer py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">How to use Flaek</h2>
          <p className="mt-4 text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
            Build, publish, and run permissioned flows in three simple steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <StepCard
            step={1}
            title="Define your context"
            description="Describe the runtime context your flow expects. Add fields, types, and validation rules for dynamic inputs."
            link="Define context"
          >
            <div className="aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider text-white/50 mb-4">
                  Context fields
                </div>
                <div className="space-y-3">
                  <FieldRow label="player_hash" type="string" required />
                  <FieldRow label="room_id" type="string" required />
                  <FieldRow label="score_delta" type="number" required />
                  <FieldRow label="item_id" type="string" />
                </div>
              </div>
            </div>
          </StepCard>

          <StepCard
            step={2}
            title="Build your flow"
            description="Compose MagicBlock ER/PER flows to control permissions and execute Solana program instructions."
            link="Open builder"
          >
            <div className="aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 flex flex-col justify-start">
              <div className="text-xs uppercase tracking-wider text-white/50 mb-3">Flow steps</div>
              <div className="space-y-2.5">
                <FlowStep name="Create State" category="state" />
                <FlowConnector />
                <FlowStep name="Create Permission (Flaek)" category="permission" />
                <FlowConnector />
                <FlowStep name="Delegate State" category="delegation" />
                <FlowConnector />
                <FlowStep name="Commit + Undelegate Permission (Flaek)" category="permission" />
                <FlowConnector />
                <FlowStep name="Update State" category="state" />
              </div>
            </div>
          </StepCard>

          <StepCard
            step={3}
            title="Run & verify results"
            description="Execute jobs with your context and published flow. Track execution logs and signatures in the dashboard."
            link="View examples"
          >
            <div className="aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 flex flex-col justify-center">
              <div className="space-y-3">
                <ResultCard
                  label="POST /v1/jobs"
                  sublabel="flow: game_state_flow"
                  status="processing"
                  color="blue"
                />
                <div className="flex justify-center">
                  <ArrowDown />
                </div>
                <ResultCard
                  label="Job completed"
                  sublabel="result: { score: 12, inventory: ['sword'] }"
                  status="✓ confirmed"
                  color="green"
                />
                <div className="mt-3 text-center text-xs text-white/50">
                  tx signatures + execution logs
                </div>
              </div>
            </div>
          </StepCard>
        </div>
      </div>
    </section>
  )
}

function StepCard({
  step,
  title,
  description,
  note,
  link,
  children,
}: {
  step: number
  title: string
  description: string
  note?: string
  link: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: step * 0.1 }}
      className="group relative h-full flex flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl p-8 hover:border-white/15 transition-all duration-300"
    >
      <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Step {step}</div>
      <h3 className="text-2xl md:text-3xl font-semibold mb-3">{title}</h3>
      <p className="text-[15px] text-white/60 leading-relaxed mb-2">{description}</p>
      {note && <p className="text-[13px] text-accent-500/90 italic mb-6">{note}</p>}

      {children}

      <div className="mt-auto pt-6" />
    </motion.div>
  )
}

function FieldRow({ label, type, required }: { label: string; type: string; required?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2.5 py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="h-2 w-2 rounded-full bg-brand-500" />
        <span className="text-sm text-white/85 truncate">{label}</span>
      </div>
      <div className="text-[11px] sm:text-xs font-mono text-white/50 sm:text-right text-left whitespace-nowrap">
        <span>{type}</span>
        {required && <span className="ml-1.5">• required</span>}
      </div>
    </div>
  )
}

function FlowStep({
  name,
  category,
}: {
  name: string
  category: 'state' | 'permission' | 'delegation' | 'magic' | 'program'
}) {
  const categoryStyles: Record<string, { dot: string; badge: string }> = {
    state: { dot: 'bg-sky-400', badge: 'bg-sky-500/15 text-sky-200 border-sky-500/30' },
    permission: {
      dot: 'bg-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
    },
    delegation: {
      dot: 'bg-purple-400',
      badge: 'bg-purple-500/15 text-purple-200 border-purple-500/30',
    },
    magic: { dot: 'bg-teal-400', badge: 'bg-teal-500/15 text-teal-200 border-teal-500/30' },
    program: { dot: 'bg-amber-400', badge: 'bg-amber-500/15 text-amber-200 border-amber-500/30' },
  }

  const styles = categoryStyles[category] || categoryStyles.state

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
        <div className="text-xs font-medium text-white/90 leading-snug">{name}</div>
      </div>
      <span
        className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border ${styles.badge}`}
      >
        {category}
      </span>
    </div>
  )
}

function FlowConnector() {
  return (
    <div className="flex justify-center">
      <span className="h-2.5 w-px bg-white/15" />
    </div>
  )
}

function ResultCard({
  label,
  sublabel,
  status,
  color,
}: {
  label: string
  sublabel?: string
  status?: string
  color: 'blue' | 'purple' | 'green'
}) {
  const gradientColors = {
    blue: 'bg-gradient-to-br from-blue-500 to-transparent',
    purple: 'bg-gradient-to-br from-purple-500 to-transparent',
    green: 'bg-gradient-to-br from-green-500 to-transparent',
  }

  const dotColors = {
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
    green: 'bg-green-400',
  }

  return (
    <div className="relative rounded-xl border border-white/10 bg-white/[0.03] p-5 overflow-hidden">
      <div className={`absolute inset-0 opacity-10 ${gradientColors[color]}`} />
      <div className="relative">
        <div className="text-xs font-mono text-white/80 mb-1.5">{label}</div>
        {sublabel && <div className="text-xs font-mono text-white/50 mb-2">{sublabel}</div>}
        {status && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
            <span className={`h-1.5 w-1.5 rounded-full ${dotColors[color]}`} />
            <span className="text-xs text-white/70">{status}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ArrowDown() {
  return (
    <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  )
}

// SectionDivider moved to components/section-divider
