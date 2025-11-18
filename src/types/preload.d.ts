export {}

declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, data: any) => void
      receive: (channel: string, func: (...args: any[]) => void) => void
      invoke: (channel: string, data?: any) => Promise<any>
      db: {
        addNote: (title: string, content: string) => Promise<number>
        listNotes: () => Promise<Array<{ id: number; title: string; content: string; created_at: string }>>
        clearNotes: () => Promise<void>
      }
    }
  }
}
