import { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  useEdgesState,
  useNodesState,
  Background,
  Controls,
  Panel,
  Handle,
  Position,
  ConnectionLineType,
} from 'reactflow'
import type { Connection, Node, NodeTypes } from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import {
  apiCreateContext,
  apiCreateOperation,
  apiGetBlocks,
  apiGetPipelineTemplates,
  apiTestPipeline,
} from '@/lib/api'

type BlockDef = {
  id: string
  name: string
  category: string
  description: string
  inputs: Array<{ name: string; type: string; description: string; required: boolean }>
  outputs: Array<{ name: string; type: string; description: string }>
  icon?: string
  color?: string
}

function BlockNode({
  data,
  selected,
  isConnectable,
}: {
  data: any
  selected?: boolean
  isConnectable?: boolean
}) {
  const blockColor = data.block?.color || '#64748B'
  return (
    <div
      className={`px-4 py-3 rounded-lg border min-w-[180px] transition-all bg-[#0e1726] ${
        selected ? 'shadow-xl' : 'hover:shadow-xl'
      }`}
      style={{ borderColor: selected ? blockColor + '99' : blockColor + '55' }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: blockColor, borderColor: blockColor }}
        className="w-3 h-3 border-2 shadow-[0_0_0_3px_rgba(255,255,255,0.06)]"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: blockColor, borderColor: blockColor }}
        className="w-3 h-3 border-2 shadow-[0_0_0_3px_rgba(255,255,255,0.06)]"
      />
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold" style={{ color: blockColor }}>
          {data.block?.category || 'block'}
        </div>
        <div className="text-[10px] text-white/40">{data.blockId}</div>
      </div>
      <div className="text-sm font-medium text-white/90">{data.label}</div>
    </div>
  )
}

const nodeTypes: NodeTypes = { block: BlockNode }

