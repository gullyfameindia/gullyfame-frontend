import type { CameraClip } from '../types/camera.types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.gullyfame.com/v1/api';

export interface VideoMetadata {
  title: string;
  clips: number;
  duration?: number;
  width?: number;
  height?: number;
}

export interface UploadResult {
  success: boolean;
  videoId?: string;
  url?: string;
  message?: string;
}

/**
 * Uploads an exported video file to the backend.
 * Uses XMLHttpRequest for progress tracking (fetch does not support upload progress in RN).
 */
export async function uploadVideo(
  localUri: string,
  metadata: VideoMetadata,
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    // Append video file
    const filename = localUri.split('/').pop() ?? `video_${Date.now()}.mp4`;
    formData.append('video', {
      uri: localUri,
      type: 'video/mp4',
      name: filename,
    } as any);

    // Append metadata fields
    formData.append('title', metadata.title);
    formData.append('clips', String(metadata.clips));
    if (metadata.duration !== undefined) formData.append('duration', String(metadata.duration));
    if (metadata.width !== undefined) formData.append('width', String(metadata.width));
    if (metadata.height !== undefined) formData.append('height', String(metadata.height));

    // Track upload progress
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded / event.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as UploadResult;
          // Validate backend success field: if backend explicitly returns success: false, reject
          if (response.success === false) {
            reject(new Error(`Backend upload failed: ${response.message || 'Unknown error'}`));
          } else {
            // Backend returned success or did not include success field; treat as success
            resolve({ ...response, success: true });
          }
        } catch (parseError) {
          // If JSON parsing fails, still consider it success (HTTP 2xx) and log warning
          console.warn('videoApiService: Failed to parse upload response JSON:', parseError);
          resolve({ success: true, message: 'Upload successful' });
        }
      } else {
        // HTTP error: reject with status and response body
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during video upload'));
    xhr.ontimeout = () => reject(new Error('Video upload timed out'));
    xhr.timeout = 120000; // 2 minutes timeout

    xhr.open('POST', `${API_BASE}/videos/upload`);
    xhr.send(formData);
  });
}

/**
 * Fetches video metadata from the backend by video ID.
 */
export async function getVideoMetadata(videoId: string): Promise<UploadResult & { metadata?: VideoMetadata }> {
  const response = await fetch(`${API_BASE}/videos/${videoId}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch video metadata: ${response.status}`);
  }
  return response.json();
}
