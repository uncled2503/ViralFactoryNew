import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export class SupabaseStorageService {
  private static supabase: SupabaseClient | null = null;
  private static isInitialized = false;

  /**
   * Initializes the Supabase client for backend/worker storage administrative operations
   */
  static init() {
    if (this.isInitialized) return;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    // For admin operations (Signed URLs, bucket creation), we require the SERVICE_ROLE_KEY to bypass RLS policies and sign URLs
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your-project-id') || supabaseServiceKey.trim() === '' || supabaseServiceKey.includes('your-service-role-key')) {
      console.log('[SupabaseStorageService] SUPABASE_SERVICE_ROLE_KEY is not configured or is empty. Signed URL storage features are disabled. Using local server fallback storage.');
      this.isInitialized = true;
      this.supabase = null;
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      this.isInitialized = true;
      console.log(`[SupabaseStorageService] Supabase Storage successfully initialized with Service Role Key.`);

      // Attempt to programmatically ensure buckets exist in the background
      this.ensureBucketsExist().catch(err => {
        console.warn('[SupabaseStorageService] Non-blocking bucket verification completed/failed:', err.message);
      });
    } catch (err: any) {
      console.error('[SupabaseStorageService] Failed to initialize Supabase client:', err.message);
      this.supabase = null;
      this.isInitialized = true;
    }
  }

  /**
   * Checks if Supabase Storage is fully configured and operational
   */
  static isConfigured(): boolean {
    this.init();
    return this.supabase !== null;
  }

  /**
   * Programmatically ensures required separate buckets exist: rendered, previews, thumbnails, assets
   */
  private static async ensureBucketsExist() {
    if (!this.supabase) return;
    const requiredBuckets = ['rendered', 'previews', 'thumbnails', 'assets'];
    
    for (const bucket of requiredBuckets) {
      try {
        const { data, error } = await this.supabase.storage.getBucket(bucket);
        if (error) {
          const errMsg = (error.message || '').toLowerCase();
          if (errMsg.includes('signature') || errMsg.includes('jwt') || errMsg.includes('verification failed') || errMsg.includes('invalid token') || errMsg.includes('fetch failed') || errMsg.includes('failed to fetch')) {
            console.log(`[SupabaseStorageService] Local server storage fallback active.`);
            this.supabase = null;
            return;
          }
        }
        if (error || !data) {
          console.log(`[SupabaseStorageService] Bucket "${bucket}" not found. Creating bucket...`);
          const { error: createError } = await this.supabase.storage.createBucket(bucket, {
            public: false, // Default to private for secure signed URL operations
          });
          if (createError) {
            const createErrMsg = (createError.message || '').toLowerCase();
            if (createErrMsg.includes('signature') || createErrMsg.includes('jwt') || createErrMsg.includes('verification failed') || createErrMsg.includes('invalid token') || createErrMsg.includes('fetch failed') || createErrMsg.includes('failed to fetch')) {
              console.log(`[SupabaseStorageService] Local server storage fallback active.`);
              this.supabase = null;
              return;
            }
            console.log(`[SupabaseStorageService] Bucket "${bucket}" creation info:`, createError.message);
          } else {
            console.log(`[SupabaseStorageService] Bucket "${bucket}" created successfully (private).`);
          }
        }
      } catch (err: any) {
        const errMsg = (err.message || '').toLowerCase();
        if (errMsg.includes('signature') || errMsg.includes('jwt') || errMsg.includes('verification failed') || errMsg.includes('invalid token') || errMsg.includes('fetch failed') || errMsg.includes('failed to fetch')) {
          console.log(`[SupabaseStorageService] Local server storage fallback active.`);
          this.supabase = null;
          return;
        }
        console.log(`[SupabaseStorageService] Bucket "${bucket}" verification skipped:`, err.message);
      }
    }
  }

  /**
   * Resolves folder and file names to the corresponding separate bucket and path
   * Supports:
   *  - rendered: bucket 'rendered', or 'thumbnails' if starts with thumb_, or 'previews' if starts with preview_
   *  - previews / preview: bucket 'previews'
   *  - thumbnails / thumbnail: bucket 'thumbnails'
   *  - uploads / templates / assets: bucket 'assets'
   */
  static getBucketAndPath(folder: string, fileName: string): { bucket: string; path: string } {
    const sanitizedName = this.sanitizePath(fileName);
    
    if (folder === 'rendered') {
      if (sanitizedName.startsWith('thumb_')) {
        return { bucket: 'thumbnails', path: sanitizedName };
      } else if (sanitizedName.startsWith('preview_')) {
        return { bucket: 'previews', path: sanitizedName };
      } else {
        return { bucket: 'rendered', path: sanitizedName };
      }
    } else if (folder === 'previews' || folder === 'preview') {
      return { bucket: 'previews', path: sanitizedName };
    } else if (folder === 'thumbnails' || folder === 'thumbnail') {
      return { bucket: 'thumbnails', path: sanitizedName };
    } else if (folder === 'uploads' || folder === 'templates' || folder === 'assets') {
      return { bucket: 'assets', path: sanitizedName };
    }
    
    return { bucket: folder || 'assets', path: sanitizedName };
  }

  /**
   * Cleans path traversal patterns and sanitizes the filename to prevent security exploits
   */
  static sanitizePath(fileName: string): string {
    if (/[\/\\]|%\d[a-fA-F0-9]|\.\./.test(fileName) || fileName.includes('..')) {
      throw new Error('Path traversal attempt detected in filename.');
    }
    // Remove characters that might break shells or URLs
    return fileName.replace(/[^a-zA-Z0-9_\.-]/g, '');
  }

  /**
   * Validates if file meets extension constraints (Security Hardening)
   */
  static isValidExtension(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    const allowedExtsEnv = process.env.ALLOWED_UPLOAD_EXTENSIONS || '.mp4,.mov,.png,.jpg,.jpeg,.gif,.webp,.json,.mp3,.wav,.aac';
    const allowedExtensions = allowedExtsEnv.split(',').map(e => e.trim().toLowerCase());
    return allowedExtensions.includes(ext) && !!ext;
  }

  /**
   * Generates a secure, temporary Signed URL for uploading files directly to Supabase Storage
   */
  static async getUploadSignedUrl(folder: string, fileName: string, contentType: string): Promise<string> {
    this.init();

    if (!this.isValidExtension(fileName)) {
      throw new Error(`File extension of "${fileName}" is not allowed.`);
    }

    const { bucket, path: bucketPath } = this.getBucketAndPath(folder, fileName);

    if (!this.isConfigured()) {
      // Development Fallback: Point back to standard control plane upload endpoint
      const protocol = process.env.APP_URL ? '' : 'http://localhost:3000';
      const appUrl = (process.env.APP_URL || protocol).replace(/\/+$/, '');
      return `${appUrl}/api/render/upload/${folder}/${fileName}`;
    }

    try {
      // Request a write-only temporary signed upload URL from Supabase
      const { data, error } = await this.supabase!.storage.from(bucket).createSignedUploadUrl(bucketPath);
      
      if (error || !data || !data.signedUrl) {
        throw new Error(error?.message || 'Signed URL generation returned empty.');
      }

      console.log(`[SupabaseStorageService] Generated Signed Upload URL for bucket "${bucket}" path "${bucketPath}"`);
      return data.signedUrl;
    } catch (err: any) {
      const isSignatureError = err.message && (
        err.message.toLowerCase().includes('signature') ||
        err.message.toLowerCase().includes('verification') ||
        err.message.toLowerCase().includes('jwt') ||
        err.message.toLowerCase().includes('invalid token')
      );
      if (isSignatureError) {
        console.warn(`[SupabaseStorageService] Warning: Signature verification or credential error (${err.message}) during upload URL generation. Disabling Supabase Storage features.`);
        this.supabase = null;
      } else {
        console.error(`[SupabaseStorageService] Error generating Signed Upload URL for ${bucket}/${bucketPath}:`, err.message);
      }
      // Fallback
      const protocol = process.env.APP_URL ? '' : 'http://localhost:3000';
      const appUrl = (process.env.APP_URL || protocol).replace(/\/+$/, '');
      return `${appUrl}/api/render/upload/${folder}/${fileName}`;
    }
  }

  /**
   * Generates a temporary Signed URL for downloading/viewing a file from Supabase Storage
   */
  static async getDownloadSignedUrl(folder: string, fileName: string, expiresInSeconds = 3600): Promise<string> {
    this.init();

    const { bucket, path: bucketPath } = this.getBucketAndPath(folder, fileName);

    if (!this.isConfigured()) {
      // Fallback relative local URL
      return `/storage/${folder}/${fileName}`;
    }

    try {
      const { data, error } = await this.supabase!.storage.from(bucket).createSignedUrl(bucketPath, expiresInSeconds);
      
      if (error || !data || !data.signedUrl) {
        throw new Error(error?.message || 'Signed URL generation returned empty.');
      }

      return data.signedUrl;
    } catch (err: any) {
      const isNotFound = err.message && (
        err.message.toLowerCase().includes('not found') || 
        err.message.toLowerCase().includes('not_found') ||
        err.message.toLowerCase().includes('404')
      );
      const isSignatureError = err.message && (
        err.message.toLowerCase().includes('signature') ||
        err.message.toLowerCase().includes('verification') ||
        err.message.toLowerCase().includes('jwt') ||
        err.message.toLowerCase().includes('invalid token')
      );

      if (isNotFound) {
        console.log(`[SupabaseStorageService] Info: Object not found in Supabase Storage. Falling back to local file path for ${bucket}/${bucketPath}`);
      } else if (isSignatureError) {
        console.warn(`[SupabaseStorageService] Warning: Signature verification or credential error (${err.message}). Disabling Supabase Storage features.`);
        this.supabase = null;
      } else {
        console.error(`[SupabaseStorageService] Error generating Signed Download URL for ${bucket}/${bucketPath}:`, err.message);
      }
      return `/storage/${folder}/${fileName}`;
    }
  }

  /**
   * Resolves a URL or relative path into a Supabase Signed Download URL if configured
   */
  static async resolveUrlToSigned(url: string): Promise<string> {
    if (!url || typeof url !== 'string') return url;

    const storageMatch = url.match(/^\/storage\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_\.-]+)$/);
    if (storageMatch) {
      const [, folder, fileName] = storageMatch;
      return this.getDownloadSignedUrl(folder, fileName);
    }

    return url;
  }

  /**
   * Returns a public URL for a file in a public bucket
   */
  static getPublicUrl(folder: string, fileName: string): string {
    this.init();
    const { bucket, path: bucketPath } = this.getBucketAndPath(folder, fileName);

    if (!this.isConfigured()) {
      return `/storage/${folder}/${fileName}`;
    }

    const { data } = this.supabase!.storage.from(bucket).getPublicUrl(bucketPath);
    return data.publicUrl || `/storage/${folder}/${fileName}`;
  }

  /**
   * Checks if a file exists inside the Supabase Storage bucket
   */
  static async fileExists(folder: string, fileName: string): Promise<boolean> {
    this.init();
    if (!this.isConfigured()) return false;

    const { bucket, path: bucketPath } = this.getBucketAndPath(folder, fileName);

    try {
      // List the files in the bucket and check if the file is present
      const { data, error } = await this.supabase!.storage.from(bucket).list('', {
        search: bucketPath
      });

      if (error || !data) return false;
      return data.some(file => file.name === bucketPath);
    } catch (err: any) {
      console.error(`[SupabaseStorageService] Error checking file existence for ${bucket}/${bucketPath}:`, err.message);
      return false;
    }
  }

  /**
   * Programmatically deletes a file from Supabase Storage
   */
  static async deleteFile(folder: string, fileName: string): Promise<boolean> {
    this.init();
    if (!this.isConfigured()) return false;

    const { bucket, path: bucketPath } = this.getBucketAndPath(folder, fileName);

    try {
      const { data, error } = await this.supabase!.storage.from(bucket).remove([bucketPath]);
      if (error) {
        console.error(`[SupabaseStorageService] Delete failed for ${bucket}/${bucketPath}:`, error.message);
        return false;
      }
      console.log(`[SupabaseStorageService] Successfully deleted ${bucket}/${bucketPath}`);
      return true;
    } catch (err: any) {
      console.error(`[SupabaseStorageService] Error deleting file ${bucket}/${bucketPath}:`, err.message);
      return false;
    }
  }

  /**
   * Uploads a file buffer directly to Supabase Storage (used on server-side actions)
   */
  static async uploadFile(folder: string, fileName: string, fileBuffer: Buffer, contentType: string): Promise<boolean> {
    this.init();
    if (!this.isConfigured()) return false;

    const { bucket, path: bucketPath } = this.getBucketAndPath(folder, fileName);

    try {
      const { data, error } = await this.supabase!.storage.from(bucket).upload(bucketPath, fileBuffer, {
        contentType,
        upsert: true
      });

      if (error) {
        console.error(`[SupabaseStorageService] Direct upload failed for ${bucket}/${bucketPath}:`, error.message);
        return false;
      }

      console.log(`[SupabaseStorageService] Direct uploaded file successfully to ${bucket}/${bucketPath}`);
      return true;
    } catch (err: any) {
      console.error(`[SupabaseStorageService] Error direct uploading file to ${bucket}/${bucketPath}:`, err.message);
      return false;
    }
  }
}
