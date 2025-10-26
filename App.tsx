import React, { useState, useEffect, useCallback } from 'react';
import * as authService from './services/authService';
import * as driveService from './services/driveService';
import { User } from './services/authService';
import { Collection, CameraInfo, LensInfo } from './types';
import Header from './components/Header';
import AddCameraModal from './components/AddCameraModal';
import Spinner from './components/Spinner';
import CameraCard from './components/CameraCard';
import LensCard from './components/LensCard';
import { exportToCsv } from './utils/csv';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [collection, setCollection] = useState<Collection>({ cameras: [], lenses: [] });
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<CameraInfo | LensInfo | undefined>(undefined);
  const [editType, setEditType] = useState<'cameras' | 'lenses' | undefined>(undefined);
  const [filter, setFilter] = useState<'all' | 'cameras' | 'lenses'>('all');
  const [showArchived, setShowArchived] = useState(false);

  const onUserChange = useCallback((newUser: User | null) => {
    setIsLoading(true);
    setUser(newUser);
    if (newUser) {
      driveService.init(newUser.token)
        .then(() => {
          driveService.loadCollection()
            .then(loadedCollection => {
              setCollection(loadedCollection);
              setError(null);
            })
            .catch(err => {
              console.error(err);
              setError("Failed to load your collection from Google Drive.");
            })
            .finally(() => setIsLoading(false));
        })
        .catch(err => {
          console.error(err);
          setError("Failed to initialize Google Drive service.");
          setIsLoading(false);
        });
    } else {
      setCollection({ cameras: [], lenses: [] });
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    authService.initialize(onUserChange)
      .then(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          onUserChange(currentUser);
        } else {
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error("Auth initialization failed", err);
        setError("Could not initialize authentication. Please try again later.");
        setIsLoading(false);
      })
      .finally(() => setIsAuthInitialized(true));
  }, [onUserChange]);

  const handleSaveItem = async (payload: { cameraData?: CameraInfo, lensData?: LensInfo }) => {
    const newCollection = { ...collection };
    let itemSaved = false;

    if (payload.cameraData) {
        const camIndex = newCollection.cameras.findIndex(c => c.id === payload.cameraData!.id);
        if (camIndex > -1) {
            newCollection.cameras[camIndex] = payload.cameraData;
        } else {
            newCollection.cameras.push(payload.cameraData);
        }
        itemSaved = true;
    }
    if (payload.lensData) {
        const lensIndex = newCollection.lenses.findIndex(l => l.id === payload.lensData!.id);
        if (lensIndex > -1) {
            newCollection.lenses[lensIndex] = payload.lensData;
        } else {
            newCollection.lenses.push(payload.lensData);
        }
        itemSaved = true;
    }
    
    if (itemSaved) {
        setCollection(newCollection);
        await driveService.saveCollection(newCollection);
    }
    setIsModalOpen(false);
    setItemToEdit(undefined);
    setEditType(undefined);
  };

  const handleDeleteItem = async (id: string, type: 'cameras' | 'lenses') => {
    if (!window.confirm(`Are you sure you want to delete this ${type === 'cameras' ? 'camera' : 'lens'}? This action cannot be undone.`)) return;

    const newCollection = { ...collection };
    const item = newCollection[type].find(i => i.id === id);
    if (!item) return;
    
    // Delete associated images from drive
    if(item.images && item.images.length > 0) {
      await Promise.all(item.images.map(driveService.deleteFile)).catch(err => {
        console.error("Failed to delete some images from drive, but proceeding with collection update.", err);
      });
    }

    newCollection[type] = newCollection[type].filter(i => i.id !== id);
    
    // Also remove lens from camera if it was attached
    if (type === 'lenses') {
      newCollection.cameras = newCollection.cameras.map(c => 
        c.attachedLensId === id ? { ...c, attachedLensId: undefined } : c
      );
    }

    setCollection(newCollection);
    await driveService.saveCollection(newCollection);
  };
  
  const handleToggleArchive = async (id: string, type: 'cameras' | 'lenses') => {
    const newCollection = { ...collection };
    const itemIndex = newCollection[type].findIndex(i => i.id === id);
    if (itemIndex > -1) {
      newCollection[type][itemIndex].isArchived = !newCollection[type][itemIndex].isArchived;
      setCollection(newCollection);
      await driveService.saveCollection(newCollection);
    }
  };

  const handleOpenModal = (item?: CameraInfo | LensInfo, type?: 'cameras' | 'lenses') => {
    setItemToEdit(item);
    setEditType(type);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    exportToCsv(collection.cameras, collection.lenses, 'camera_collection_export.zip');
  };

  const renderContent = () => {
    if (!isAuthInitialized || isLoading) {
      return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }
    if (error) {
      return <div className="text-center text-red-400 p-8">{error}</div>;
    }
    if (!user) {
      return (
        <div className="text-center p-10">
          <h2 className="text-2xl font-bold mb-4 text-white">Welcome to Camera Collector AI</h2>
          <p className="text-gray-400 mb-6">Sign in with your Google account to start cataloging your gear.</p>
          <button
            onClick={authService.signIn}
            className="bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
          >
            Sign In with Google
          </button>
        </div>
      );
    }
    
    const filteredCameras = collection.cameras.filter(c => showArchived || !c.isArchived);
    const filteredLenses = collection.lenses.filter(l => showArchived || !l.isArchived);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="mb-6 flex justify-between items-center">
                 <div className="flex gap-2 rounded-lg bg-gray-800 p-1">
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-semibold rounded-md ${filter === 'all' ? 'bg-brand-primary text-white' : 'text-gray-300 hover:bg-gray-700'}`}>All</button>
                    <button onClick={() => setFilter('cameras')} className={`px-4 py-2 text-sm font-semibold rounded-md ${filter === 'cameras' ? 'bg-brand-primary text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Cameras ({filteredCameras.length})</button>
                    <button onClick={() => setFilter('lenses')} className={`px-4 py-2 text-sm font-semibold rounded-md ${filter === 'lenses' ? 'bg-brand-primary text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Lenses ({filteredLenses.length})</button>
                </div>
                 <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-300">
                  <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="form-checkbox h-4 w-4 bg-gray-800 border-gray-600 text-brand-primary focus:ring-brand-primary"/>
                  <span>Show Archived</span>
                </label>
            </div>

            {(filteredCameras.length === 0 && filteredLenses.length === 0) && (
                <div className="text-center text-gray-400 py-16">
                    <h3 className="text-xl font-semibold">Your collection is empty.</h3>
                    <p className="mt-2">Click "Add Item" to start cataloging your gear.</p>
                </div>
            )}

            {(filter === 'all' || filter === 'cameras') && filteredCameras.length > 0 && (
                <>
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Cameras</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCameras.map(camera => (
                            <CameraCard 
                                key={camera.id} 
                                camera={camera}
                                lenses={collection.lenses}
                                onEdit={() => handleOpenModal(camera, 'cameras')} 
                                onDelete={() => handleDeleteItem(camera.id, 'cameras')}
                                onToggleArchive={() => handleToggleArchive(camera.id, 'cameras')}
                            />
                        ))}
                    </div>
                </>
            )}

            {(filter === 'all' || filter === 'lenses') && filteredLenses.length > 0 && (
                 <>
                    <h2 className="text-2xl font-bold text-white mb-4 mt-8 border-b border-gray-700 pb-2">Lenses</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredLenses.map(lens => (
                           <LensCard
                                key={lens.id}
                                lens={lens}
                                onEdit={() => handleOpenModal(lens, 'lenses')}
                                onDelete={() => handleDeleteItem(lens.id, 'lenses')}
                                onToggleArchive={() => handleToggleArchive(lens.id, 'lenses')}
                           />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
  };

  return (
    <div className="bg-brand-background min-h-screen text-gray-200">
      <Header
        user={user}
        onSignIn={authService.signIn}
        onSignOut={authService.signOut}
        onAddItem={() => handleOpenModal()}
        onExport={handleExport}
        isBusy={!isAuthInitialized || isLoading}
      />
      <main>
        {renderContent()}
      </main>
      {isModalOpen && (
        <AddCameraModal
          onClose={() => { setIsModalOpen(false); setItemToEdit(undefined); setEditType(undefined); }}
          onSave={handleSaveItem}
          itemToEdit={itemToEdit}
          editType={editType}
          lenses={collection.lenses}
        />
      )}
    </div>
  );
};

export default App;
