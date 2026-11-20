import { AlertCircle } from 'lucide-react'

/** Red notice shared by F2 and F3 errors, same look as the F1 date range warning (DEC-29). */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
    >
      <AlertCircle size={16} aria-hidden="true" />
      {message}
    </div>
  )
}
