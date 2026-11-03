/**
 * PUTs a blob to a presigned URL. Uses XMLHttpRequest because fetch() has no
 * upload progress events.
 */
export function putWithProgress(params: {
  url: string;
  body: Blob;
  contentType: string;
  signal: AbortSignal;
  onProgress: (loadedBytes: number) => void;
}): Promise<void> {
  const { url, body, contentType, signal, onProgress } = params;
  return new Promise((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException("Aborted", "AbortError"));

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(body.size);
        resolve();
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}
