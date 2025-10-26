import React, { useState, useCallback } from 'react';
import { CameraInfo } from './types';
import Header from './components/Header';
import CameraCard from './components/CameraCard';
import AddCameraModal from './components/AddCameraModal';
import { PlusIcon } from './components/Icons';
import { exportToCsv } from './utils/csv';

interface ModalState {
  isOpen: boolean;
  cameraToEdit?: {
    index: number;
    camera: CameraInfo;
  };
}

const App: React.FC = () => {
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false });

  const openAddModal = () => setModalState({ isOpen: true });
  const openEditModal = (index: number, camera: CameraInfo) => setModalState({ isOpen: true, cameraToEdit: { index, camera } });
  const closeModal = () => setModalState({ isOpen: false });

  const handleSave = useCallback((cameraData: CameraInfo) => {
    if (modalState.cameraToEdit) {
      const { index } = modalState.cameraToEdit;
      setCameras(prev => prev.map((cam, i) => (i === index ? cameraData : cam)));
    } else {
      setCameras(prev => [...prev, cameraData]);
    }
    closeModal();
  }, [modalState.cameraToEdit]);

  const handleExport = useCallback(() => {
    if (cameras.length > 0) {
      exportToCsv(cameras, `camera-collection-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      alert("Your collection is empty. Add a camera before exporting.");
    }
  }, [cameras]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-light font-sans">
      <Header onExport={handleExport} collectionSize={cameras.length} />
      <main className="container mx-auto p-4 md:p-8">
        {cameras.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-400">Your collection is empty.</h2>
            <p className="text-gray-500 mt-2">Click the '+' button to add your first camera.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {cameras.map((camera, index) => (
              <CameraCard 
                key={index} 
                camera={camera}
                onEdit={() => openEditModal(index, camera)}
              />
            ))}
          </div>
        )}
      </main>

      <button
        onClick={openAddModal}
        className="fixed bottom-8 right-8 bg-brand-primary hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg focus:ring-brand-primary"
        aria-label="Add new camera"
      >
        <PlusIcon className="w-8 h-8" />
      </button>

      {modalState.isOpen && (
        <AddCameraModal
          onClose={closeModal}
          onSave={handleSave}
          cameraToEdit={modalState.cameraToEdit?.camera}
        />
      )}
    </div>
  );
};

export default App;
