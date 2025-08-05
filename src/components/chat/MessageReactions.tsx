import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  className?: string;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export function MessageReactions({ 
  messageId, 
  reactions, 
  onReact, 
  onRemoveReaction,
  className 
}: MessageReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReaction = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      onRemoveReaction(messageId, emoji);
    } else {
      onReact(messageId, emoji);
    }
    setIsOpen(false);
  };

  const getReactionCount = (emoji: string) => {
    const reaction = reactions.find(r => r.emoji === emoji);
    return reaction?.count || 0;
  };

  const hasReactions = reactions.length > 0;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Quick reactions display */}
      {hasReactions && (
        <div className="flex items-center gap-1">
          {reactions.slice(0, 3).map((reaction, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
            >
              <span>{reaction.emoji}</span>
              <span className="text-gray-600">{reaction.count}</span>
            </div>
          ))}
          {reactions.length > 3 && (
            <span className="text-xs text-gray-500">+{reactions.length - 3}</span>
          )}
        </div>
      )}

      {/* Reaction picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
          >
            <span className="text-xs">😊</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2 border-0 shadow-xl rounded-xl"
          align="center"
          side="top"
        >
          <div className="flex items-center gap-2">
            {QUICK_REACTIONS.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleReaction(emoji)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110",
                  getReactionCount(emoji) > 0 
                    ? "bg-blue-100 border-2 border-blue-300" 
                    : "hover:bg-gray-100"
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Component untuk menampilkan reaksi dalam bubble chat
interface ReactionDisplayProps {
  reactions: Reaction[];
  className?: string;
}

export function ReactionDisplay({ reactions, className }: ReactionDisplayProps) {
  if (reactions.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1 mt-1", className)}>
      {reactions.map((reaction, index) => (
        <div
          key={index}
          className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
          title={`${reaction.users.join(', ')}`}
        >
          <span>{reaction.emoji}</span>
          <span className="text-gray-600">{reaction.count}</span>
        </div>
      ))}
    </div>
  );
}

// Hook untuk mengelola reaksi
export function useMessageReactions() {
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});

  const addReaction = (messageId: string, emoji: string, userId: string) => {
    setReactions(prev => {
      const messageReactions = prev[messageId] || [];
      const existingReaction = messageReactions.find(r => r.emoji === emoji);
      
      if (existingReaction) {
        // Add user to existing reaction if not already there
        if (!existingReaction.users.includes(userId)) {
          const updatedReactions = messageReactions.map(r => 
            r.emoji === emoji 
              ? { ...r, count: r.count + 1, users: [...r.users, userId] }
              : r
          );
          return { ...prev, [messageId]: updatedReactions };
        }
      } else {
        // Create new reaction
        const newReaction: Reaction = {
          emoji,
          count: 1,
          users: [userId]
        };
        return { 
          ...prev, 
          [messageId]: [...messageReactions, newReaction] 
        };
      }
      
      return prev;
    });
  };

  const removeReaction = (messageId: string, emoji: string, userId: string) => {
    setReactions(prev => {
      const messageReactions = prev[messageId] || [];
      const updatedReactions = messageReactions.map(reaction => {
        if (reaction.emoji === emoji) {
          const updatedUsers = reaction.users.filter(id => id !== userId);
          return {
            ...reaction,
            count: updatedUsers.length,
            users: updatedUsers
          };
        }
        return reaction;
      }).filter(reaction => reaction.count > 0);

      return { ...prev, [messageId]: updatedReactions };
    });
  };

  const getReactionsForMessage = (messageId: string) => {
    return reactions[messageId] || [];
  };

  return {
    reactions,
    addReaction,
    removeReaction,
    getReactionsForMessage
  };
} 