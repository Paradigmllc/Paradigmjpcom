export function DemoFooter({ isJa }: { isJa: boolean }) {
  return (
    <footer className="border-t border-white/5 px-6 py-10 text-center text-sm text-zinc-600">
      <p>
        {isJa
          ? "© 2026 Paradigm LLC — このデモは診断データに基づいて自動生成されました。"
          : "© 2026 Paradigm LLC — This demo was auto-generated from diagnostic data."}
      </p>
    </footer>
  )
}
