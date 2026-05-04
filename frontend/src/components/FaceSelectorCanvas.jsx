import { useRef, useState, useEffect } from 'react';

const FaceSelectorCanvas = ({ imageUrl, onCrop }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.crossOrigin = 'anonymous'; // Important for Cloudinary images
    image.src = imageUrl;
    image.onload = () => {
      // Set canvas size to match image aspect ratio, bounded by container
      const containerWidth = canvas.parentElement.clientWidth;
      const scale = containerWidth / image.width;
      canvas.width = containerWidth;
      canvas.height = image.height * scale;
      
      imageRef.current = image;
      drawCanvas();
    };
  }, [imageUrl]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!imageRef.current) return;

    // Draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw selection overlay if exists
    if (hasSelection || isDrawing) {
      // Darken rest of image
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = currentPos.x - startPos.x;
      const height = currentPos.y - startPos.y;

      // Clear the selected area
      ctx.save();
      ctx.beginPath();
      // Draw a rounded rectangle or circle for better UI
      const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
      ctx.arc(startPos.x + width/2, startPos.y + height/2, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw border
      ctx.beginPath();
      ctx.arc(startPos.x + width/2, startPos.y + height/2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#eab308'; // accent color
      ctx.lineWidth = 3;
      ctx.stroke();

      // Add soft glow
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 15;
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [currentPos, hasSelection, isDrawing]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Support touch and mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault(); // Prevent scrolling on touch
    const pos = getCoordinates(e);
    setStartPos(pos);
    setCurrentPos(pos);
    setIsDrawing(true);
    setHasSelection(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setCurrentPos(getCoordinates(e));
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSelection(true);

    // Generate crop base64
    generateCrop();
  };

  const generateCrop = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!image) return;

    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    const radius = Math.min(width, height) / 2;
    
    if (radius < 10) {
       setHasSelection(false);
       onCrop(null);
       return; // Too small
    }

    const centerX = startPos.x + (currentPos.x - startPos.x)/2;
    const centerY = startPos.y + (currentPos.y - startPos.y)/2;

    // Calculate original image coordinates
    const scale = image.width / canvas.width;
    const origCenterX = centerX * scale;
    const origCenterY = centerY * scale;
    const origRadius = radius * scale;

    // Create a temporary canvas to extract the crop
    const tempCanvas = document.createElement('canvas');
    const cropSize = origRadius * 2;
    tempCanvas.width = cropSize;
    tempCanvas.height = cropSize;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw the cropped portion
    tempCtx.drawImage(
      image,
      origCenterX - origRadius,
      origCenterY - origRadius,
      cropSize,
      cropSize,
      0, 0, cropSize, cropSize
    );

    tempCanvas.toBlob((blob) => {
      onCrop(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black touch-none">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full h-auto cursor-crosshair block"
      />
      {!hasSelection && !isDrawing && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-black/60 text-white px-6 py-3 rounded-full backdrop-blur-md font-medium animate-pulse">
            Circle your face
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceSelectorCanvas;
