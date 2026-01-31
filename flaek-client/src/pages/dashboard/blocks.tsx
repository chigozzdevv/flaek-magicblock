import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiGetBlocks } from '@/lib/api'

type Block = {
  id: string
  name: string
  category: string
  description: string
  inputs: Array<{ name: string; type: string; description: string; required: boolean }>
  outputs: Array<{ name: string; type: string; description: string }>
  tags?: string[]
}

const categoryStyles: Record<string, string> = {
  permission: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  delegation: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  magic: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  program: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
}

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    apiGetBlocks()
      .then((res) => setBlocks(res.blocks || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = blocks.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold">Blocks</h1>
        <p className="text-sm text-white/60 mt-1">MagicBlock primitives available in the builder</p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-brand-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-white/60">No blocks found.</Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((block) => (
              <Card key={block.id} className="p-4 border border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{block.name}</div>
                  <Badge className={categoryStyles[block.category] || 'bg-white/5'}>{block.category}</Badge>
                </div>
                <div className="text-xs text-white/60 mt-2">{block.description}</div>
                <div className="mt-3 text-[11px] text-white/50">
                  Inputs: {block.inputs.map((i) => i.name).join(', ') || 'None'}
                </div>
                <div className="text-[11px] text-white/50">
                  Outputs: {block.outputs.map((o) => o.name).join(', ') || 'None'}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
