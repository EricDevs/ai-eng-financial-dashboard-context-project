import { AlertCircle } from 'lucide-react'

/** Red error notice shared by F1, F2 and F3 (spec DEC-28, DEC-29). */
export function ErrorNotice({ children }: { children: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
    >
      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  )
}
