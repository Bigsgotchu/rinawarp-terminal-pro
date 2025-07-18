/**
 * Unit tests for PluginSecurity class
 */

import { jest } from '@jest/globals';
import { PluginSecurity } from '../plugin-manager.js';

describe('PluginSecurity', () => {
  let pluginSecurity;
  let mockPluginManager;

  beforeEach(() => {
    mockPluginManager = {
      emit: jest.fn(),
    };

    pluginSecurity = new PluginSecurity(mockPluginManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(pluginSecurity.pluginManager).toBe(mockPluginManager);
      expect(pluginSecurity.allowedPaths).toEqual(['/tmp/rinawarp-plugins', '~/.rinawarp/plugins']);
    });
  });

  describe('validatePlugin', () => {
    it('should validate a valid plugin', async () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        permissions: ['terminal:access'],
      };

      const code = 'RinaWarp.terminal.write("hello");';

      await expect(pluginSecurity.validatePlugin(manifest, code)).resolves.not.toThrow();
    });

    it('should reject plugin with invalid manifest', async () => {
      const manifest = {
        // Missing name and version
        permissions: ['terminal:access'],
      };

      const code = 'console.log("hello");';

      await expect(pluginSecurity.validatePlugin(manifest, code)).rejects.toThrow(
        'Invalid plugin manifest'
      );
    });

    it('should reject plugin with missing permissions', async () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        permissions: [], // No permissions declared
      };

      const code = 'RinaWarp.terminal.write("hello");'; // Requires terminal:access

      await expect(pluginSecurity.validatePlugin(manifest, code)).rejects.toThrow(
        'Missing permission: terminal:access'
      );
    });

    it('should reject plugin with dangerous code patterns', async () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        permissions: ['terminal:access'],
      };

      const code = 'eval("malicious code");';

      await expect(pluginSecurity.validatePlugin(manifest, code)).rejects.toThrow(
        'Potentially dangerous code detected'
      );
    });
  });

  describe('extractRequiredPermissions', () => {
    it('should extract terminal permissions', () => {
      const code = 'RinaWarp.terminal.write("hello");';
      const permissions = pluginSecurity.extractRequiredPermissions(code);

      expect(permissions).toContain('terminal:access');
    });

    it('should extract filesystem permissions', () => {
      const code = 'RinaWarp.fs.readFile("/path/to/file");';
      const permissions = pluginSecurity.extractRequiredPermissions(code);

      expect(permissions).toContain('filesystem:access');
    });

    it('should extract network permissions', () => {
      const code = 'RinaWarp.http.get("https://api.example.com");';
      const permissions = pluginSecurity.extractRequiredPermissions(code);

      expect(permissions).toContain('network:access');
    });

    it('should extract multiple permissions', () => {
      const code = `
        RinaWarp.terminal.write("hello");
        RinaWarp.fs.readFile("/path/to/file");
        RinaWarp.http.get("https://api.example.com");
      `;
      const permissions = pluginSecurity.extractRequiredPermissions(code);

      expect(permissions).toContain('terminal:access');
      expect(permissions).toContain('filesystem:access');
      expect(permissions).toContain('network:access');
    });

    it('should return empty array for safe code', () => {
      const code = 'console.log("hello world");';
      const permissions = pluginSecurity.extractRequiredPermissions(code);

      expect(permissions).toEqual([]);
    });
  });

  describe('analyzeCode', () => {
    it('should pass safe code', async () => {
      const code = 'console.log("hello world");';

      await expect(pluginSecurity.analyzeCode(code)).resolves.not.toThrow();
    });

    it('should detect eval usage', async () => {
      const code = 'eval("malicious code");';

      await expect(pluginSecurity.analyzeCode(code)).rejects.toThrow(
        'Potentially dangerous code detected'
      );
    });

    it('should detect Function constructor', async () => {
      const code = 'new Function("malicious code");';

      await expect(pluginSecurity.analyzeCode(code)).rejects.toThrow(
        'Potentially dangerous code detected'
      );
    });

    it('should detect document.write usage', async () => {
      const code = 'document.write("<script>alert(1)</script>");';

      await expect(pluginSecurity.analyzeCode(code)).rejects.toThrow(
        'Potentially dangerous code detected'
      );
    });

    it('should detect innerHTML assignment', async () => {
      const code = 'element.innerHTML = "<script>alert(1)</script>";';

      await expect(pluginSecurity.analyzeCode(code)).rejects.toThrow(
        'Potentially dangerous code detected'
      );
    });

    it('should detect exec usage', async () => {
      const code = 'exec("rm -rf /");';

      await expect(pluginSecurity.analyzeCode(code)).rejects.toThrow(
        'Potentially dangerous code detected'
      );
    });

    it('should detect spawn usage', async () => {
      const code = 'spawn("malicious", ["command"]);';

      await expect(pluginSecurity.analyzeCode(code)).rejects.toThrow(
        'Potentially dangerous code detected'
      );
    });
  });

  describe('validatePath', () => {
    it('should allow paths within allowed directories', () => {
      const validPaths = [
        '/tmp/rinawarp-plugins/test-plugin',
        '~/.rinawarp/plugins/another-plugin',
        '/tmp/rinawarp-plugins/subdir/plugin.js',
      ];

      validPaths.forEach(path => {
        expect(pluginSecurity.validatePath(path)).toBe(true);
      });
    });

    it('should reject paths outside allowed directories', () => {
      const invalidPaths = [
        '/etc/passwd',
        '/home/user/documents/secret.txt',
        '/var/log/system.log',
        '../../etc/passwd',
        '/tmp/other-directory/file.txt',
      ];

      invalidPaths.forEach(path => {
        expect(pluginSecurity.validatePath(path)).toBe(false);
      });
    });

    it('should handle Windows-style paths', () => {
      const windowsPath = 'C:\\tmp\\rinawarp-plugins\\plugin.js';
      // This should be normalized to forward slashes
      expect(pluginSecurity.validatePath(windowsPath)).toBe(false);

      const normalizedPath = '/tmp/rinawarp-plugins/plugin.js';
      expect(pluginSecurity.validatePath(normalizedPath)).toBe(true);
    });

    it('should handle relative paths', () => {
      const relativePath = '../../../etc/passwd';
      expect(pluginSecurity.validatePath(relativePath)).toBe(false);
    });
  });

  describe('security edge cases', () => {
    it('should handle empty code', async () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        permissions: [],
      };

      const code = '';

      await expect(pluginSecurity.validatePlugin(manifest, code)).resolves.not.toThrow();
    });

    it('should handle code with comments containing dangerous patterns', async () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        permissions: [],
      };

      const code = `
        // This is a comment with eval() but it's safe
        /* Another comment with document.write */
        console.log("safe code");
      `;

      // Note: Current implementation doesn't handle comments, so this will fail
      // This is intentional to err on the side of caution
      await expect(pluginSecurity.validatePlugin(manifest, code)).rejects.toThrow(
        'Potentially dangerous code detected'
      );
    });

    it('should handle manifest with null permissions', async () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        permissions: null,
      };

      const code = 'console.log("hello");';

      await expect(pluginSecurity.validatePlugin(manifest, code)).resolves.not.toThrow();
    });

    it('should handle manifest with undefined permissions', async () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0',
        // permissions is undefined
      };

      const code = 'console.log("hello");';

      await expect(pluginSecurity.validatePlugin(manifest, code)).resolves.not.toThrow();
    });
  });
});
