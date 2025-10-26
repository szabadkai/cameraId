import { CameraInfo, LensInfo } from '../types';
import JSZip from 'jszip';
import { getFileAsBase64 } from '../services/driveService';

const generateCamerasCsv = (cameras: CameraInfo[]): string => {
  const headers = [
    'id', 'brand', 'manufacturerUrl', 'model', 'year', 'serialNumber',
    'cameraType', 'filmFormat', 'notableFeatures', 'notes', 'references',
    'isArchived', 'attachedLensId'
  ];
  const formatHeader = (h: string) => h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  
  const escape = (val: any) => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const rows = cameras.map(camera =>
    headers.map(header => {
      if (header === 'references') {
        return escape((camera.references || []).map(r => `${r.title}: ${r.url}`).join(' | '));
      }
      return escape(camera[header as keyof CameraInfo]);
    }).join(',')
  );

  return [headers.map(formatHeader).join(','), ...rows].join('\r\n');
};

const generateLensesCsv = (lenses: LensInfo[]): string => {
  const headers = [
    'id', 'brand', 'model', 'serialNumber', 'focalLength', 'aperture', 'notes', 'isArchived'
  ];
  const formatHeader = (h: string) => h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  const escape = (val: any) => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const rows = lenses.map(lens =>
    headers.map(header => escape(lens[header as keyof LensInfo])).join(',')
  );

  return [headers.map(formatHeader).join(','), ...rows].join('\r\n');
};


export const exportToCsv = async (cameras: CameraInfo[], lenses: LensInfo[], filename: string) => {
  if (cameras.length === 0 && lenses.length === 0) {
    return;
  }

  const zip = new JSZip();
  
  if (cameras.length > 0) {
    zip.file('cameras.csv', generateCamerasCsv(cameras));
  }
  if (lenses.length > 0) {
    zip.file('lenses.csv', generateLensesCsv(lenses));
  }

  const imagesFolder = zip.folder('images');

  const processImages = (items: (CameraInfo | LensInfo)[], prefix: string) => {
    return items.flatMap((item, itemIndex) => {
      const safeBrand = (item.brand || 'Unknown').replace(/[\s\W]/g, '_');
      const safeModel = (item.model || 'Item').replace(/[\s\W]/g, '_');
      
      return item.images.map(async (fileId, imageIndex) => {
          try {
              const base64Image = await getFileAsBase64(fileId);
              const imageName = `${prefix}_${String(itemIndex + 1).padStart(3, '0')}_${safeBrand}_${safeModel}_${imageIndex + 1}.jpeg`;
              imagesFolder?.file(imageName, base64Image, { base64: true });
          } catch (error) {
              console.error(`Failed to fetch image with ID ${fileId} for export.`, error);
          }
      });
    });
  };

  const cameraImagePromises = processImages(cameras, 'camera');
  const lensImagePromises = processImages(lenses, 'lens');
  
  await Promise.all([...cameraImagePromises, ...lensImagePromises]);

  const zipBlob = await zip.generateAsync({ type: 'blob' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(zipBlob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
