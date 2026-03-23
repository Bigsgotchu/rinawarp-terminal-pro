/**
 * Agent Tools - Filesystem, Git, and System Operations
 * 
 * These tools are called by the AI agent to perform actual work.
 * Each tool returns a receipt-ready result with proof.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import * as crypto from 'crypto';

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  proof: string; // Hash of the operation
}

/**
 * Filesystem Tools
 */
export class FilesystemTools {
  /**
   * Read file contents
   */
  static async readFile(filePath: string): Promise<ToolResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const proof = crypto.createHash('sha256').update(content).digest('hex');
      
      return {
        success: true,
        output: content,
        proof,
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        proof: crypto.createHash('sha256').update(error.message).digest('hex'),
      };
    }
  }

  /**
   * Write file contents
   */
  static async writeFile(filePath: string, content: string): Promise<ToolResult> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      const proof = crypto.createHash('sha256').update(content).digest('hex');
      
      return {
        success: true,
        output: `Written to ${filePath}`,
        proof,
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        proof: crypto.createHash('sha256').update(error.message).digest('hex'),
      };
    }
  }

  /**
   * List directory contents
   */
  static async listDirectory(dirPath: string): Promise<ToolResult> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items = entries.map(entry => 
        entry.isDirectory() ? `📁 ${entry.name}/` : `📄 ${entry.name}`
      );
      const output = items.join('\n');
      const proof = crypto.createHash('sha256').update(output).digest('hex');
      
      return {
        success: true,
        output,
        proof,
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        proof: crypto.createHash('sha256').update(error.message).digest('hex'),
      };
    }
  }

  /**
   * Check if file/directory exists
   */
  static async exists(filePath: string): Promise<ToolResult> {
    try {
      await fs.access(filePath);
      const proof = crypto.createHash('sha256').update(`exists:${filePath}`).digest('hex');
      
      return {
        success: true,
        output: `${filePath} exists`,
        proof,
      };
    } catch (error: any) {
      return {
        success: false,
        output: `${filePath} does not exist`,
        error: error.message,
        proof: crypto.createHash('sha256').update(`not_exists:${filePath}`).digest('hex'),
      };
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(filePath: string): Promise<ToolResult> {
    try {
      await fs.unlink(filePath);
      const proof = crypto.createHash('sha256').update(`deleted:${filePath}`).digest('hex');
      
      return {
        success: true,
        output: `Deleted ${filePath}`,
        proof,
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        proof: crypto.createHash('sha256').update(error.message).digest('hex'),
      };
    }
  }

  /**
   * Create directory
   */
  static async createDirectory(dirPath: string): Promise<ToolResult> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      const proof = crypto.createHash('sha256').update(`created:${dirPath}`).digest('hex');
      
      return {
        success: true,
        output: `Created ${dirPath}`,
        proof,
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message,
        proof: crypto.createHash('sha256').update(error.message).digest('hex'),
      };
    }
  }
}

/**
 * Git Tools
 */
