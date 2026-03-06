/**
 * @rinawarp/tools
 * 
 * Tool execution adapters exports.
 */

// Terminal
export { 
  run, 
  runOrThrow, 
  commandExists, 
  getPlatform,
  platform,
  type TerminalResult,
  type TerminalOptions 
} from "./terminal.js";

// Filesystem
export {
  readFile,
  writeFile,
  exists,
  listDir,
  mkdir,
  removeFile,
  getFileInfo,
  type FileInfo,
  type ReadFileOptions,
  type WriteFileOptions
} from "./filesystem.js";

// Git
export {
  getStatus,
  getLog,
  stage,
  commit,
  getBranch,
  isRepo,
  type GitStatus,
  type GitLogEntry
} from "./git.js";
