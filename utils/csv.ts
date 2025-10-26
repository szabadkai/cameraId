import { CameraInfo } from '../types';

export const exportToCsv = (cameras: CameraInfo[], filename: string) => {
  if (!cameras || cameras.length === 0) {
    return;
  }

  // Define headers in the desired order
  const headers: (keyof Omit<CameraInfo, 'images'> | 'references')[] = [
    'brand',
    'manufacturerUrl',
    'model',
    'year',
    'serialNumber',
    'cameraType',
    'filmFormat',
    'notableFeatures',
    'notes',
    'references'
  ];
  
  // Function to format header titles
  const formatHeader = (header: string) =>
    header.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

  // Helper to safely stringify and escape CSV values
  const escapeValue = (value: any): string => {
    const stringValue = value === null || value === undefined ? '' : String(value);
    // If the value contains a comma, double quote, or newline, wrap it in double quotes.
    // Also, escape any existing double quotes by doubling them up.
    if (/[",\n\r]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csvRows = [
    headers.map(formatHeader).join(','), // Header row
    ...cameras.map((camera) =>
      headers.map((header) => {
        if (header === 'references') {
          const refs = camera.references || [];
          const formattedRefs = refs.map(ref => `${ref.title}: ${ref.url}`).join(' | ');
          return escapeValue(formattedRefs);
        }
        return escapeValue(camera[header as keyof Omit<CameraInfo, 'images'>]);
      }).join(',')
    ),
  ];

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};