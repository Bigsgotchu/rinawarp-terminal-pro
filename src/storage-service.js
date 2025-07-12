import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  _updateMetadata,
} from 'firebase/storage';
import { storage } from './firebase-config.js';
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

  // File Upload Methods
  async uploadFile(file, path = '', onProgress = null) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Create file reference
      const fileName = this.sanitizeFileName(file.name);
      const filePath = path
        ? `${this.basePath}/${userId}/${path}/${fileName}`
        : `${this.basePath}/${userId}/${fileName}`;
      const fileRef = ref(storage, filePath);

      // Add metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
      };

      if (onProgress) {
        // Upload with progress tracking
        const uploadTask = uploadBytesResumable(fileRef, file, metadata);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            snapshot => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress({
                progress,
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                state: snapshot.state,
              });
            },
            error => {
              console.error('Upload error:', error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                  success: true,
                  downloadURL,
                  filePath,
                  fileName,
                  size: file.size,
                  type: file.type,
                });
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      } else {
        // Simple upload without progress
        const snapshot = await uploadBytes(fileRef, file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return {
          success: true,
          downloadURL,
          filePath,
          fileName,
          size: file.size,
          type: file.type,
        };
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadTerminalSession(sessionData, sessionId) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const sessionBlob = new Blob([JSON.stringify(sessionData, null, 2)], {
        type: 'application/json',
      });
      const fileName = `session_${sessionId}_${Date.now()}.json`;
      const filePath = `${this.basePath}/${userId}/sessions/${fileName}`;
      const fileRef = ref(storage, filePath);

      const metadata = {
        contentType: 'application/json',
        customMetadata: {
          sessionId: sessionId,
          type: 'terminal_session',
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
      };

      const snapshot = await uploadBytes(fileRef, sessionBlob, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        downloadURL,
        filePath,
        fileName,
        size: sessionBlob.size,
      };
    } catch (error) {
      console.error('Error uploading session:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadConfigFile(configData, configName) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const configBlob = new Blob([JSON.stringify(configData, null, 2)], {
        type: 'application/json',
      });
      const fileName = `${configName}.json`;
      const filePath = `${this.basePath}/${userId}/configs/${fileName}`;
      const fileRef = ref(storage, filePath);

      const metadata = {
        contentType: 'application/json',
        customMetadata: {
          configName: configName,
          type: 'config_file',
          uploadedAt: new Date().toISOString(),
          userId: userId,
        },
      };

      const snapshot = await uploadBytes(fileRef, configBlob, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        downloadURL,
        filePath,
        fileName,
        size: configBlob.size,
      };
    } catch (error) {
      console.error('Error uploading config:', error);
      return { success: false, error: error.message };
    }
  }

  // File Download Methods
  async downloadFile(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      const downloadURL = await getDownloadURL(fileRef);

      // Fetch the file
      const response = await fetch(downloadURL);
      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();
      const metadata = await getMetadata(fileRef);

      return {
        success: true,
        blob,
        metadata,
        downloadURL,
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      return { success: false, error: error.message };
    }
  }

  async getDownloadURL(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      const downloadURL = await getDownloadURL(fileRef);
      return { success: true, downloadURL };
    } catch (error) {
      console.error('Error getting download URL:', error);
      return { success: false, error: error.message };
    }
  }

  // File Management Methods
  async listUserFiles(folder = '') {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      const folderPath = folder
        ? `${this.basePath}/${userId}/${folder}`
        : `${this.basePath}/${userId}`;
      const folderRef = ref(storage, folderPath);

      const result = await listAll(folderRef);
      const files = [];

      // Get metadata for each file
      for (const item of result.items) {
        try {
          const metadata = await getMetadata(item);
          const downloadURL = await getDownloadURL(item);

          files.push({
            name: item.name,
            fullPath: item.fullPath,
            downloadURL,
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated,
            updated: metadata.updated,
            customMetadata: metadata.customMetadata || {},
          });
        } catch (error) {
          console.warn('Could not get metadata for file:', item.name, error);
        }
      }

      // Get subfolders
      const folders = result.prefixes.map(prefix => ({
        name: prefix.name,
        fullPath: prefix.fullPath,
      }));

      return { success: true, files, folders };
    } catch (error) {
      console.error('Error listing files:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteFile(filePath) {
    try {
      const userId = authService.getUserId();
      if (!userId) throw new Error('User not authenticated');

      // Verify the file belongs to the user
      if (!filePath.includes(`${this.basePath}/${userId}`)) {
        throw new Error('Unauthorized: File does not belong to user');
      }

      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);

      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { success: false, error: error.message };
    }
  }

  async getFileMetadata(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      const metadata = await getMetadata(fileRef);

      return { success: true, metadata };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return { success: false, error: error.message };
    }
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
