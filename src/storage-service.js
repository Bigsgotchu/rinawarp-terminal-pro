/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 7 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Storage Service (Non-Firebase)
 * Local storage-based file service without Firebase dependencies
 */

import { authService } from './auth-service.js';

class StorageService {
  constructor() {
    this.basePath = 'user-files';
    this.allowedTypes = {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      documents: [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      archives: ['application/zip', 'application/x-rar-compressed', 'application/x-tar'],
      scripts: ['text/x-sh', 'application/x-bat', 'text/x-python', 'application/javascript'],
      configs: ['application/json', 'text/yaml', 'text/xml'],
    };
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
  }

  // Helper methods for localStorage-based file storage
  _getStorageKey(userId, path = '') {
    return `${this.basePath}_${userId}_${path}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  _getFileList(userId) {
    try {
      const key = `${this.basePath}_files_${userId}`;
      const fileList = localStorage.getItem(key);
      return fileList ? JSON.parse(fileList) : [];
    } catch (error) {
      console.error('Error getting file list:', error);
      return [];
    }
  }

  _saveFileList(userId, fileList) {
    try {
      const key = `${this.basePath}_files_${userId}`;
      localStorage.setItem(key, JSON.stringify(fileList));
      return true;
    } catch (error) {
      console.error('Error saving file list:', error);
      return false;
    }
  }

  // File Upload Methods (localStorage-based)
  async uploadFile(file, path = '', onProgress = null) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error(new Error('User not authenticated'));

      console.log('Storage: File upload called (localStorage-based, Firebase removed)');

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(new Error(validation.error));
      }

      // Simulate progress if callback provided
      if (onProgress) {
        onProgress({
          progress: 25,
          bytesTransferred: file.size * 0.25,
          totalBytes: file.size,
          state: 'running',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        onProgress({
          progress: 50,
          bytesTransferred: file.size * 0.5,
          totalBytes: file.size,
          state: 'running',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        onProgress({
          progress: 75,
          bytesTransferred: file.size * 0.75,
          totalBytes: file.size,
          state: 'running',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        onProgress({
          progress: 100,
          bytesTransferred: file.size,
          totalBytes: file.size,
          state: 'success',
        });
      }

      const fileName = this.sanitizeFileName(file.name);
      const filePath = path ? `${path}/${fileName}` : fileName;
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Convert file to base64 for storage
      const fileData = await this._fileToBase64(file);

      const fileRecord = {
        id: fileId,
        name: fileName,
        originalName: file.name,
        fullPath: filePath,
        size: file.size,
        contentType: file.type,
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
        data: fileData, // Base64 encoded file data
      };

      // Save file data
      const storageKey = this._getStorageKey(userId, fileId);
      localStorage.setItem(storageKey, JSON.stringify(fileRecord));

      // Update file list
      const fileList = this._getFileList(userId);
      fileList.push({
        id: fileId,
        name: fileName,
        fullPath: filePath,
        size: file.size,
        contentType: file.type,
        timeCreated: fileRecord.timeCreated,
        updated: fileRecord.updated,
        customMetadata: fileRecord.customMetadata,
      });
      this._saveFileList(userId, fileList);

      return {
        success: true,
        downloadURL: `localStorage://${storageKey}`,
        filePath,
        fileName,
        size: file.size,
        type: file.type,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error.message };
    }
  }

  async _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  async uploadTerminalSession(sessionData, sessionId) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error(new Error('User not authenticated'));

      console.log('Storage: Session upload called (localStorage-based, Firebase removed)');

      const sessionBlob = JSON.stringify(sessionData, null, 2);
      const fileName = `session_${sessionId}_${Date.now()}.json`;
      const filePath = `sessions/${fileName}`;
      const fileId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fileRecord = {
        id: fileId,
        name: fileName,
        fullPath: filePath,
        size: sessionBlob.length,
        contentType: 'application/json',
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
        customMetadata: {
          sessionId: sessionId,
          type: 'terminal_session',
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
        data: btoa(sessionBlob), // Base64 encoded
      };

      // Save file data
      const storageKey = this._getStorageKey(userId, fileId);
      localStorage.setItem(storageKey, JSON.stringify(fileRecord));

      // Update file list
      const fileList = this._getFileList(userId);
      fileList.push({
        id: fileId,
        name: fileName,
        fullPath: filePath,
        size: sessionBlob.length,
        contentType: 'application/json',
        timeCreated: fileRecord.timeCreated,
        updated: fileRecord.updated,
        customMetadata: fileRecord.customMetadata,
      });
      this._saveFileList(userId, fileList);

      return {
        success: true,
        downloadURL: `localStorage://${storageKey}`,
        filePath,
        fileName,
        size: sessionBlob.length,
      };
    } catch (error) {
      console.error('Error uploading session:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadConfigFile(configData, configName) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error(new Error('User not authenticated'));

      console.log('Storage: Config upload called (localStorage-based, Firebase removed)');

      const configBlob = JSON.stringify(configData, null, 2);
      const fileName = `${configName}.json`;
      const filePath = `configs/${fileName}`;
      const fileId = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fileRecord = {
        id: fileId,
        name: fileName,
        fullPath: filePath,
        size: configBlob.length,
        contentType: 'application/json',
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
        customMetadata: {
          configName: configName,
          type: 'config_file',
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
        data: btoa(configBlob), // Base64 encoded
      };

      // Save file data
      const storageKey = this._getStorageKey(userId, fileId);
      localStorage.setItem(storageKey, JSON.stringify(fileRecord));

      // Update file list
      const fileList = this._getFileList(userId);
      fileList.push({
        id: fileId,
        name: fileName,
        fullPath: filePath,
        size: configBlob.length,
        contentType: 'application/json',
        timeCreated: fileRecord.timeCreated,
        updated: fileRecord.updated,
        customMetadata: fileRecord.customMetadata,
      });
      this._saveFileList(userId, fileList);

      return {
        success: true,
        downloadURL: `localStorage://${storageKey}`,
        filePath,
        fileName,
        size: configBlob.length,
      };
    } catch (error) {
      console.error('Error uploading config:', error);
      return { success: false, error: error.message };
    }
  }

  // File Management Methods
  async listUserFiles(folder = '') {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error(new Error('User not authenticated'));

      const fileList = this._getFileList(userId);
      let filteredFiles = fileList;

      if (folder) {
        filteredFiles = fileList.filter(file => file.fullPath.startsWith(folder));
      }

      // Create mock folders
      const folders = [
        ...new Set(
          filteredFiles.map(file => file.fullPath.split('/')[0]).filter(folder => folder !== '')
        ),
      ].map(folderName => ({
        name: folderName,
        fullPath: folderName,
      }));

      console.log('Storage: Listed user files (localStorage)', filteredFiles.length);
      return { success: true, files: filteredFiles, folders };
    } catch (error) {
      console.error('Error listing files:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteFile(filePath) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error(new Error('User not authenticated'));

      const fileList = this._getFileList(userId);
      const fileIndex = fileList.findIndex(file => file.fullPath === filePath);

      if (fileIndex >= 0) {
        const file = fileList[fileIndex];
        const storageKey = this._getStorageKey(userId, file.id);

        // Remove file data
        localStorage.removeItem(storageKey);

        // Remove from file list
        fileList.splice(fileIndex, 1);
        this._saveFileList(userId, fileList);

        console.log('Storage: File deleted (localStorage)');
        return { success: true };
      }

      return { success: false, error: 'File not found' };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { success: false, error: error.message };
    }
  }

  async downloadFile(filePath) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error(new Error('User not authenticated'));

      const fileList = this._getFileList(userId);
      const file = fileList.find(f => f.fullPath === filePath);

      if (!file) {
        return { success: false, error: 'File not found' };
      }

      const storageKey = this._getStorageKey(userId, file.id);
      const fileDataStr = localStorage.getItem(storageKey);

      if (!fileDataStr) {
        return { success: false, error: 'File data not found' };
      }

      const fileRecord = JSON.parse(fileDataStr);

      // Convert base64 back to blob
      const binaryString = atob(fileRecord.data.split(',')[1] || fileRecord.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: fileRecord.contentType });

      return {
        success: true,
        blob,
        metadata: {
          size: fileRecord.size,
          contentType: fileRecord.contentType,
          timeCreated: fileRecord.timeCreated,
          updated: fileRecord.updated,
          customMetadata: fileRecord.customMetadata,
        },
        downloadURL: `localStorage://${storageKey}`,
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      return { success: false, error: error.message };
    }
  }

  async getDownloadURL(filePath) {
    const userId = authService.getUserId();
    if (!userId) return { success: false, error: 'User not authenticated' };

    const fileList = this._getFileList(userId);
    const file = fileList.find(f => f.fullPath === filePath);

    if (file) {
      const storageKey = this._getStorageKey(userId, file.id);
      return { success: true, downloadURL: `localStorage://${storageKey}` };
    }

    return { success: false, error: 'File not found' };
  }

  // Utility Methods
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > this.maxFileSize) {
      return { valid: false, error: `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit` };
    }

    // Check if file type is allowed
    const allAllowedTypes = Object.values(this.allowedTypes).flat();
    if (!allAllowedTypes.includes(file.type) && file.type !== '') {
      return { valid: false, error: 'File type not allowed' };
    }

    return { valid: true };
  }

  sanitizeFileName(fileName) {
    // Remove special characters and spaces
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_{2,}/g, '_');
  }

  getFileCategory(fileType) {
    for (const [category, types] of Object.entries(this.allowedTypes)) {
      if (types.includes(fileType)) {
        return category;
      }
    }
    return 'other';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const storageService = new StorageService();
