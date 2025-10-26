import React from 'react';
import { CameraIcon, DownloadIcon } from './Icons';

interface HeaderProps {
    onExport: () => void;
    collectionSize: number;
}

const Header: React.FC<HeaderProps> = ({ onExport, collectionSize }) => {
  return (
    <header className="bg-brand-dark shadow-md">
      <div className="container mx-auto px-4 py-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center">
            <CameraIcon className="w-8 h-8 mr-3 text-brand-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
            Camera Collector <span className="text-brand-primary">AI</span>
            </h1>
        </div>
        <button
          onClick={onExport}
          disabled={collectionSize === 0}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          aria-label="Export collection to CSV"
        >
          <DownloadIcon className="w-5 h-5" />
          Export
        </button>
      </div>
    </header>
  );
};

export default Header;
