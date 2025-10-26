import React, { useState, useEffect } from 'react';
import { LensInfo } from '../types';
import { EditIcon, TrashIcon, ArchiveIcon, UnarchiveIcon } from './Icons';
import * as driveService from '../services/driveService';

interface LensCardProps {
  lens: LensInfo;
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
                if (isMounted) setImageUrl(url);
            } catch (err) {
                console.error("Failed to load image from drive", err);
                if (isMounted) setError(true);
            }
        };
        loadImage();
        return () => {
            isMounted = false;
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [fileId]);

    if (error) return <div className="w-full h-48 bg-gray-800 flex items-center justify-center text-red-400 text-xs">Image failed to load</div>;
    if (!imageUrl) return <div className="w-full h-48 bg-gray-800 animate-pulse"></div>;
    return <img src={imageUrl} alt="Lens" className="w-full h-48 object-cover" />;
};

const LensCard: React.FC<LensCardProps> = ({ lens, onEdit, onDelete, onToggleArchive }) => {
  return (
    <div className="bg-brand-dark rounded-lg overflow-hidden shadow-lg transition-transform transform hover:-translate-y-1 hover:shadow-2xl flex flex-col group">
      <div className="relative">
        {lens.images && lens.images.length > 0 ? (
          <ImageLoader fileId={lens.images[0]} />
        ) : (
          <div className="w-full h-48 bg-gray-800 flex items-center justify-center text-gray-500">No Image</div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
            <button onClick={onToggleArchive} className="bg-gray-500 bg-opacity-70 hover:bg-opacity-100 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 z-10" aria-label={lens.isArchived ? "Unarchive lens" : "Archive lens"}>
              {lens.isArchived ? <UnarchiveIcon className="w-5 h-5" /> : <ArchiveIcon className="w-5 h-5" />}
            </button>
            <button onClick={onEdit} className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 z-10" aria-label="Edit lens">
              <EditIcon className="w-5 h-5" />
            </button>
            <button onClick={onDelete} className="bg-red-600 bg-opacity-70 hover:bg-opacity-100 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 z-10" aria-label="Delete lens">
              <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-white">{lens.brand}</h3>
        <p className="text-gray-300">{lens.model}</p>
        
        <div className="mt-4 border-t border-gray-700 pt-3 space-y-2 text-sm">
            {lens.focalLength && <div>
                <span className="font-semibold text-gray-400">Focal Length: </span>
                <span className="text-gray-300">{lens.focalLength}</span>
            </div>}
            {lens.aperture && <div>
                <span className="font-semibold text-gray-400">Aperture: </span>
                <span className="text-gray-300">{lens.aperture}</span>
            </div>}
            {lens.serialNumber && <div>
                <span className="font-semibold text-gray-400">S/N: </span>
                <span className="text-gray-300">{lens.serialNumber}</span>
            </div>}
        </div>
        
        <div className="mt-auto pt-4">
             {lens.notes && <p className="text-xs text-gray-500 italic mt-2">"{lens.notes}"</p>}
        </div>
      </div>
    </div>
  );
};

export default LensCard;
