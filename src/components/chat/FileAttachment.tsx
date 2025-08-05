import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { 
  Paperclip, 
  Image, 
  File, 
  Camera, 
  FolderOpen,
  X,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileAttachmentProps {
  onFileSelect: (file: File) => void;
  className?: string;
}

interface AttachmentOption {
  icon: React.ReactNode;
  label: string;
  accept: string;
  action: () => void;
}

export function FileAttachment({ onFileSelect, className }: FileAttachmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
      setIsOpen(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openImageDialog = () => {
    imageInputRef.current?.click();
  };

  const attachmentOptions: AttachmentOption[] = [
    {
      icon: <Image className="h-5 w-5" />,
      label: "Foto & Video",
      accept: "image/*,video/*",
      action: openImageDialog
    },
    {
      icon: <File className="h-5 w-5" />,
      label: "Dokumen",
      accept: ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx",
      action: openFileDialog
    },
    {
      icon: <Camera className="h-5 w-5" />,
      label: "Kamera",
      accept: "image/*",
      action: () => {
        // TODO: Implement camera capture
        console.log("Camera capture not implemented yet");
      }
    }
  ];

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            size="icon" 
            variant="ghost"
            className={cn(
              "rounded-full h-8 w-8 hover:bg-gray-100 transition-colors",
              className
            )}
          >
            <Paperclip className="h-4 w-4 text-gray-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-3 border-0 shadow-xl rounded-xl"
          align="start"
          side="top"
        >
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Lampirkan File</h4>
            {attachmentOptions.map((option, index) => (
              <button
                key={index}
                onClick={option.action}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  {option.icon}
                </div>
                <span className="text-sm text-gray-700">{option.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Hidden file inputs */}
      <Input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}

// Component untuk menampilkan file yang sudah diupload
interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  className?: string;
}

export function FilePreview({ file, onRemove, className }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 bg-gray-50 rounded-lg border",
      className
    )}>
      {isImage ? (
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
          <Image className="h-6 w-6 text-gray-500" />
        </div>
      ) : isVideo ? (
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
          <File className="h-6 w-6 text-gray-500" />
        </div>
      ) : (
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
          <File className="h-6 w-6 text-gray-500" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)}
        </p>
      </div>
      
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => {
            const url = URL.createObjectURL(file);
            window.open(url, '_blank');
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 