import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CameraInfo } from '../types';
import { identifyCamera } from '../services/geminiService';
import { useCamera } from '../hooks/useCamera';
import { fileToBase64 } from '../utils/image';
import Spinner from './Spinner';
import { CameraIcon, UploadIcon, XIcon, SparklesIcon, SaveIcon, TrashIcon } from './Icons';

interface AddCameraModalProps {
  onClose: () => void;
  onSave: (camera: CameraInfo) => void;
  cameraToEdit?: CameraInfo;
}

const AddCameraModal: React.FC<AddCameraModalProps> = ({ onClose, onSave, cameraToEdit }) => {
  const [images, setImages] = useState<string[]>([]);
  const [cameraInfo, setCameraInfo] = useState<Partial<Omit<CameraInfo, 'images'>>>({ references: [] });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState<boolean>(false);

  const { videoRef, canvasRef, stream, error: cameraError, startCamera, stopCamera, capturePhoto } = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!cameraToEdit;

  useEffect(() => {
    if (isEditMode) {
      setImages(cameraToEdit.images);
      const { images: _, ...info } = cameraToEdit;
      setCameraInfo({ references: [], ...info });
    }
  }, [cameraToEdit, isEditMode]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      try {
        const base64 = await fileToBase64(file);
        setImages(prev => [...prev, base64]);
      } catch (err) {
        setError('Failed to read image file.');
      }
    }
    if(e.target) e.target.value = '';
  };

  const handleCapture = () => {
    const captured = capturePhoto();
    if (captured) {
      setImages(prev => [...prev, captured]);
      setShowCamera(false);
      stopCamera();
    } else {
      setError('Failed to capture photo.');
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAiAnalysis = useCallback(async (isRegeneration: boolean) => {
    if (images.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const infoForAi = isRegeneration ? cameraInfo : undefined;
      const identifiedData = await identifyCamera(images, infoForAi);
      setCameraInfo(prev => ({ ...prev, ...identifiedData }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [images, cameraInfo]);
  
  const handleSave = () => {
    if (images.length > 0 && cameraInfo.brand && cameraInfo.model && cameraInfo.year) {
      onSave({ ...cameraInfo, images } as CameraInfo);
    } else {
      setError("Please add at least one image, identify the camera, and ensure all required fields are filled.");
    }
  };

  const handleInputChange = (field: keyof Omit<CameraInfo, 'images' | 'references'>, value: string) => {
      setCameraInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleReferenceChange = (index: number, field: 'title' | 'url', value: string) => {
    setCameraInfo(prev => {
        const updatedReferences = [...(prev.references || [])];
        updatedReferences[index] = { ...updatedReferences[index], [field]: value };
        return { ...prev, references: updatedReferences };
    });
  };

  const addReference = () => {
    setCameraInfo(prev => ({
        ...prev,
        references: [...(prev.references || []), { title: '', url: '' }]
    }));
  };

  const removeReference = (index: number) => {
    setCameraInfo(prev => ({
        ...prev,
        references: (prev.references || []).filter((_, i) => i !== index)
    }));
  };

  const reset = () => {
    setImages([]);
    setCameraInfo({ references: [] });
    setError(null);
    if(showCamera) {
      stopCamera();
      setShowCamera(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">{isEditMode ? "Edit Camera" : "Add New Camera"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm" role="alert">{error}</div>}

          {showCamera && (
            <div className="relative p-4 bg-black rounded-lg">
              <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md aspect-video"></video>
              <canvas ref={canvasRef} className="hidden"></canvas>
              <div className="absolute inset-x-0 bottom-6 flex justify-center gap-4">
                  <button onClick={handleCapture} className="bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105">
                      Capture
                  </button>
                  <button onClick={() => { setShowCamera(false); stopCamera(); }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105">
                      Cancel
                  </button>
              </div>
            </div>
          )}

          {!showCamera && (
            <div className="space-y-6">
              <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Camera Photos</h3>
                  {images.length > 0 && (
                    <div className="mb-4">
                      <img src={`data:image/jpeg;base64,${images[0]}`} alt="Main camera preview" className="rounded-lg w-full max-h-64 object-contain mb-2 bg-black"/>
                      <div className="flex gap-2 flex-wrap">
                        {images.map((img, index) => (
                            <div key={index} className="relative">
                                <img src={`data:image/jpeg;base64,${img}`} alt={`thumbnail ${index + 1}`} className="w-16 h-16 rounded object-cover"/>
                                <button onClick={() => removeImage(index)} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 text-white hover:bg-red-500">
                                    <XIcon className="w-3 h-3"/>
                                </button>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex-grow flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                        <UploadIcon className="w-5 h-5"/> {images.length > 0 ? 'Add Another' : 'Upload Image'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <button onClick={() => { startCamera(); setShowCamera(true); }} className="flex-grow flex items-center justify-center gap-2 bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                        <CameraIcon className="w-5 h-5"/> Use Camera
                    </button>
                  </div>
                   {cameraError && <p className="text-red-400 text-sm mt-2">{cameraError}</p>}
              </div>

              {images.length > 0 && !isEditMode && !cameraInfo.brand && (
                <button onClick={() => handleAiAnalysis(false)} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 transition-colors">
                  {isLoading ? <Spinner /> : <SparklesIcon className="w-5 h-5"/>} Identify with AI
                </button>
              )}

              {(cameraInfo.brand || isEditMode) && (
                 <div className="space-y-4 pt-4 border-t border-gray-600">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Camera Details</h3>
                      {images.length > 0 && <button onClick={() => handleAiAnalysis(true)} disabled={isLoading} className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-lg disabled:bg-gray-500 transition-colors text-sm">
                        {isLoading ? <Spinner /> : <SparklesIcon className="w-5 h-5"/>} Regenerate with AI
                      </button>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-400">Brand</label>
                            <input type="text" value={cameraInfo.brand || ''} onChange={(e) => handleInputChange('brand', e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-400">Model</label>
                            <input type="text" value={cameraInfo.model || ''} onChange={(e) => handleInputChange('model', e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400">Manufacturer URL</label>
                            <input type="text" placeholder="https://..." value={cameraInfo.manufacturerUrl || ''} onChange={(e) => handleInputChange('manufacturerUrl', e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Year</label>
                            <input type="text" value={cameraInfo.year || ''} onChange={(e) => handleInputChange('year', e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Serial Number</label>
                            <input type="text" value={cameraInfo.serialNumber || ''} onChange={(e) => handleInputChange('serialNumber', e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Camera Type</label>
                            <input type="text" value={cameraInfo.cameraType || ''} onChange={(e) => handleInputChange('cameraType', e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-400">Film Format</label>
                            <input type="text" value={cameraInfo.filmFormat || ''} onChange={(e) => handleInputChange('filmFormat', e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400">Notable Features</label>
                            <textarea value={cameraInfo.notableFeatures || ''} onChange={(e) => handleInputChange('notableFeatures', e.target.value)} rows={2} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400">Notes</label>
                            <textarea value={cameraInfo.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} rows={2} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"></textarea>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-600">
                      <h3 className="text-lg font-semibold mb-2">References</h3>
                      <div className="space-y-3">
                        {(cameraInfo.references || []).map((ref, index) => (
                           <div key={index} className="flex items-center gap-2">
                                <input type="text" placeholder="Title" value={ref.title} onChange={(e) => handleReferenceChange(index, 'title', e.target.value)} className="flex-1 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-sm"/>
                                <input type="text" placeholder="URL" value={ref.url} onChange={(e) => handleReferenceChange(index, 'url', e.target.value)} className="flex-1 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-sm"/>
                                <button onClick={() => removeReference(index)} className="p-2 text-gray-400 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
                           </div>
                        ))}
                      </div>
                      <button onClick={addReference} className="mt-3 text-sm text-blue-400 hover:text-blue-300">+ Add Reference</button>
                    </div>

                 </div>
              )}

              <div className="flex gap-4 pt-6 border-t border-gray-700">
                {!isEditMode && <button onClick={reset} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">Start Over</button>}
                {isEditMode && <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">Cancel</button>}
                <button onClick={handleSave} disabled={!cameraInfo.brand || isLoading || images.length === 0} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 transition-colors">
                  <SaveIcon className="w-5 h-5"/> Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCameraModal;