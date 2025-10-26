export interface LensInfo {
  id: string;
  images: string[]; // array of Google Drive file IDs
  brand?: string;
  model?: string;
  serialNumber?: string;
  focalLength?: string; // e.g., "50mm", "24-70mm"
  aperture?: string;    // e.g., "f/1.8", "f/2.8-4"
  notes?: string;
  isArchived?: boolean;
}

export interface CameraInfo {
  id: string;
  images: string[]; // array of Google Drive file IDs
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
  isArchived?: boolean;
  attachedLensId?: string;
}

export interface Collection {
  cameras: CameraInfo[];
  lenses: LensInfo[];
}
