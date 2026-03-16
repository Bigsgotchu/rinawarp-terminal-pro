/**
 * Workspace Knowledge Graph
 *
 * Builds a knowledge graph of the project workspace.
 * Understands files, dependencies, imports, services, and relationships.
 */

import fs from 'fs'
import path from 'path'

export type NodeType =
  | 'file'
  | 'directory'
  | 'function'
  | 'class'
  | 'interface'
  | 'import'
  | 'export'
  | 'service'
  | 'component'
  | 'api'

export interface GraphNode {
  id: string
  type: NodeType
  name: string
  path: string
  metadata?: Record<string, unknown>
}

export interface GraphEdge {
  from: string
  to: string
  type: 'imports' | 'exports' | 'uses' | 'contains' | 'calls'
}

export interface KnowledgeGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  lastUpdated: string
  projectRoot: string
}

class KnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map()
  private edges: GraphEdge[] = []
  private projectRoot: string = ''
  private fileExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml'])

  /**
   * Build the knowledge graph from a project root
   */
  build(root: string): void {
    this.projectRoot = root
    this.nodes.clear()
    this.edges = []

    console.log(`[KnowledgeGraph] Building graph for: ${root}`)

    // Walk the directory tree
    this.walkDirectory(root)

    console.log(`[KnowledgeGraph] Built graph with ${this.nodes.size} nodes and ${this.edges.length} edges`)
  }

  /**
   * Walk directory and add nodes
   */
  private walkDirectory(dir: string, parentId?: string): void {
    let entries: fs.Dirent[]

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      // Skip hidden files and common ignore patterns
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue
      if (['node_modules', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) continue

      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(this.projectRoot, fullPath)
      const nodeId = relativePath

      if (entry.isDirectory()) {
        // Add directory node
        this.addNode({
          id: nodeId,
          type: 'directory',
          name: entry.name,
          path: relativePath,
        })

        // Link to parent
        if (parentId) {
          this.addEdge(parentId, nodeId, 'contains')
        }

        // Recurse
        this.walkDirectory(fullPath, nodeId)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)

        if (this.fileExtensions.has(ext)) {
          // Add file node
          const fileNode = this.addNode({
            id: nodeId,
            type: this.getFileType(ext, entry.name),
            name: entry.name,
            path: relativePath,
          })

          // Link to parent
          if (parentId) {
            this.addEdge(parentId, nodeId, 'contains')
          }

          // Parse file for imports/exports
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            this.parseFileImports(fullPath, nodeId)
          }
        }
      }
    }
  }

  /**
   * Determine file type from extension
   */
  private getFileType(ext: string, name: string): NodeType {
    if (ext === '.json') return 'file'
    if (ext === '.md') return 'file'
    if (ext === '.yml' || ext === '.yaml') return 'file'

    // Check for special files
    if (name.includes('service') || name.includes('Service')) return 'service'
    if (name.includes('component') || name.includes('Component')) return 'component'
    if (name.includes('api') || name.includes('API')) return 'api'

    return 'file'
  }

  /**
   * Parse file for imports and exports
   */
  private parseFileImports(filePath: string, fileNodeId: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')

      // Find import statements
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
      let match

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1]
        const resolvedPath = this.resolveImportPath(filePath, importPath)

        if (resolvedPath) {
          this.addEdge(fileNodeId, resolvedPath, 'imports')
        }
      }

      // Find export statements
      const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type)\s+(\w+)/g

      while ((match = exportRegex.exec(content)) !== null) {
        const exportName = match[1]
        const exportNodeId = `${fileNodeId}:${exportName}`

        this.addNode({
          id: exportNodeId,
          type: 'export',
          name: exportName,
          path: fileNodeId,
          metadata: { exportName },
        })

        this.addEdge(fileNodeId, exportNodeId, 'exports')
      }
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Resolve import path to node ID
   */
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(path.dirname(fromFile), importPath)
      const relative = path.relative(this.projectRoot, resolved)

      // Add extension if missing
      if (!path.extname(resolved)) {
        for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js']) {
          const withExt = resolved + ext
          if (fs.existsSync(withExt)) {
            return path.relative(this.projectRoot, withExt)
          }
        }
      }

      return relative
    }

    // Handle absolute imports (like @/...)
    // Could resolve to node_modules

    return null
  }

  /**
   * Add a node to the graph
   */
  addNode(node: GraphNode): GraphNode {
    this.nodes.set(node.id, node)
    return node
  }

  /**
   * Add an edge to the graph
   */
  addEdge(from: string, to: string, type: GraphEdge['type']): void {
    // Only add edge if both nodes exist
    if (this.nodes.has(from) && this.nodes.has(to)) {
      this.edges.push({ from, to, type })
    }
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id)
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type: NodeType): GraphNode[] {
    return [...this.nodes.values()].filter((n) => n.type === type)
  }

  /**
   * Get all edges for a node
   */
  getEdges(nodeId: string): GraphEdge[] {
    return this.edges.filter((e) => e.from === nodeId || e.to === nodeId)
  }

  /**
   * Get related nodes (one hop)
   */
  getRelated(nodeId: string): GraphNode[] {
    const relatedIds = new Set<string>()

    for (const edge of this.edges) {
      if (edge.from === nodeId) relatedIds.add(edge.to)
      if (edge.to === nodeId) relatedIds.add(edge.from)
    }

    return [...relatedIds].map((id) => this.nodes.get(id)).filter(Boolean) as GraphNode[]
  }

  /**
   * Search nodes by name
   */
  search(query: string): GraphNode[] {
    const lower = query.toLowerCase()
    return [...this.nodes.values()].filter(
      (n) => n.name.toLowerCase().includes(lower) || n.path.toLowerCase().includes(lower)
    )
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    totalNodes: number
    totalEdges: number
    nodesByType: Record<NodeType, number>
  } {
    const nodesByType: Record<NodeType, number> = {} as Record<NodeType, number>

    for (const node of this.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      nodesByType,
    }
  }

  /**
   * Export graph as JSON
   */
  export(): KnowledgeGraphData {
    return {
      nodes: [...this.nodes.values()],
      edges: this.edges,
      lastUpdated: new Date().toISOString(),
      projectRoot: this.projectRoot,
    }
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear()
    this.edges = []
    this.projectRoot = ''
  }
}

export const knowledgeGraph = new KnowledgeGraph()
