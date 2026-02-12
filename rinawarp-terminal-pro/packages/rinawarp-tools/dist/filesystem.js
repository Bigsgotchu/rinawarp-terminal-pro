/**
 * Filesystem Tool Executor
 *
 * Safe filesystem operations with risk classification.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
/**
 * Read a file with optional size limiting.
 *
 * @param filePath - Path to the file
 * @param options - Reading options
 * @returns Promise resolving to file content
 */
export async function readFile(filePath, options) {
    const resolvedPath = path.resolve(filePath);
    const stats = await fs.stat(resolvedPath);
    if (stats.size > (options?.maxSize ?? 1024 * 1024)) {
        throw new Error(`File too large to read: ${stats.size} bytes`);
    }
    const content = await fs.readFile(resolvedPath, {
        encoding: options?.encoding ?? "utf8",
    });
    return content;
}
/**
 * Write content to a file, creating directories as needed.
 *
 * @param filePath - Path to the file
 * @param content - Content to write
 * @param options - Writing options
 */
export async function writeFile(filePath, content, options) {
    const resolvedPath = path.resolve(filePath);
    const dir = path.dirname(resolvedPath);
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(resolvedPath, content, {
        encoding: options?.encoding ?? "utf8",
        mode: options?.mode ?? "644",
    });
}
/**
 * Check if a path exists.
 *
 * @param filePath - Path to check
 * @returns Promise resolving to true if exists
 */
export async function exists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * List files in a directory.
 *
 * @param dirPath - Path to the directory
 * @returns Promise resolving to array of file info
 */
export async function listDir(dirPath) {
    const resolvedPath = path.resolve(dirPath);
    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(resolvedPath, entry.name);
        const stats = await fs.stat(fullPath);
        // Skip hidden files starting with dot (except . and ..)
        if (entry.name.startsWith(".") && entry.name !== "." && entry.name !== "..") {
            continue;
        }
        files.push({
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
            permissions: (stats.mode & 0o777).toString(8),
        });
    }
    return files.sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory && !b.isDirectory)
            return -1;
        if (!a.isDirectory && b.isDirectory)
            return 1;
        return a.path.localeCompare(b.path);
    });
}
/**
 * Create a directory recursively.
 *
 * @param dirPath - Path to create
 */
export async function mkdir(dirPath) {
    const resolvedPath = path.resolve(dirPath);
    await fs.mkdir(resolvedPath, { recursive: true });
}
/**
 * Remove a file.
 *
 * @param filePath - Path to the file to remove
 */
export async function removeFile(filePath) {
    const resolvedPath = path.resolve(filePath);
    await fs.unlink(resolvedPath);
}
/**
 * Get file info.
 *
 * @param filePath - Path to the file
 * @returns Promise resolving to file info
 */
export async function getFileInfo(filePath) {
    const resolvedPath = path.resolve(filePath);
    const stats = await fs.stat(resolvedPath);
    return {
        path: resolvedPath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
        permissions: (stats.mode & 0o777).toString(8),
    };
}
