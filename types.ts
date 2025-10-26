export interface CameraInfo {
  images: string[]; // array of base64 encoded images
  brand: string;
  manufacturerUrl?: string;
  model: string;
  year: string;
  serialNumber?: string;
  cameraType: string;
  filmFormat: string;
  notableFeatures: string;
  notes?: string;
  references?: {
    title: string;
    url: string;
  }[];
}