export default function PipelineBuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [blocks, setBlocks] = useState<BlockDef[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planResult, setPlanResult] = useState<any>(null)
  const [planning, setPlanning] = useState(false)
  const [planError, setPlanError] = useState('')
  const [templates, setTemplates] = useState<any[]>([])
  const [draftConfig, setDraftConfig] = useState<Record<string, any>>({})
  const [configText, setConfigText] = useState('')
  const [configError, setConfigError] = useState('')
  const [configDirty, setConfigDirty] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    apiGetBlocks()
      .then((res) => setBlocks(res.blocks || []))
      .catch(() => setBlocks([]))
  }, [])

  useEffect(() => {
    apiGetPipelineTemplates()
      .then((res) => setTemplates(res.templates || []))
      .catch(() => setTemplates([]))
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  function addBlockNode(block: BlockDef) {
    const id = `block-${Date.now()}`
    const newNode: Node = {
      id,
      type: 'block',
      position: { x: 200 + nodes.length * 40, y: 120 + nodes.length * 40 },
      data: {
        label: block.name,
        blockId: block.id,
        block,
        config: {},
      },
    }
    setNodes((nds) => [...nds, newNode])
  }

  useEffect(() => {
    if (!selectedNode) {
      setDraftConfig({})
      setConfigText('')
      setConfigError('')
      setConfigDirty(false)
      setShowAdvanced(false)
      return
    }
    const initialConfig = selectedNode.data.config || {}
    setDraftConfig(initialConfig)
    setConfigText(JSON.stringify(initialConfig, null, 2))
    setConfigError('')
    setConfigDirty(false)
    setShowAdvanced(false)
  }, [selectedNode?.id])

  function updateSelectedConfig(raw: string) {
    if (!selectedNode) return
    try {
      const parsed = raw.trim() ? JSON.parse(raw) : {}
      setDraftConfig(parsed)
      setConfigText(JSON.stringify(parsed, null, 2))
      setConfigError('')
      setConfigDirty(true)
    } catch {
      setConfigError('Invalid JSON')
    }
  }

  function updateSelectedConfigObject(nextConfig: Record<string, any>) {
    if (!selectedNode) return
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id ? { ...n, data: { ...n.data, config: nextConfig } } : n,
      ),
    )
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, config: nextConfig } })
    setDraftConfig(nextConfig)
    setConfigText(JSON.stringify(nextConfig, null, 2))
    setConfigError('')
    setConfigDirty(false)
  }

  function updateDraftConfig(nextConfig: Record<string, any>) {
    setDraftConfig(nextConfig)
    setConfigText(JSON.stringify(nextConfig, null, 2))
    setConfigError('')
    setConfigDirty(true)
  }

  function isDefaultHiddenInput(input: { name: string; required: boolean; description?: string }) {
    if (showAdvanced) return false
    if (input.required) return false
    const desc = (input.description || '').toLowerCase()
    if (desc.includes('defaults to wallet')) return true
    return input.name === 'owner' || input.name === 'payer'
  }

  function coerceValue(type: string, value: string | boolean) {
    if (type === 'number') return value === '' ? '' : Number(value)
    if (type === 'boolean') return Boolean(value)
    return value
  }

  async function handlePlan() {
    setPlanning(true)
    setPlanError('')
    try {
      const pipeline = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: 'block',
          blockId: n.data.blockId,
          data: n.data.config || {},
          position: n.position,
        })),
        edges,
      }
      const res = await apiTestPipeline({ pipeline, inputs: {} })
      setPlanResult(res.plan)
      setShowPlanModal(true)
    } catch (e: any) {
      setPlanError(e.message || 'Failed to build plan')
    } finally {
      setPlanning(false)
    }
  }

  function deleteNode(nodeId: string) {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    if (selectedNode?.id === nodeId) setSelectedNode(null)
  }

  function loadTemplate(template: any) {
    const templateNodes = template.pipeline.nodes.map((n: any) => ({
      id: n.id,
      type: 'block',
      position: n.position || { x: 200, y: 120 },
      data: {
        label: blocks.find((b) => b.id === n.blockId)?.name || n.blockId,
        blockId: n.blockId,
        block: blocks.find((b) => b.id === n.blockId),
        config: n.data || {},
      },
    }))
    setNodes(templateNodes)
    setEdges(template.pipeline.edges || [])
    setShowTemplates(false)
  }

  function PublishPipelineModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [name, setName] = useState('')
    const [version, setVersion] = useState('1.0.0')
    const [contextName, setContextName] = useState('')
    const [contextSchema, setContextSchema] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleSave() {
      if (!name.trim() || !version.trim()) {
        setError('Name and version are required')
        return
      }
      setSaving(true)
      setError('')
      try {
        const pipeline = {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: 'block',
            blockId: n.data.blockId,
            data: n.data.config || {},
            position: n.position,
          })),
          edges,
        }
        let contextId: string | undefined
        if (contextSchema.trim()) {
          let parsedSchema: any
          try {
            parsedSchema = JSON.parse(contextSchema)
          } catch {
            setError('Context schema must be valid JSON')
            setSaving(false)
            return
          }
          const ctxName = contextName.trim() || `${name.trim()} context`
          const contextRes = await apiCreateContext({ name: ctxName, schema: parsedSchema })
          contextId = contextRes.context_id
        }
        await apiCreateOperation({
          name: name.trim(),
          version: version.trim(),
          pipeline,
          ...(contextId ? { contextId } : {}),
        })
        onClose()
      } catch (e: any) {
        setError(e.message || 'Failed to save flow')
      } finally {
        setSaving(false)
      }
    }

    return (
      <Modal open={open} onClose={onClose} title="Save Flow">
        <div className="space-y-4">
          <input
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
            placeholder="Flow name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
            placeholder="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
          <div className="space-y-2">
            <label className="text-xs text-white/60">Context name (optional)</label>
            <input
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
              placeholder="e.g. game-event-context"
              value={contextName}
              onChange={(e) => setContextName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-white/60">Context schema (JSON, optional)</label>
            <textarea
              className="w-full h-32 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white font-mono"
              placeholder='{"type":"object","properties":{"playerHash":{"type":"string"},"gameState":{"type":"object"}}}'
              value={contextSchema}
              onChange={(e) => setContextSchema(e.target.value)}
            />
            <div className="text-[11px] text-white/40">
              Context validates runtime inputs and powers snippet placeholders.
            </div>
          </div>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Flow'}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="w-64 h-full border-r border-white/10 bg-bg-elev flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">MagicBlock Blocks</h2>
            <Button variant="secondary" onClick={() => setShowTemplates(true)} className="text-xs">
              Templates
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {blocks.map((block) => (
            <button
              key={block.id}
              onClick={() => addBlockNode(block)}
              className="w-full text-left p-3 rounded-lg bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition"
            >
              <div className="text-sm font-semibold">{block.name}</div>
              <div className="text-xs text-white/50">{block.description}</div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-bg-elev">
          <div className="space-y-2">
            <Button onClick={() => setShowSaveModal(true)} className="w-full">
              Save Flow
            </Button>
            <Button variant="secondary" onClick={handlePlan} className="w-full" disabled={planning}>
              {planning ? 'Planning...' : 'Build Plan'}
            </Button>
            {planError && <div className="text-xs text-red-400">{planError}</div>}
          </div>
        </div>
      </div>

      <div className="flex-1 relative h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNode(node)}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { stroke: '#7c3aed', strokeWidth: 2 },
          }}
          fitView
        >
          <Background gap={20} size={2} color="#ffffff" style={{ opacity: 0.05 }} />
          <Controls position="bottom-right" />
          <Panel position="top-center">
            {nodes.length === 0 && (
              <Card className="p-3 shadow-2xl">
                <p className="text-sm text-text-secondary">
                  Add blocks from the left to build your flow.
                </p>
              </Card>
            )}
          </Panel>
        </ReactFlow>

        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 w-80 border-l border-white/10 bg-bg-elev p-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{selectedNode.data.label}</div>
                <Badge className="mt-1">{selectedNode.data.blockId}</Badge>
              </div>
              <button onClick={() => deleteNode(selectedNode.id)} className="text-xs text-red-400">
                Delete
              </button>
            </div>
            <div className="mt-4">
              {selectedNode.data.block?.inputs?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-white/70">Inputs</div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((s) => !s)}
                      className="text-[11px] text-white/50 hover:text-white/80 transition"
                    >
                      {showAdvanced ? 'Hide advanced' : 'Advanced options'}
                    </button>
                  </div>
                  {!showAdvanced && (
                    <div className="text-[11px] text-white/40">
                      Defaults (like owner/payer) are hidden until you open advanced options.
                    </div>
                  )}
                  {selectedNode.data.block.inputs
                    .filter((input: any) => !isDefaultHiddenInput(input))
                    .map((input: any) => {
                      const current = draftConfig?.[input.name]
                      const isNumber = input.type === 'number'
                      const isBoolean = input.type === 'boolean'
                      return (
                        <label key={input.name} className="block text-xs text-white/60">
                          <div className="mb-1 flex items-center justify-between">
                            <span>
                              {input.name}
                              {input.required ? ' *' : ''}
                            </span>
                            <span className="text-[10px] text-white/40">{input.type}</span>
                          </div>
                          {isBoolean ? (
                            <input
                              type="checkbox"
                              checked={Boolean(current)}
                              onChange={(e) => {
                                const next = { ...(draftConfig || {}) }
                                next[input.name] = coerceValue(input.type, e.target.checked)
                                updateDraftConfig(next)
                              }}
                            />
                          ) : (
                            <input
                              type={isNumber ? 'number' : 'text'}
                              value={current ?? ''}
                              onChange={(e) => {
                                const next = { ...(draftConfig || {}) }
                                next[input.name] = coerceValue(input.type, e.target.value)
                                updateDraftConfig(next)
                              }}
                              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white"
                              placeholder={input.description || ''}
                            />
                          )}
                        </label>
                      )
                    })}
                </div>
              )}
              {showAdvanced && (
                <>
                  <label className="text-xs font-semibold text-white/70 mb-2 block">
                    Config (JSON)
                  </label>
                  <textarea
                    className="w-full h-48 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white font-mono"
                    value={configText}
                    onChange={(e) => {
                      setConfigText(e.target.value)
                      setConfigDirty(true)
                    }}
                    onBlur={(e) => updateSelectedConfig(e.target.value)}
                  />
                  {configError && (
                    <div className="text-[11px] text-red-400 mt-2">{configError}</div>
                  )}
                </>
              )}
              <div className="mt-4">
                <Button
                  className="w-full"
                  disabled={!configDirty || Boolean(configError)}
                  onClick={() => {
                    try {
                      const parsed = configText.trim() ? JSON.parse(configText) : {}
                      updateSelectedConfigObject(parsed)
                    } catch {
                      setConfigError('Invalid JSON')
                    }
                  }}
                >
                  Save Config
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSaveModal && (
        <PublishPipelineModal open={showSaveModal} onClose={() => setShowSaveModal(false)} />
      )}

      {showTemplates && (
        <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Flow Templates">
          <div className="space-y-3">
            {templates.length === 0 ? (
              <div className="text-xs text-white/50">Load blocks to view templates.</div>
            ) : (
              templates.map((template: any) => (
                <button
                  key={template.id}
                  onClick={() => loadTemplate(template)}
                  className="w-full p-4 rounded-lg bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-left"
                >
                  <div className="font-medium mb-1">{template.name}</div>
                  <div className="text-xs text-white/50">{template.description}</div>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}

      {showPlanModal && (
        <Modal open={showPlanModal} onClose={() => setShowPlanModal(false)} title="Execution Plan">
          <pre className="text-xs whitespace-pre-wrap text-white/80">
            {JSON.stringify(planResult, null, 2)}
          </pre>
        </Modal>
      )}
    </div>
  )
}
