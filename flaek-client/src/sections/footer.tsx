export default function Footer() {
  return (
    <footer
      id="support"
      className="border-t border-[var(--color-border)] scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-outer py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
        <div>© {new Date().getFullYear()} Flaek</div>
        <nav className="flex items-center gap-5">
          <a href="/#overview" className="hover:text-white">
            Overview
          </a>
          <a href="/#how-it-works" className="hover:text-white">
            How it works
          </a>
          <a href="/#execution" className="hover:text-white">
            Execution
          </a>
          <a href="/#blocks" className="hover:text-white">
            Blocks
          </a>
        </nav>
      </div>
    </footer>
  )
}
