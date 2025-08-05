import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
}

export function ImagePreview({ file, onRemove }: ImagePreviewProps) {
  const [imageUrl] = useState(() => URL.createObjectURL(file));

  return (
    <div className="relative inline-block">
      <div className="relative rounded-xl overflow-hidden shadow-lg max-w-xs">
        <img 
          src={imageUrl} 
          alt="Preview" 
          className="w-full h-auto max-h-48 object-cover"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <img src={imageUrl} alt="Full preview" className="w-full h-auto" />
            </DialogContent>
          </Dialog>
        </div>
        <Button
          size="icon"
          variant="destructive"
          className="absolute top-2 right-2 h-6 w-6 rounded-full"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-xs text-gray-600 mt-1 px-1 truncate max-w-xs">
        {file.name}
      </p>
    </div>
  );
}

interface MessageImageProps {
  src: string;
  alt: string;
  isOwnMessage: boolean;
}

export function MessageImage({ src, alt, isOwnMessage }: MessageImageProps) {
  return (
    <div className="relative max-w-[250px]">
      <Dialog>
        <DialogTrigger asChild>
          <div className="cursor-pointer group">
            <img 
              src={src} 
              alt={alt} 
              className="max-w-full max-h-[300px] object-cover rounded-xl shadow-md transition-transform group-hover:scale-[1.02]"
              onLoad={() => console.log('Image loaded successfully:', src)}
              onError={(e) => {
                console.error('Image failed to load:', src);
                console.error('Error details:', e);
              }}
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white" />
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <img src={src} alt={alt} className="w-full h-auto" />
        </DialogContent>
      </Dialog>
    </div>
  );
}