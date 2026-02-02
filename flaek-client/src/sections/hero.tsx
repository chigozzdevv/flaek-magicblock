import { motion } from 'framer-motion'
import ButtonLink from '@/components/button'
import BackgroundGrid from '@/components/background-grid'
import { Modal } from '@/components/ui/modal'
import { useState } from 'react'

export default function Hero() {
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)
  return (
    <section
      id="overview"
      className="relative hero-bg text-center overflow-hidden scroll-mt-24 md:scroll-mt-28"
      onMouseMove={(e) => {
        const t = e.currentTarget.getBoundingClientRect()
        setMouse({ x: e.clientX - t.left, y: e.clientY - t.top })
      }}
      onMouseLeave={() => setMouse(null)}
    >
      <BackgroundGrid mouse={mouse} />
      <div className="container-outer pt-28 pb-24 md:pt-36 md:pb-32 relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-4xl md:text-6xl font-semibold leading-tight tracking-tight text-balance max-w-4xl md:max-w-5xl mx-auto"
        >
          <span className="block">Compose permissioned</span>
          <span className="block">MagicBlock flows</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08 }}
          className="mt-6 md:mt-7 text-lg md:text-xl leading-7 md:leading-8 text-white/80 text-pretty max-w-2xl mx-auto"
        >
          Build and run MagicBlock ER/PER flows with a visual builder or API, inject runtime
          context, and run jobs with user wallets.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="mt-10 flex flex-col md:flex-row items-center justify-center gap-3"
        >
          <ButtonLink href="/get-started" className="md:w-auto">
            Get started
          </ButtonLink>
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm md:text-base font-medium transition border border-white/10 hover:border-white/20 md:w-auto"
          >
            Watch demo
          </button>
        </motion.div>
      </div>
      <Modal open={demoOpen} onClose={() => setDemoOpen(false)} title="Flaek demo">
        <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden border border-white/10 bg-black/40">
          <iframe
            className="absolute inset-0 h-full w-full"
            src="https://www.youtube.com/embed/aoc7ihtRmek"
            title="flaek.dev demo | MagicBlock Solana Privacy Track"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </Modal>
    </section>
  )
}
