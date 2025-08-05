import React from 'react';
import { Button } from '@/components/ui/button';
import { Reply, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReplyMessageProps {
  repliedMessage: {
    id: string;
    content: string;
    sender: {
      full_name: string;
    };
  };
  onCancel: () => void;
  className?: string;
}

export function ReplyMessage({ repliedMessage, onCancel, className }: ReplyMessageProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 bg-gray-50 border-l-4 border-blue-500 rounded-lg",
      className
    )}>
      <div className="flex-shrink-0">
        <Reply className="h-4 w-4 text-blue-500" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-blue-600">
          Balas ke {repliedMessage.sender.full_name}
        </div>
        <div className="text-sm text-gray-700 truncate">
          {repliedMessage.content}
        </div>
      </div>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={onCancel}
        className="h-6 w-6 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Component untuk menampilkan reply dalam bubble chat
interface ReplyDisplayProps {
  repliedMessage: {
    id: string;
    content: string;
    sender: {
      full_name: string;
    };
  };
  className?: string;
}

export function ReplyDisplay({ repliedMessage, className }: ReplyDisplayProps) {
  return (
    <div className={cn(
      "border-l-4 border-gray-300 pl-3 py-2 mb-2 bg-gray-50 rounded-r-lg",
      className
    )}>
      <div className="text-xs font-medium text-gray-600">
        {repliedMessage.sender.full_name}
      </div>
      <div className="text-sm text-gray-700 truncate">
        {repliedMessage.content}
      </div>
    </div>
  );
}

// Hook untuk mengelola reply state
export function useReplyMessage() {
  const [repliedMessage, setRepliedMessage] = React.useState<{
    id: string;
    content: string;
    sender: {
      full_name: string;
    };
  } | null>(null);

  const setReply = (message: {
    id: string;
    content: string;
    sender: {
      full_name: string;
    };
  }) => {
    setRepliedMessage(message);
  };

  const clearReply = () => {
    setRepliedMessage(null);
  };

  return {
    repliedMessage,
    setReply,
    clearReply
  };
} 