import { motion } from 'framer-motion'

const items = [
  {
    title: 'Permissioned execution',
    sub: 'ER/PER primitives',
    body: 'Delegate, commit, and undelegate state with MagicBlock building blocks.'
  },
  {
    title: 'Context‑driven flows',
    sub: 'Runtime inputs',
    body: 'Define a context schema in the flow and validate per‑event inputs.'
  },
  {
    title: 'Developer‑first',
    sub: 'SDK + dashboard',
    body: 'Run jobs via SDK or API, stream logs, and manage flows in one place.'
  },
]

export default function BenefitsPanel() {
  return (
    <section className="section-bg">
      <div className="container-outer py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2, margin: '-10% 0px' }}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.55,
                    ease: [0.16, 1, 0.3, 1],
                    staggerChildren: 0.08,
                    delayChildren: 0.05,
                  },
                },
              }}
              transition={{ delay: i * 0.06 }}
            >
              <motion.h3
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } }}
                className="text-2xl md:text-3xl font-semibold"
              >
                {it.title}
              </motion.h3>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } }}
                className="mt-1 text-xl md:text-2xl text-white/70"
              >
                {it.sub}
              </motion.div>
              <motion.p
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } }}
                className="mt-4 text-white/70 leading-relaxed"
              >
                {it.body}
              </motion.p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
