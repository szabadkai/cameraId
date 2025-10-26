import React, { useState, useEffect } from 'react';
import { CameraInfo, LensInfo } from '../types';
import { EditIcon, TrashIcon, ArchiveIcon, UnarchiveIcon } from './Icons';
import { formatUrl } from '../utils/url';
import * as driveService from '../services/driveService';

interface CameraCardProps {
  camera: CameraInfo;
  lenses: LensInfo[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleArchive: () => void;
}

const ImageLoader: React.FC<{ fileId: string }> = ({ fileId }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadImage = async () => {
            try {
                const url = await driveService.getImageBlobUrl(fileId);
                if (isMounted) {
                    setImageUrl(url);
                }
            } catch (err) {
                console.error("Failed to load image from drive", err);
                if (isMounted) {
                    setError(true);
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [fileId]);

    if (error) {
        return <div className="w-full h-48 bg-gray-800 flex items-center justify-center text-red-400 text-xs">Image failed to load</div>;
    }

    if (!imageUrl) {
        return <div className="w-full h-48 bg-gray-800 animate-pulse"></div>;
    }

    return <img src={imageUrl} alt="Camera" className="w-full h-48 object-cover" />;
};

const CameraCard: React.FC<CameraCardProps> = ({ camera, lenses, onEdit, onDelete, onToggleArchive }) => {
  const attachedLens = camera.attachedLensId ? lenses.find(l => l.id === camera.attachedLensId) : null;

  return (
    <div className="bg-brand-dark rounded-lg overflow-hidden shadow-lg transition-transform transform hover:-translate-y-1 hover:shadow-2xl flex flex-col group">
      <div className="relative">
        {camera.images && camera.images.length > 0 ? (
          <ImageLoader fileId={camera.images[0]} />
        ) : (
          <div className="w-full h-48 bg-gray-800 flex items-center justify-center text-gray-500">No Image</div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={onToggleArchive}
              className="bg-gray-500 bg-opacity-70 hover:bg-opacity-100 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label={camera.isArchived ? "Unarchive camera" : "Archive camera"}
            >
              {camera.isArchived ? <UnarchiveIcon className="w-5 h-5" /> : <ArchiveIcon className="w-5 h-5" />}
            </button>
            <button 
              onClick={onEdit}
              className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-opacity opacity-0 group-hover:opacity-100 z-10"
              aria-label="Edit camera"
            >
              <EditIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={onDelete}
              className="bg-red-600 bg-opacity-70 hover:bg-opacity-100 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label="Delete camera"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-white">
          {camera.manufacturerUrl ? (
            <a href={formatUrl(camera.manufacturerUrl)} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-300 hover:text-blue-200 transition-colors">
              {camera.brand}
            </a>
          ) : (
            camera.brand
          )}
        </h3>
        <p className="text-gray-300">{camera.model}</p>
        <p className="text-sm text-gray-400 mt-1">{camera.year}</p>
        
        <div className="mt-4 border-t border-gray-700 pt-3 space-y-2 text-sm">
            <div>
                <span className="font-semibold text-gray-400">Type: </span>
                <span className="text-gray-300">{camera.cameraType}</span>
            </div>
             <div>
                <span className="font-semibold text-gray-400">Format: </span>
                <span className="text-gray-300">{camera.filmFormat}</span>
            </div>
            {camera.serialNumber && <div>
                <span className="font-semibold text-gray-400">S/N: </span>
                <span className="text-gray-300">{camera.serialNumber}</span>
            </div>}
        </div>
        
        {attachedLens && (
            <div className="mt-4 border-t border-gray-700 pt-3 space-y-1 text-sm">
                <h4 className="font-semibold text-gray-400">Attached Lens:</h4>
                <p className="text-gray-300 pl-2">{attachedLens.brand} {attachedLens.model}</p>
                {(attachedLens.focalLength || attachedLens.aperture) && <p className="text-gray-400 pl-2">{attachedLens.focalLength}{attachedLens.focalLength && attachedLens.aperture && ', '}{attachedLens.aperture}</p>}
            </div>
        )}


        <div className="mt-auto pt-4 space-y-3">
             {camera.notableFeatures && <p className="text-xs text-gray-400 italic">"{camera.notableFeatures}"</p>}
             {camera.notes && <p className="text-xs text-gray-500 italic mt-2">"{camera.notes}"</p>}

             {camera.references && camera.references.length > 0 && (
                <div className="border-t border-gray-700 mt-3 pt-3">
                    <h4 className="text-xs font-semibold text-gray-400 mb-1">References</h4>
                    <ul className="space-y-1">
                        {camera.references.map((ref, index) => (
                            <li key={index}>
                                <a href={formatUrl(ref.url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate">
                                    {ref.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default CameraCard;
