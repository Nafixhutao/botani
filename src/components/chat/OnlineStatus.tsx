import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineStatusProps {
  isOnline?: boolean;
  lastSeen?: string;
  className?: string;
  showText?: boolean;
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({ 
  isOnline, 
  lastSeen, 
  className,
  showText = false 
}) => {
  const formatLastSeen = (lastSeenDate: string) => {
    const date = new Date(lastSeenDate);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} jam yang lalu`;
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className={cn(
          "w-2 h-2 rounded-full",
          isOnline ? "bg-green-500 online-pulse" : "bg-gray-400"
        )}
      />
      {showText && (
        <span className="text-xs text-muted-foreground">
          {isOnline ? "Online" : lastSeen ? formatLastSeen(lastSeen) : "Offline"}
        </span>
      )}
    </div>
  );
};