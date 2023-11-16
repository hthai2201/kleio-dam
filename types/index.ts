export interface Asset {
  "@name": string;
  "@path": string;
  "@id": string;
  "@nodeType": string;
  height: number;
  width: number;
  extension: string;
  fileName: string;
  size: number;
  "@nodes": any[]; // You might want to replace 'any' with a more specific type if you have information about the structure of the nodes
}

export interface DownloadResult {
  fileName?: string;
  success: boolean;
  message?: string;
  error?: Error;
}
