import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export type CompanionDocument = {
  id: string
  title?: string
  filePath?: string
  text?: string
}

type CompanionContextValue = {
  document: CompanionDocument | null
  setDocument: (doc: CompanionDocument | null) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const CompanionContext = createContext<CompanionContextValue | undefined>(undefined)

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [document, setDocumentState] = useState<CompanionDocument | null>(null)
  const [open, setOpen] = useState(false)

  const setDocument = useCallback((doc: CompanionDocument | null) => {
    setDocumentState(prev => {
      if (doc) {
        const changed =
          !prev ||
          prev.id !== doc.id ||
          prev.text !== doc.text ||
          prev.title !== doc.title ||
          prev.filePath !== doc.filePath
        if (changed) setOpen(true)
      } else {
        setOpen(false)
      }
      return doc
    })
  }, [setOpen])

  const value = useMemo<CompanionContextValue>(
    () => ({
      document,
      setDocument,
      open,
      setOpen
    }),
    [document, open, setDocument]
  )

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>
}

export function useCompanion() {
  const ctx = useContext(CompanionContext)
  if (!ctx) throw new Error("useCompanion must be used within a CompanionProvider")
  return ctx
}
