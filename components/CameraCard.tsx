import React from 'react';
import { CameraInfo } from '../types';
import { EditIcon } from './Icons';
import { formatUrl } from '../utils/url';

interface CameraCardProps {
  camera: CameraInfo;
  onEdit: () => void;
}

const CameraCard: React.FC<CameraCardProps> = ({ camera, onEdit }) => {
  return (
    <div className="bg-brand-dark rounded-lg overflow-hidden shadow-lg transition-transform transform hover:-translate-y-1 hover:shadow-2xl flex flex-col group">
      <div className="relative">
        {camera.images && camera.images.length > 0 && (
          <img
            src={`data:image/jpeg;base64,${camera.images[0]}`}
            alt={`${camera.brand} ${camera.model}`}
            className="w-full h-48 object-cover"
          />
        )}
        <button 
          onClick={onEdit}
          className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-opacity opacity-0 group-hover:opacity-100 z-10"
          aria-label="Edit camera"
        >
          <EditIcon className="w-5 h-5" />
        </button>
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