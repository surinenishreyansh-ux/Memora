import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

const UploadBox = ({ onUpload }) => {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] }
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-accent bg-accent/5' : 'border-white/20 hover:border-accent/50 hover:bg-white/5'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-studio-800 rounded-full">
          <UploadCloud className="w-8 h-8 text-accent" />
        </div>
        <div>
          <p className="text-lg font-medium text-white mb-1">
            {isDragActive ? "Drop photos here" : "Click or drag photos to upload"}
          </p>
          <p className="text-sm text-gray-400">
            JPG, PNG, WEBP up to 10MB each
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadBox;
