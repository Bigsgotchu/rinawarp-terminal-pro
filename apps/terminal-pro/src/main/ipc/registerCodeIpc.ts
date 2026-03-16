import type { IpcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export function registerCodeIpc(args: {
  ipcMain: IpcMain
  listFiles: (payload?: {
    projectRoot?: string
    limit?: number
  }) => Promise<{ ok: boolean; files?: string[]; error?: string }>
  readFile: (payload?: {
    projectRoot?: string
    relativePath?: string
    maxBytes?: number
  }) => Promise<{ ok: boolean; content?: string; relativePath?: string; truncated?: boolean; error?: string }>
}) {
  const { ipcMain } = args

  ipcMain.handle('rina:code:listFiles', async (_event, payload) => args.listFiles(payload))
  ipcMain.handle('rina:code:readFile', async (_event, payload) => args.readFile(payload))

  // --- Direct file read/save handlers for code integration panel ---
  
  // Read file at absolute path (for code editor integration)
  ipcMain.handle('read-file', async (_event, filePath: string) => {
    try {
      // Validate the path to prevent directory traversal attacks
      const resolvedPath = path.resolve(filePath)
      
      // Check if file exists and is a file
      const stats = await fs.stat(resolvedPath)
      if (!stats.isFile()) {
        return Promise.reject(new Error('Path is not a file'))
      }
      
      // Read file content
      const content = await fs.readFile(resolvedPath, 'utf-8')
      return content
    } catch (err) {
      console.error('Failed to read file:', err)
      return Promise.reject(err)
    }
  })

  // Save file at absolute path (for code editor integration)
  ipcMain.handle('save-file', async (_event, filePath: string, content: string) => {
    try {
      // Validate the path to prevent directory traversal attacks
      const resolvedPath = path.resolve(filePath)
      
      // Ensure parent directory exists
      const dir = path.dirname(resolvedPath)
      await fs.mkdir(dir, { recursive: true })
      
      // Write file content
      await fs.writeFile(resolvedPath, content, 'utf-8')
      console.log('File saved:', resolvedPath)
      return { ok: true, path: resolvedPath }
    } catch (err) {
      console.error('Failed to save file:', err)
      return Promise.reject(err)
    }
  })
}
