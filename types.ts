export interface FileData {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface ConvertResponse {
  text: string;
}