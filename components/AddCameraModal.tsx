import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CameraInfo, LensInfo } from '../types';
import { identifyGear } from '../services/geminiService';
import * as driveService from '../services/driveService';
import { useCamera } from '../hooks/useCamera';
import { fileToBase64 } from '../utils/image';
import Spinner from './Spinner';
import { CameraIcon, UploadIcon, XIcon, SparklesIcon, SaveIcon, TrashIcon, LensIcon } from './Icons';

type ModalImage = {
  key: string;
  base64?: string;
  fileId?: string;
};

type EditType = 'cameras' | 'lenses';

interface AddItemModalProps {
  onClose: () => void;
  onSave: (payload: { cameraData?: CameraInfo, lensData?: LensInfo }) => void;
  itemToEdit?: CameraInfo | LensInfo;
  editType?: EditType;
  lenses: LensInfo[];
}

const AddCameraModal: React.FC<AddItemModalProps> = ({ onClose, onSave, itemToEdit, editType, lenses }) => {
  const [images, setImages] = useState<ModalImage[]>([]);
  const [cameraData, setCameraData] = useState<Partial<CameraInfo>>({});
  const [lensData, setLensData] = useState<Partial<LensInfo>>({});
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [saveCamera, setSaveCamera] = useState(true);
  const [saveLens, setSaveLens] = useState(true);

  const { videoRef, canvasRef, stream, error: cameraError, startCamera, stopCamera, capturePhoto } = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!itemToEdit;
  const originalImageFileIds = useRef<string[]>([]);

  useEffect(() => {
    if (isEditMode && itemToEdit) {
      const existingImages = itemToEdit.images.map(fileId => ({ key: fileId, fileId }));
      setImages(existingImages);
      originalImageFileIds.current = itemToEdit.images;

      if (editType === 'cameras') {
        setCameraData(itemToEdit as CameraInfo);
        setSaveLens(false);
      } else {
        setLensData(itemToEdit as LensInfo);
        setSaveCamera(false);
      }
    }
  }, [itemToEdit, editType, isEditMode]);

  useEffect(() => stopCamera, [stopCamera]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      try {
        const base64 = await fileToBase64(file);
        setImages(prev => [...prev, { key: Date.now().toString(), base64 }]);
      } catch (err) { setError('Failed to read image file.'); }
    }
    if (e.target) e.target.value = '';
  };

  const handleCapture = () => {
    const captured = capturePhoto();
    if (captured) {
      setImages(prev => [...prev, { key: Date.now().toString(), base64: captured }]);
      setShowCamera(false);
      stopCamera();
    } else {
      setError('Failed to capture photo.');
    }
  };

  const removeImage = (keyToRemove: string) => setImages(prev => prev.filter(({ key }) => key !== keyToRemove));

  const handleAiAnalysis = useCallback(async () => {
    const imagesToAnalyze = images.filter(img => img.base64).map(img => img.base64!);
    if (imagesToAnalyze.length === 0) {
      alert("Please add a new image to perform AI analysis.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const infoForAi = { camera: cameraData, lens: lensData };
      const identifiedData = await identifyGear(imagesToAnalyze, infoForAi);
      if (identifiedData.camera) {
        setCameraData(prev => ({ ...prev, ...identifiedData.camera }));
        setSaveCamera(true);
      }
      if (identifiedData.lens) {
        setLensData(prev => ({ ...prev, ...identifiedData.lens }));
        setSaveLens(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [images, cameraData, lensData]);
  
  const handleSave = async () => {
    if (images.length === 0) {
      setError("Please add at least one image.");
      return;
    }
    if (saveCamera && (!cameraData.brand || !cameraData.model)) {
      setError("Camera must have a Brand and Model to be saved.");
      return;
    }
     if (saveLens && (!lensData.brand || !lensData.model)) {
      setError("Lens must have a Brand and Model to be saved.");
      return;
    }
    if(!saveCamera && !saveLens) {
      setError("At least one item (camera or lens) must be selected to save.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
        const uploadPromises = images.filter(i => i.base64).map(i => driveService.uploadImage(i.base64!, `${Date.now()}.jpg`));
        const newFileIds = await Promise.all(uploadPromises);
        const existingFileIds = images.filter(img => img.fileId).map(img => img.fileId!);
        const finalFileIds = [...existingFileIds, ...newFileIds];

        const idsToDelete = originalImageFileIds.current.filter(id => !existingFileIds.includes(id));
        await Promise.all(idsToDelete.map(id => driveService.deleteFile(id)));

        let finalCameraData: CameraInfo | undefined;
        let finalLensData: LensInfo | undefined;
        
        if (saveLens) {
          finalLensData = {
            id: lensData.id || `lens-${Date.now()}`,
            images: [], // Handled below
            ...lensData,
          } as LensInfo;
        }

        if (saveCamera) {
          finalCameraData = {
            id: cameraData.id || `cam-${Date.now()}`,
            images: [], // Handled below
            ...cameraData
          } as CameraInfo;

          if (finalLensData && !finalCameraData.attachedLensId) {
              finalCameraData.attachedLensId = finalLensData.id;
          }
        }
        
        const cameraImageIds = saveCamera ? finalFileIds : [];
        const lensImageIds = saveLens ? finalFileIds : [];

        if (finalCameraData) finalCameraData.images = cameraImageIds;
        if (finalLensData) finalLensData.images = lensImageIds;

        onSave({ cameraData: finalCameraData, lensData: finalLensData });

    } catch (err) {
        setError("Failed to save. Please check your connection and try again.");
        console.error(err);
    } finally {
        setIsSaving(false);
    }
  };

  const handleInputChange = (type: EditType, field: keyof any, value: any) => {
    const setter = type === 'cameras' ? setCameraData : setLensData;
    setter(prev => ({ ...prev, [field]: value }));
  };

  const hasNewImages = images.some(i => i.base64);
  const hasIdentifiedItems = cameraData.brand || lensData.brand;

  const renderCameraForm = () => (
    <div className="space-y-4 pt-4 border-t border-gray-600">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
           <CameraIcon className="w-6 h-6 text-gray-400"/>
           <h3 className="text-lg font-semibold">Camera Details</h3>
        </div>
        {!isEditMode && <label className="flex items-center space-x-2 cursor-pointer text-sm">
          <span>Save this camera</span>
          <input type="checkbox" checked={saveCamera} onChange={e => setSaveCamera(e.target.checked)} className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 text-brand-primary focus:ring-brand-primary"/>
        </label>}
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!saveCamera && !isEditMode ? 'opacity-50 pointer-events-none' : ''}`}>
        <input type="text" placeholder="Brand" value={cameraData.brand || ''} onChange={e => handleInputChange('cameras','brand', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
        <input type="text" placeholder="Model" value={cameraData.model || ''} onChange={e => handleInputChange('cameras','model', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
        <input type="text" placeholder="Year" value={cameraData.year || ''} onChange={e => handleInputChange('cameras','year', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
        <input type="text" placeholder="Serial Number" value={cameraData.serialNumber || ''} onChange={e => handleInputChange('cameras','serialNumber', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
        <select value={cameraData.attachedLensId || ''} onChange={e => handleInputChange('cameras', 'attachedLensId', e.target.value)} className="md:col-span-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
            <option value="">No Lens Attached</option>
            {lenses.map(lens => <option key={lens.id} value={lens.id}>{lens.brand} {lens.model}</option>)}
        </select>
        <div className="md:col-span-2">
            <textarea placeholder="Notable Features" value={cameraData.notableFeatures || ''} onChange={e => handleInputChange('cameras','notableFeatures', e.target.value)} rows={2} className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"></textarea>
        </div>
      </div>
    </div>
  );
  
  const renderLensForm = () => (
     <div className="space-y-4 pt-4 border-t border-gray-600">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
           <LensIcon className="w-6 h-6 text-gray-400"/>
           <h3 className="text-lg font-semibold">Lens Details</h3>
        </div>
        {!isEditMode && <label className="flex items-center space-x-2 cursor-pointer text-sm">
          <span>Save this lens</span>
          <input type="checkbox" checked={saveLens} onChange={e => setSaveLens(e.target.checked)} className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 text-brand-primary focus:ring-brand-primary"/>
        </label>}
      </div>
       <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!saveLens && !isEditMode ? 'opacity-50 pointer-events-none' : ''}`}>
        <input type="text" placeholder="Lens Brand" value={lensData.brand || ''} onChange={e => handleInputChange('lenses','brand', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
        <input type="text" placeholder="Lens Model" value={lensData.model || ''} onChange={e => handleInputChange('lenses','model', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
        <input type="text" placeholder="Focal Length (e.g. 50mm)" value={lensData.focalLength || ''} onChange={e => handleInputChange('lenses','focalLength', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
        <input type="text" placeholder="Aperture (e.g. f/1.8)" value={lensData.aperture || ''} onChange={e => handleInputChange('lenses','aperture', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
        <div className="md:col-span-2">
            <input type="text" placeholder="Lens Serial Number" value={lensData.serialNumber || ''} onChange={e => handleInputChange('lenses','serialNumber', e.target.value)} className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"/>
        </div>
      </div>
    </div>
  );


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">{isEditMode ? `Edit ${editType === 'cameras' ? 'Camera' : 'Lens'}` : "Add New Item"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon className="w-6 h-6" /></button>
          </div>

          {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

          {showCamera && (
            <div className="relative p-4 bg-black rounded-lg">
              <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md aspect-video"></video>
              <canvas ref={canvasRef} className="hidden"></canvas>
              <div className="absolute inset-x-0 bottom-6 flex justify-center gap-4">
                  <button onClick={handleCapture} className="bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg">Capture</button>
                  <button onClick={() => { setShowCamera(false); stopCamera(); }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-full shadow-lg">Cancel</button>
              </div>
            </div>
          )}

          {!showCamera && (
            <div className="space-y-6">
              <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Item Photos</h3>
                  {images.length > 0 && (
                     <div className="mb-4"><div className="flex gap-2 flex-wrap">
                        {images.map((img) => (
                            <div key={img.key} className="relative">
                                <img src={img.base64 ? `data:image/jpeg;base64,${img.base64}`: `https://via.placeholder.com/64/1a1a1a/4a5568?text=Drive`} alt={`thumbnail`} className="w-16 h-16 rounded object-cover"/>
                                <button onClick={() => removeImage(img.key)} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 text-white hover:bg-red-500"><XIcon className="w-3 h-3"/></button>
                            </div>
                        ))}
                      </div></div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex-grow flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg">
                        <UploadIcon className="w-5 h-5"/> {images.length > 0 ? 'Add Another' : 'Upload Image'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <button onClick={() => { startCamera(); setShowCamera(true); }} className="flex-grow flex items-center justify-center gap-2 bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg">
                        <CameraIcon className="w-5 h-5"/> Use Camera
                    </button>
                  </div>
                   {cameraError && <p className="text-red-400 text-sm mt-2">{cameraError}</p>}
              </div>

              {hasNewImages && !hasIdentifiedItems && (
                <button onClick={() => handleAiAnalysis()} disabled={isLoading || isSaving} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500">
                  {isLoading ? <Spinner /> : <SparklesIcon className="w-5 h-5"/>} Identify with AI
                </button>
              )}

              {hasIdentifiedItems && (
                <>
                  {cameraData.brand && renderCameraForm()}
                  {lensData.brand && renderLensForm()}
                </>
              )}
              
              <div className="flex gap-4 pt-6 border-t border-gray-700">
                <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg">Cancel</button>
                <button onClick={handleSave} disabled={isLoading || images.length === 0 || isSaving} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500">
                  {isSaving ? <Spinner /> : <SaveIcon className="w-5 h-5"/>}
                  {isSaving ? 'Saving...' : 'Save'}
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