export class GitTools {
  /**
   * Execute git command
   */
  private static async execGit(args: string, cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const proc = spawn('git', args.split(' '), { cwd });
      
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode: exitCode || 0 });
      });

      proc.on('error', (error) => {
        resolve({ stdout: '', stderr: error.message, exitCode: 1 });
      });
    });
  }

  /**
   * Get git status
   */
  static async status(repoPath: string): Promise<ToolResult> {
    const result = await this.execGit('status --short', repoPath);
    const proof = crypto.createHash('sha256').update(result.stdout).digest('hex');
    
    return {
      success: result.exitCode === 0,
      output: result.stdout || 'No changes',
      error: result.exitCode !== 0 ? result.stderr : undefined,
      proof,
    };
  }

  /**
   * Get git diff
   */
  static async diff(repoPath: string, file?: string): Promise<ToolResult> {
    const args = file ? `diff ${file}` : 'diff';
    const result = await this.execGit(args, repoPath);
    const proof = crypto.createHash('sha256').update(result.stdout).digest('hex');
    
    return {
      success: result.exitCode === 0,
      output: result.stdout || 'No changes',
      error: result.exitCode !== 0 ? result.stderr : undefined,
      proof,
    };
  }

  /**
   * Stage files
   */
  static async add(repoPath: string, files: string = '.'): Promise<ToolResult> {
    const result = await this.execGit(`add ${files}`, repoPath);
    const proof = crypto.createHash('sha256').update(`added:${files}`).digest('hex');
    
    return {
      success: result.exitCode === 0,
      output: `Staged ${files}`,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      proof,
    };
  }

  /**
   * Commit changes
   */
  static async commit(repoPath: string, message: string): Promise<ToolResult> {
    const result = await this.execGit(`commit -m "${message}"`, repoPath);
    const proof = crypto.createHash('sha256').update(`${message}:${result.stdout}`).digest('hex');
    
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      proof,
    };
  }

  /**
   * Get commit log
   */
  static async log(repoPath: string, count: number = 10): Promise<ToolResult> {
    const result = await this.execGit(`log --oneline -n ${count}`, repoPath);
    const proof = crypto.createHash('sha256').update(result.stdout).digest('hex');
    
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      proof,
    };
  }

  /**
   * Get current branch
   */
  static async branch(repoPath: string): Promise<ToolResult> {
    const result = await this.execGit('branch --show-current', repoPath);
    const proof = crypto.createHash('sha256').update(result.stdout).digest('hex');
    
    return {
      success: result.exitCode === 0,
      output: result.stdout.trim(),
      error: result.exitCode !== 0 ? result.stderr : undefined,
      proof,
    };
  }

  /**
   * Pull changes
   */
  static async pull(repoPath: string): Promise<ToolResult> {
    const result = await this.execGit('pull', repoPath);
    const proof = crypto.createHash('sha256').update(result.stdout).digest('hex');
    
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      proof,
    };
  }

  /**
   * Push changes
   */
  static async push(repoPath: string): Promise<ToolResult> {
    const result = await this.execGit('push', repoPath);
    const proof = crypto.createHash('sha256').update(result.stdout).digest('hex');
    
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      proof,
    };
  }
}

/**
 * System Tools
 */
export class SystemTools {
  /**
   * Execute shell command
   */
  static async exec(command: string, cwd: string): Promise<ToolResult> {
    return new Promise((resolve) => {
      const proc = spawn(command, { cwd, shell: true, timeout: 60000 });
      
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        const proof = crypto.createHash('sha256').update(stdout).digest('hex');
        resolve({
          success: exitCode === 0,
          output: stdout,
          error: exitCode !== 0 ? stderr : undefined,
          proof,
        });
      });

      proc.on('error', (error) => {
        const proof = crypto.createHash('sha256').update(error.message).digest('hex');
        resolve({
          success: false,
          output: '',
          error: error.message,
          proof,
        });
      });
    });
  }

  /**
   * Get environment variable
   */
  static async getEnv(key: string): Promise<ToolResult> {
    const value = process.env[key];
    const proof = crypto.createHash('sha256').update(`${key}:${value || 'undefined'}`).digest('hex');
    
    return {
      success: value !== undefined,
      output: value || '',
      error: value === undefined ? `Environment variable ${key} not set` : undefined,
      proof,
    };
  }

  /**
   * Get system information
   */
  static async sysinfo(): Promise<ToolResult> {
    const info = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
      uptime: process.uptime(),
    };
    
    const output = Object.entries(info)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    const proof = crypto.createHash('sha256').update(output).digest('hex');
    
    return {
      success: true,
      output,
      proof,
    };
  }
}

/**
 * Deploy Tools
 */
export class DeployTools {
  /**
   * Deploy to Vercel
   */
  static async vercel(projectPath: string): Promise<ToolResult> {
    const result = await SystemTools.exec('vercel --prod', projectPath);
    return result;
  }

  /**
   * Deploy to Cloudflare
   */
  static async cloudflare(workerPath: string): Promise<ToolResult> {
    const result = await SystemTools.exec('wrangler deploy', workerPath);
    return result;
  }

  /**
   * Build Docker image
   */
  static async docker(dockerfilePath: string, tag: string): Promise<ToolResult> {
    const dir = path.dirname(dockerfilePath);
    const result = await SystemTools.exec(`docker build -t ${tag} .`, dir);
    return result;
  }
}
