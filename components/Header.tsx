import React from 'react';
import { User } from '../services/authService';
import Spinner from './Spinner';
import { CameraIcon } from './Icons';

interface HeaderProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onAddItem: () => void;
  onExport: () => void;
  isBusy: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, onSignIn, onSignOut, onAddItem, onExport, isBusy }) => {
  return (
    <header className="bg-brand-dark shadow-md p-4 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <CameraIcon className="w-8 h-8 text-brand-primary" />
        <h1 className="text-2xl font-bold text-white">Camera Collector AI</h1>
      </div>
      <div className="flex items-center gap-4">
        {isBusy && <Spinner />}
        {user ? (
          <>
            <button
              onClick={onAddItem}
              className="bg-brand-primary hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
            >
              Add Item
            </button>
            <button
              onClick={onExport}
              className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Export Collection
            </button>
            <div className="flex items-center gap-3">
              <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
              <button
                onClick={onSignOut}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={onSignIn}
            className="bg-brand-primary hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
          >
            Sign In with Google
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
