// Firebase Storage Service for file uploads
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  UploadTaskSnapshot
} from 'firebase/storage';
import { storage } from './config';
import { AuthService } from './auth';
import { FileUploadResult } from '../types/firebase.types';

export class StorageService {
  private static getUserId(): string {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  /**
   * Upload FIT file to Firebase Storage
   */
  static async uploadFitFile(
    file: File,
    activityId: string,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    try {
      const userId = this.getUserId();
      const fileName = `${activityId}.fit`;
      const filePath = `fitFiles/${userId}/raw/${fileName}`;
      const fileRef = ref(storage, filePath);

      // Upload metadata
      const metadata = {
        contentType: 'application/octet-stream',
        customMetadata: {
          originalName: file.name,
          activityId,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      };

      if (onProgress) {
        // Use resumable upload with progress tracking
        const uploadTask = uploadBytesResumable(fileRef, file, metadata);
        
        return new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot: UploadTaskSnapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(progress);
            },
            (error) => {
              console.error('Upload error:', error);
              reject({ success: false, error: error.message });
            },
            async () => {
              try {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                  success: true,
                  downloadUrl,
                  path: filePath
                });
              } catch (error) {
                reject({ success: false, error: (error as Error).message });
              }
            }
          );
        });
      } else {
        // Simple upload without progress
        const snapshot = await uploadBytes(fileRef, file, metadata);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        
        return {
          success: true,
          downloadUrl,
          path: filePath
        };
      }
    } catch (error) {
      console.error('Error uploading FIT file:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Upload processed JSON data
   */
  static async uploadProcessedData(
    jsonData: object,
    activityId: string
  ): Promise<FileUploadResult> {
    try {
      const userId = this.getUserId();
      const fileName = `${activityId}.json`;
      const filePath = `fitFiles/${userId}/processed/${fileName}`;
      const fileRef = ref(storage, filePath);

      const jsonString = JSON.stringify(jsonData, null, 2);
      const jsonBlob = new Blob([jsonString], { type: 'application/json' });

      const metadata = {
        contentType: 'application/json',
        customMetadata: {
          activityId,
          processedBy: userId,
          processedAt: new Date().toISOString()
        }
      };

      const snapshot = await uploadBytes(fileRef, jsonBlob, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        downloadUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error uploading processed data:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Upload user profile avatar
   */
  static async uploadAvatar(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    try {
      const userId = this.getUserId();
      const fileExtension = file.name.split('.').pop();
      const fileName = `avatar.${fileExtension}`;
      const filePath = `userProfiles/${userId}/${fileName}`;
      const fileRef = ref(storage, filePath);

      const metadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      };

      if (onProgress) {
        const uploadTask = uploadBytesResumable(fileRef, file, metadata);
        
        return new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot: UploadTaskSnapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(progress);
            },
            (error) => {
              console.error('Avatar upload error:', error);
              reject({ success: false, error: error.message });
            },
            async () => {
              try {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                  success: true,
                  downloadUrl,
                  path: filePath
                });
              } catch (error) {
                reject({ success: false, error: (error as Error).message });
              }
            }
          );
        });
      } else {
        const snapshot = await uploadBytes(fileRef, file, metadata);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        
        return {
          success: true,
          downloadUrl,
          path: filePath
        };
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Export data as JSON file
   */
  static async uploadDataExport(
    data: object,
    exportType: string
  ): Promise<FileUploadResult> {
    try {
      const userId = this.getUserId();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${exportType}-export-${timestamp}.json`;
      const filePath = `fitFiles/${userId}/exports/${fileName}`;
      const fileRef = ref(storage, filePath);

      const jsonString = JSON.stringify(data, null, 2);
      const jsonBlob = new Blob([jsonString], { type: 'application/json' });

      const metadata = {
        contentType: 'application/json',
        customMetadata: {
          exportType,
          exportedBy: userId,
          exportedAt: new Date().toISOString()
        }
      };

      const snapshot = await uploadBytes(fileRef, jsonBlob, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        downloadUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error uploading data export:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get download URL for a file
   */
  static async getDownloadUrl(path: string): Promise<string | null> {
    try {
      const fileRef = ref(storage, path);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  }

  /**
   * Delete a file
   */
  static async deleteFile(path: string): Promise<boolean> {
    try {
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * List user's FIT files
   */
  static async listUserFitFiles(): Promise<Array<{
    name: string;
    path: string;
    size: number;
    timeCreated: string;
    downloadUrl: string;
  }>> {
    try {
      const userId = this.getUserId();
      const listRef = ref(storage, `fitFiles/${userId}/raw`);
      const result = await listAll(listRef);

      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          const metadata = await getMetadata(itemRef);
          const downloadUrl = await getDownloadURL(itemRef);
          
          return {
            name: itemRef.name,
            path: itemRef.fullPath,
            size: metadata.size,
            timeCreated: metadata.timeCreated,
            downloadUrl
          };
        })
      );

      return files.sort((a, b) => 
        new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime()
      );
    } catch (error) {
      console.error('Error listing FIT files:', error);
      return [];
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    fitFiles: number;
    processedFiles: number;
    exports: number;
  }> {
    try {
      const userId = this.getUserId();
      const [rawFiles, processedFiles, exportFiles] = await Promise.all([
        listAll(ref(storage, `fitFiles/${userId}/raw`)),
        listAll(ref(storage, `fitFiles/${userId}/processed`)),
        listAll(ref(storage, `fitFiles/${userId}/exports`))
      ]);

      let totalSize = 0;
      const allFiles = [...rawFiles.items, ...processedFiles.items, ...exportFiles.items];
      
      for (const file of allFiles) {
        try {
          const metadata = await getMetadata(file);
          totalSize += metadata.size;
        } catch (error) {
          // Skip files that can't be accessed
          console.warn(`Could not get metadata for ${file.fullPath}`);
        }
      }

      return {
        totalFiles: allFiles.length,
        totalSize,
        fitFiles: rawFiles.items.length,
        processedFiles: processedFiles.items.length,
        exports: exportFiles.items.length
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        fitFiles: 0,
        processedFiles: 0,
        exports: 0
      };
    }
  }

  /**
   * Clean up old files (older than specified days)
   */
  static async cleanupOldFiles(daysOld: number = 90): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    try {
      const userId = this.getUserId();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const [rawFiles, processedFiles, exportFiles] = await Promise.all([
        listAll(ref(storage, `fitFiles/${userId}/raw`)),
        listAll(ref(storage, `fitFiles/${userId}/processed`)),
        listAll(ref(storage, `fitFiles/${userId}/exports`))
      ]);

      const allFiles = [...rawFiles.items, ...processedFiles.items, ...exportFiles.items];
      let deletedCount = 0;
      const errors: string[] = [];

      for (const file of allFiles) {
        try {
          const metadata = await getMetadata(file);
          const fileDate = new Date(metadata.timeCreated);
          
          if (fileDate < cutoffDate) {
            await deleteObject(file);
            deletedCount++;
          }
        } catch (error) {
          errors.push(`Failed to process ${file.fullPath}: ${(error as Error).message}`);
        }
      }

      return { deletedCount, errors };
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return { deletedCount: 0, errors: [(error as Error).message] };
    }
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File, allowedTypes: string[], maxSizeMB: number): {
    isValid: boolean;
    error?: string;
  } {
    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `File too large. Maximum size: ${maxSizeMB}MB`
      };
    }

    return { isValid: true };
  }
}