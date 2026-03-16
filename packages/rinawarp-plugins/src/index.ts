/**
 * RinaWarp Plugins Package
 *
 * Shared terminal plugins that can be loaded into RinaWarp.
 * This package provides core plugin types and built-in plugins.
 */

// Plugin types
export * from './types.js'

// Built-in plugins
export { default as dockerPlugin } from './dockerPlugin.js'
export { DockerPluginTool, AICoderAgent } from './dockerPlugin.js'

/**
 * Default export - map of all available plugins
 */
export default {
  docker: () => import('./dockerPlugin.js'),
}
