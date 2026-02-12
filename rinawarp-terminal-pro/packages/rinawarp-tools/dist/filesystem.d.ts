/**
 * Filesystem Tool Executor
 *
 * Safe filesystem operations with risk classification.
 */
export interface FileInfo {
    path: string;
    isDirectory: boolean;
    size: number;
    modified: Date;
    permissions?: string;
}
export interface ReadFileOptions {
    encoding?: BufferEncoding;
    maxSize?: number;
}
export interface WriteFileOptions {
    encoding?: BufferEncoding;
    mode?: string;
}
/**
 * Read a file with optional size limiting.
 *
 * @param filePath - Path to the file
 * @param options - Reading options
 * @returns Promise resolving to file content
 */
export declare function readFile(filePath: string, options?: ReadFileOptions): Promise<string>;
/**
 * Write content to a file, creating directories as needed.
 *
 * @param filePath - Path to the file
 * @param content - Content to write
 * @param options - Writing options
 */
export declare function writeFile(filePath: string, content: string, options?: WriteFileOptions): Promise<void>;
/**
 * Check if a path exists.
 *
 * @param filePath - Path to check
 * @returns Promise resolving to true if exists
 */
export declare function exists(filePath: string): Promise<boolean>;
/**
 * List files in a directory.
 *
 * @param dirPath - Path to the directory
 * @returns Promise resolving to array of file info
 */
export declare function listDir(dirPath: string): Promise<FileInfo[]>;
/**
 * Create a directory recursively.
 *
 * @param dirPath - Path to create
 */
export declare function mkdir(dirPath: string): Promise<void>;
/**
 * Remove a file.
 *
 * @param filePath - Path to the file to remove
 */
export declare function removeFile(filePath: string): Promise<void>;
/**
 * Get file info.
 *
 * @param filePath - Path to the file
 * @returns Promise resolving to file info
 */
export declare function getFileInfo(filePath: string): Promise<FileInfo>;
