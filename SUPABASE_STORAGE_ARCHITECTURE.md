# Supabase Storage Architecture - ViralFactory

This document outlines the design, implementation, configuration, and workflows for the migration of the ViralFactory storage engine to **Supabase Storage**.

---

## 1. Architectural Blueprint & Core Goals

The ViralFactory architecture relies on high-performance streaming, remote rendering workers, and real-time coordinator communication. To optimize storage cost, throughput, and performance, file storage has been migrated completely from Google Cloud Storage (GCS) and local server-side files to **Supabase Storage**.

### Core Constraints & Accomplishments:
* **Zero Frontend Modification:** The frontend client continues communicating with the server endpoints exactly as it did before. The storage paths (e.g. `/storage/rendered/render_123.mp4`) are preserved entirely.
* **Direct Worker Uploads (Zero-Coordinator Bottleneck):** Big files (rendered videos, thumbnails, and preview clips) are uploaded directly from remote rendering workers to Supabase Storage using secure **Signed Upload URLs**. The Coordinator is never burdened with receiving heavy buffers.
* **On-Demand Secure Downloads:** Storage redirects `/storage/:folder/:filename` are intercepted by the control plane and translated into secure, temporary read-only **Signed Download URLs** on private buckets with customizable expiration times (default: 60 minutes).
* **Automatic Multi-Bucket Support:** Files are segregated cleanly across 4 private buckets:
  - `rendered`: Holds final `.mp4` video files.
  - `previews`: Holds lightweight preview clips.
  - `thumbnails`: Holds generated thumbnails.
  - `assets`: Holds user uploaded templates, static images, and audios.
* **Seamless Local Fallback:** If Supabase configurations are not set (e.g. during local/offline development), the coordinator and workers transparently fallback to `/public/storage` on local disk without interrupting development or raising errors.

---

## 2. Separate Buckets Strategy

To keep files organized and secure, we define the following structure in Supabase:

| Target Folder / Prefix | Target Supabase Bucket | Accessibility / Rule |
| :--- | :--- | :--- |
| `uploads` / `templates` / `assets` | `assets` | Private with Signed URLs |
| Files starting with `thumb_` | `thumbnails` | Private with Signed URLs |
| Files starting with `preview_` | `previews` | Private with Signed URLs |
| General files in `rendered` | `rendered` | Private with Signed URLs |

---

## 3. Environment Configurations

Define these variables in your control plane (or project secrets) to activate Supabase Storage:

```env
# Supabase endpoint URL
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# Supabase Anon Key (for client operations)
VITE_SUPABASE_ANON_KEY="your-anon-key"

# Supabase Service Role Key (Required on server/worker side to bypass Row Level Security/RLS)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Optional: List of allowed upload file extensions for hardening
ALLOWED_UPLOAD_EXTENSIONS=".mp4,.mov,.png,.jpg,.jpeg,.gif,.webp,.json,.mp3,.wav,.aac"
```

---

## 4. Workflows & Sequences

### A. Rendering Output Upload Flow
1. **Coordinator** receives a new render job.
2. **Coordinator** generates three secure **Signed Upload URLs** utilizing `SupabaseStorageService.getUploadSignedUrl()` targeting private buckets (`rendered`, `thumbnails`, `previews`).
3. **Coordinator** dispatches these URLs inside the `start_job` payload to the **Render Worker** via WebSocket.
4. **Render Worker** compiles/renders the video, preview, and thumbnail.
5. **Render Worker** streams the binary files directly to Supabase Storage via `PUT` request targeting the signed upload URLs. No coordinator server load is incurred.
6. **Render Worker** reports job success to the coordinator with `/storage/rendered/render_xxx.mp4` paths.

### B. Secure Asset Download Flow
1. **Frontend / Browser** requests an asset path: `/storage/rendered/render_123.mp4`.
2. **Coordinator** intercepts the request.
3. If Supabase is active, the coordinator generates a secure **Signed Download URL** (valid for 60 minutes) and issues a `302 Redirect`.
4. If Supabase is inactive, the coordinator falls back and streams the local file from disk.

---

## 5. Security Hardening & Traversal Safeguards

The `SupabaseStorageService` includes proactive security defenses:
1. **Path Traversal Protection:** Any occurrences of directory traversal sequences (such as `..`, `/`, `\`, `%20`) in filename inputs trigger an instant error, preventing arbitrary bucket traversal.
2. **Extension Validation:** Only whitelisted media and asset formats configured in `ALLOWED_UPLOAD_EXTENSIONS` can generate signed URLs.
3. **Service Role Authentication:** Backend tasks use the privileged service role key, keeping client-facing anon credentials strictly isolated from backend file system powers.
