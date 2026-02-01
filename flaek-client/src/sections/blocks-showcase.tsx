import { motion } from 'framer-motion'
import {
  Database,
  PenLine,
  Plus,
  ShieldCheck,
  Key,
  Shield,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  Code,
} from 'lucide-react'
import SectionDivider from '@/components/section-divider'

const BLOCKS = [
  {
    id: 'flaek_create_state',
    name: 'Create State',
    icon: Database,
    category: 'state',
    color: '#38BDF8',
  },
  {
    id: 'flaek_update_state',
    name: 'Update State',
    icon: PenLine,
    category: 'state',
    color: '#22C55E',
  },
  {
    id: 'flaek_append_state',
    name: 'Append State',
    icon: Plus,
    category: 'state',
    color: '#F97316',
  },
  {
    id: 'flaek_delegate_state',
    name: 'Delegate State',
    icon: ShieldCheck,
    category: 'delegation',
    color: '#A855F7',
  },
  {
    id: 'flaek_create_permission',
    name: 'Create Permission (Flaek)',
    icon: Key,
    category: 'permission',
    color: '#0EA5E9',
  },
  {
    id: 'flaek_update_permission',
    name: 'Update Permission (Flaek)',
    icon: Shield,
    category: 'permission',
    color: '#22C55E',
  },
  {
    id: 'flaek_commit_permission',
    name: 'Commit Permission (Flaek)',
    icon: CheckCircle,
    category: 'permission',
    color: '#14B8A6',
  },
  {
    id: 'flaek_commit_undelegate_permission',
    name: 'Commit + Undelegate (Flaek)',
    icon: CheckCircle2,
    category: 'permission',
    color: '#0EA5E9',
  },
  {
    id: 'mb_magic_commit_undelegate',
    name: 'Magic Commit & Undelegate',
    icon: Sparkles,
    category: 'magic',
    color: '#FB923C',
  },
  {
    id: 'mb_program_instruction',
    name: 'Program Instruction',
    icon: Code,
    category: 'program',
    color: '#64748B',
  },
]

export default function BlocksShowcase() {
  return (
    <section
      id="blocks"
      className="section-demo relative overflow-hidden scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-outer pt-20 md:pt-32">
        <SectionDivider />
      </div>

      <div className="container-outer py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">MagicBlock Blocks</h2>
          <p className="mt-3 text-base md:text-lg text-white/60 max-w-xl mx-auto">
            Core state, permission, and delegation primitives available in Flaek
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {BLOCKS.map((block, i) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
            >
              <BlockCard block={block} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function BlockCard({ block }: { block: (typeof BLOCKS)[0] }) {
  const Icon = block.icon

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 flex items-center gap-3"
      style={{ backgroundColor: `${block.color}08`, borderColor: `${block.color}25` }}
    >
      <div
        className="h-9 w-9 rounded-xl border border-white/10 flex items-center justify-center"
        style={{ backgroundColor: `${block.color}15` }}
      >
        <Icon size={18} style={{ color: block.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white/90 truncate">{block.name}</div>
        <div className="text-[10px] uppercase tracking-widest text-white/50">{block.category}</div>
      </div>
    </div>
  )
}
