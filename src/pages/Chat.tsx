import React, { useEffect, useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { OnlineStatus } from '@/components/chat/OnlineStatus';
import { MessageStatus } from '@/components/chat/MessageStatus';
import { EmojiPickerComponent } from '@/components/chat/EmojiPicker';
import { FileAttachment, FilePreview } from '@/components/chat/FileAttachment';
import { VoiceRecorder, VoiceMessage } from '@/components/chat/VoiceRecorder';
import { MessageReactions, ReactionDisplay, useMessageReactions } from '@/components/chat/MessageReactions';
import { ReplyMessage, ReplyDisplay, useReplyMessage } from '@/components/chat/ReplyMessage';
import { ImagePreview, MessageImage } from '@/components/chat/ImagePreview';
import { ContentLoader } from "@/components/ui/loading";

import { 
  MessageCircle, 
  Send, 
  Users, 
  Plus,
  Search,
  Crown,
  Shield,
  Smile,
  Paperclip,
  Mic,
  Reply,
  MoreVertical,
  File
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Chat {
  id: string;
  name: string;
  chat_type: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
  unread_count: number;
  participants: {
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string;
      role: string;
      is_online?: boolean;
      last_seen?: string;
    };
  }[];
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender: {
    full_name: string;
    avatar_url: string;
    role: string;
    is_online?: boolean;
    last_seen?: string;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reply_to?: string; // Added for reply functionality
  message_type?: 'text' | 'file' | 'voice';
  file_url?: string;
}

interface User {
  user_id: string;
  full_name: string;
  avatar_url: string;
  role: string;
  is_online?: boolean;
  last_seen?: string;
}

// Fungsi upload file ke Supabase Storage
async function uploadFileToSupabase(file: File, userId?: string): Promise<string | null> {
  try {
    // Pastikan user login
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      console.error('User is not authenticated');
      return null;
    }

    // Validasi file
    if (!file || file.size === 0) {
      console.error('File is empty or invalid');
      return null;
    }

    // Validasi ukuran file (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.error('File too large. Maximum size is 50MB');
      return null;
    }

    // Validasi tipe file - tambahkan lebih banyak tipe file yang didukung
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'video/mp4', 'video/webm', 'video/mov', 'video/avi',
      'audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      console.error('File type not allowed:', file.type);
      return null;
    }

    // Upload file dengan nama yang unik
    const filePath = `uploads/${userId || 'anonymous'}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    console.log('Uploading to path:', filePath);
    
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    console.log('File uploaded to storage:', data.path);

    // Ambil URL publik
    const { data: publicUrlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    console.log('Public URL generated:', publicUrlData?.publicUrl);
    return publicUrlData?.publicUrl || null;

  } catch (error) {
    console.error('Unexpected error during upload:', error);
    return null;
  }
}


// Helper untuk cek apakah file adalah gambar
function isImageFile(url: string) {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url);
}

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New WhatsApp features state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<{ id: string; audioURL: string; duration: number }[]>([]);
  const [showDebugTool, setShowDebugTool] = useState(false);
  const [storageStatus, setStorageStatus] = useState<'checking' | 'available' | 'unavailable' | 'error'>('checking');
  
  // Hooks for new features
  const { repliedMessage, setReply, clearReply } = useReplyMessage();
  const { reactions, addReaction, removeReaction, getReactionsForMessage } = useMessageReactions();

  // Check storage bucket availability
  

  // Update user online status
  useEffect(() => {
    if (!user) return;

    const updateOnlineStatus = async (isOnline: boolean) => {
      try {
        await supabase.rpc('update_user_online_status', {
          user_uuid: user.id,
          status: isOnline
        });
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    // Set online when component mounts
    updateOnlineStatus(true);

    // Set offline when page unloads
    const handleBeforeUnload = () => updateOnlineStatus(false);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Set offline when page becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      updateOnlineStatus(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    loadChats();
    loadUsers();
    // Delay storage check to ensure user is authenticated
    if (user) {
      setTimeout(() => {
      }, 1000);
    }
  }, [user]);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
      markAsRead(activeChat);
    }
  }, [activeChat]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.chat_id === activeChat) {
            loadMessages(activeChat);
          }
          loadChats(); // Refresh chat list
        }
      )
      .subscribe();

    const chatsChannel = supabase
      .channel('chats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats'
        },
        () => {
          loadChats();
        }
      )
      .subscribe();

    // Real-time typing indicators
    const typingChannel = supabase
      .channel('typing-indicators')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators'
        },
        async (payload) => {
          const typingData = payload.new as any;
          const oldTypingData = payload.old as any;
          
          if (typingData?.chat_id === activeChat && typingData?.user_id !== user.id) {
            if (typingData?.is_typing) {
              // Get user name for typing indicator
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', typingData.user_id)
                .single();
              
              if (userProfile) {
                setTypingUsers(prev => {
                  if (!prev.includes(userProfile.full_name)) {
                    return [...prev, userProfile.full_name];
                  }
                  return prev;
                });
              }
            } else {
              // Remove user from typing
              const userId = typingData?.user_id || oldTypingData?.user_id;
              if (userId) {
                const { data: userProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('user_id', userId)
                  .single();
                
                if (userProfile) {
                  setTypingUsers(prev => prev.filter(name => name !== userProfile.full_name));
                }
              }
            }
          }
        }
      )
      .subscribe();

    // Real-time profile updates for online status
    const profilesChannel = supabase
      .channel('profiles-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          loadUsers(); // Refresh user list with updated online status
          loadChats(); // Refresh chat list with updated status
        }
      )
      .subscribe();

    // Real-time chat participants updates for unread counts
    const participantsChannel = supabase
      .channel('participants-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants'
        },
        () => {
          loadChats(); // Refresh unread counts when last_read_at is updated
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [user, activeChat]);

  const getUnreadCount = async (chatId: string): Promise<number> => {
    if (!user) return 0;

    try {
      // Get user's last_read_at for this chat
      const { data: participantData } = await supabase
        .from('chat_participants')
        .select('last_read_at')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .single();

      if (!participantData?.last_read_at) return 0;

      // Count messages created after last_read_at
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id) // Don't count own messages
        .gt('created_at', participantData.last_read_at);

      if (error) {
        console.error('Error counting unread messages:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  };

  const loadChats = async () => {
    if (!user) return;

    try {
      console.log('Loading chats for user:', user.id);
      
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats!inner(
            id,
            name,
            chat_type,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading chats:', error);
        throw error;
      }

      console.log('Chat participants data:', data);

      if (data) {
        // Load detailed chat info with participants and last messages
        const chatPromises = data.map(async (item) => {
          const chatId = item.chat_id;
          
          // Get participants with profile data using separate queries
          const { data: participantsData } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chatId);

          const participants = [];
          if (participantsData) {
            for (const participant of participantsData) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, avatar_url, role, is_online, last_seen')
                .eq('user_id', participant.user_id)
                .single();

              if (profileData) {
                participants.push({
                  user_id: participant.user_id,
                  profiles: profileData
                });
              }
            }
          }

          // Get last message with sender profile
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          let lastMessage;
          if (lastMessageData) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', lastMessageData.sender_id)
              .single();

            lastMessage = {
              content: lastMessageData.content,
              created_at: lastMessageData.created_at,
              sender_name: senderProfile?.full_name || 'Unknown'
            };
          }

          // Get unread count
          const unreadCount = await getUnreadCount(chatId);

          return {
            id: chatId,
            name: item.chats.name,
            chat_type: item.chats.chat_type,
            last_message: lastMessage,
            unread_count: unreadCount,
            participants
          };
        });

        const chatsList = await Promise.all(chatPromises);
        setChats(chatsList);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clean up typing indicators when leaving chat
  useEffect(() => {
    return () => {
      if (activeChat && user && typingTimeout) {
        clearTimeout(typingTimeout);
        supabase
          .from('typing_indicators')
          .delete()
          .eq('chat_id', activeChat)
          .eq('user_id', user.id);
      }
    };
  }, [activeChat, user, typingTimeout]);

  // Perbaiki loadMessages
  const loadMessages = async (chatId: string) => {
    try {
      setTypingUsers([]);
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      if (!data) {
        setMessages([]);
        return;
      }

      const messagesWithSender = [];
      for (const msg of data) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role, is_online, last_seen')
          .eq('user_id', msg.sender_id)
          .single();
        messagesWithSender.push({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
          sender: {
            full_name: senderProfile?.full_name || 'Unknown',
            avatar_url: senderProfile?.avatar_url || '',
            role: senderProfile?.role || 'kasir',
            is_online: senderProfile?.is_online || false,
            last_seen: senderProfile?.last_seen
          },
          status: 'read' as const,
          reply_to: undefined,
          message_type: 'text',
          file_url: undefined
        });
      }
      setMessages(messagesWithSender);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, is_online, last_seen')
        .neq('user_id', user?.id);

      if (data) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const markAsRead = async (chatId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleTyping = () => {
    if (!activeChat || !user) return;

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set typing indicator
    const updateTyping = async (isTyping: boolean) => {
      try {
        await supabase
          .from('typing_indicators')
          .upsert({
            chat_id: activeChat,
            user_id: user.id,
            is_typing: isTyping
          });
      } catch (error) {
        console.error('Error updating typing status:', error);
      }
    };

    updateTyping(true);

    // Set timeout to remove typing indicator
    const newTimeout = setTimeout(() => updateTyping(false), 2000);
    setTypingTimeout(newTimeout);
  };

  // New WhatsApp features handlers
  const handleEmojiClick = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const handleFileSelect = (file: File) => {
    // Validasi file saat pemilihan
    if (!file || file.size === 0) {
      toast({
        title: "Error",
        description: "File kosong atau tidak valid",
        variant: "destructive"
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: `File terlalu besar. Maksimal 10MB`,
        variant: "destructive"
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'audio/webm', 'audio/mp3', 'audio/wav', 'video/mp4', 'video/webm', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: `Tipe file tidak didukung: ${file.type}`,
        variant: "destructive"
      });
      return;
    }

    console.log('File selected:', file.name, file.size, file.type);
    setAttachedFiles(prev => [...prev, file]);
  };

  const handleFileRemove = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecord = (audioBlob: Blob) => {
    const audioURL = URL.createObjectURL(audioBlob);
    const voiceId = `voice_${Date.now()}`;
    setVoiceMessages(prev => [...prev, { id: voiceId, audioURL, duration: 0 }]);
    
    // Create audio element to get duration
    const audio = new Audio(audioURL);
    audio.onloadedmetadata = () => {
      setVoiceMessages(prev => 
        prev.map(vm => 
          vm.id === voiceId ? { ...vm, duration: audio.duration } : vm
        )
      );
    };
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (user) {
      addReaction(messageId, emoji, user.id);
    }
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    if (user) {
      removeReaction(messageId, emoji, user.id);
    }
  };

  const handleReplyToMessage = (message: Message) => {
    setReply({
      id: message.id,
      content: message.content,
      sender: message.sender
    });
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachedFiles.length === 0 && voiceMessages.length === 0) || !activeChat || !user || sending) return;

    try {
      setSending(true);
      
      // Clear typing indicator
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('chat_id', activeChat)
          .eq('user_id', user.id);
      }
      
      // Send text message
      if (newMessage.trim()) {
        const { error } = await supabase
          .from('messages')
          .insert({
            chat_id: activeChat,
            sender_id: user.id,
            content: newMessage.trim(),
            reply_to: repliedMessage?.id || null
          });

        if (error) throw error;
      }

      // Send file attachments
      for (const file of attachedFiles) {
        console.log('Processing file:', file.name, file.size, file.type);
        
        // Validasi file sebelum upload
        if (!file || file.size === 0) {
          toast({
            title: "Error",
            description: `File ${file.name} kosong atau tidak valid`,
            variant: "destructive"
          });
          continue;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          toast({
            title: "Error",
            description: `File ${file.name} terlalu besar. Maksimal 10MB`,
            variant: "destructive"
          });
          continue;
        }

        console.log('Starting file upload for:', file.name, file.type);
        const fileUrl = await uploadFileToSupabase(file, user.id);
        console.log('Upload result:', fileUrl);
        
        if (!fileUrl) {
          toast({
            title: "Error",
            description: `Gagal mengunggah file ${file.name}. Periksa koneksi internet dan coba lagi.`,
            variant: "destructive"
          });
          continue;
        }
        
        console.log('File uploaded successfully, inserting message:', {
          fileName: file.name,
          fileUrl: fileUrl,
          isImage: isImageFile(fileUrl)
        });
        
        const { error } = await supabase
          .from('messages')
          .insert({
            chat_id: activeChat,
            sender_id: user.id,
            content: isImageFile(fileUrl) ? `📷 ${file.name}` : `📎 ${file.name}`,
            message_type: 'file',
            file_url: fileUrl,
            reply_to: repliedMessage?.id || null
          });

        if (error) {
          console.error('Error inserting message:', error);
          throw error;
        } else {
          console.log('Message inserted successfully');
        }
      }

      // Perbaiki upload voice
      for (const voice of voiceMessages) {
        // voice.audioURL adalah string (blob url), harus fetch blob lalu upload
        const response = await fetch(voice.audioURL);
        const blob = await response.blob();
        const file = new globalThis.File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
        const fileUrl = await uploadFileToSupabase(file, user.id);
        if (!fileUrl) {
          toast({
            title: "Error",
            description: `Gagal mengunggah file suara`,
            variant: "destructive"
          });
          continue;
        }
        const { error } = await supabase
          .from('messages')
          .insert({
            chat_id: activeChat,
            sender_id: user.id,
            content: '🎤 Voice Message',
            message_type: 'voice',
            file_url: fileUrl,
            reply_to: repliedMessage?.id || null
          });
        if (error) throw error;
      }

      // Clear all inputs
      setNewMessage('');
      setAttachedFiles([]);
      setVoiceMessages([]);
      clearReply();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Gagal mengirim pesan",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const startDirectChat = async (targetUserId: string) => {
    if (!user) return;

    try {
      console.log('Starting direct chat between:', user.id, 'and', targetUserId);
      
      const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
        user1_id: user.id,
        user2_id: targetUserId
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('Direct chat created/found:', data);

      if (data) {
        await loadChats();
        setActiveChat(data);
        setShowUserList(false);
        
        toast({
          title: "Sukses",
          description: "Chat dimulai",
        });
      }
    } catch (error) {
      console.error('Error starting direct chat:', error);
      toast({
        title: "Error", 
        description: "Gagal memulai chat: " + (error as any)?.message,
        variant: "destructive"
      });
    }
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.chat_type === 'direct') {
      const otherParticipant = chat.participants.find(p => p.user_id !== user?.id);
      return otherParticipant?.profiles.full_name || 'Chat Langsung';
    }
    return chat.name;
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'kasir':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Hari ini';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    } else {
      return format(messageDate, 'dd MMMM yyyy', { locale: id });
    }
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.created_at).toDateString();
    const previousDate = new Date(previousMessage.created_at).toDateString();
    
    return currentDate !== previousDate;
  };

  if (loading) {
    return (
      <AppLayout title="Chat">
        <ContentLoader message="Memuat chat..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Chat" 
      breadcrumbs={[{ label: 'Chat' }]}>
      <div className="h-[calc(100vh-200px)] flex gap-6">
        {/* Chat List Sidebar - WhatsApp Style */}
        <div className="w-80">
          <Card className="h-full border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  Chat
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => setShowDebugTool(!showDebugTool)}
                    variant="ghost"
                    className="h-8 px-2 text-xs hover:bg-primary/10"
                  >
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setShowUserList(!showUserList)}
                    variant="ghost"
                    className="h-8 w-8 rounded-full hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {showUserList && (
                <div className="space-y-2">
                  <Input 
                    placeholder="Cari pengguna..."
                    className="w-full"
                  />
                   <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                     {users.map((userData) => (
                       <div 
                         key={userData.user_id}
                         className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded-lg cursor-pointer transition-colors"
                         onClick={() => startDirectChat(userData.user_id)}
                       >
                         <div className="relative">
                           <Avatar className="h-8 w-8 border-2 border-background shadow-md">
                             <AvatarImage src={userData.avatar_url} />
                             <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-accent text-white">
                               {getUserInitials(userData.full_name)}
                             </AvatarFallback>
                           </Avatar>
                           <OnlineStatus 
                             isOnline={userData.is_online} 
                             className="absolute -bottom-0.5 -right-0.5 border border-background" 
                           />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-1">
                             <span className="text-sm font-medium truncate">
                               {userData.full_name}
                             </span>
                             {getRoleIcon(userData.role)}
                           </div>
                           <OnlineStatus 
                             isOnline={userData.is_online}
                             lastSeen={userData.last_seen}
                             showText
                             className="text-xs"
                           />
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-350px)] custom-scrollbar">
                <div className="space-y-1 p-2">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                        activeChat === chat.id 
                          ? 'bg-primary/10 border-r-4 border-primary shadow-sm' 
                          : 'hover:bg-muted/30'
                      }`}
                      onClick={() => setActiveChat(chat.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                            {chat.chat_type === 'direct' ? (
                              <>
                                <AvatarImage src={chat.participants.find(p => p.user_id !== user?.id)?.profiles.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-medium">
                                  {getUserInitials(getChatDisplayName(chat))}
                                </AvatarFallback>
                              </>
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                                <Users className="h-6 w-6" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          {chat.chat_type === 'direct' && (
                            <OnlineStatus 
                              isOnline={chat.participants.find(p => p.user_id !== user?.id)?.profiles.is_online}
                              className="absolute -bottom-0.5 -right-0.5 border-2 border-background"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold truncate text-sm">{getChatDisplayName(chat)}</h4>
                              {chat.chat_type === 'direct' && (
                                <div className="flex items-center">
                                  {getRoleIcon(chat.participants.find(p => p.user_id !== user?.id)?.profiles.role || '')}
                                </div>
                              )}
                            </div>
                            {chat.last_message && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(chat.last_message.created_at), 'HH:mm', { locale: id })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            {chat.last_message && (
                              <p className="text-sm text-muted-foreground truncate flex-1">
                                {chat.last_message.sender_name}: {chat.last_message.content}
                              </p>
                            )}
                            {chat.unread_count > 0 && (
                              <Badge variant="destructive" className="min-w-5 h-5 text-xs px-1.5 ml-2 bg-primary hover:bg-primary/90">
                                {chat.unread_count > 99 ? '99+' : chat.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {chats.length === 0 && (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Belum ada chat</p>
                      <p className="text-sm text-muted-foreground">Klik tombol + untuk memulai chat</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Messages - WhatsApp Style */}
        <div className="flex-1">
          <Card className="h-full border-0 shadow-lg rounded-xl overflow-hidden">
            {activeChat ? (
              <>
                <CardHeader className="whatsapp-header border-b p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-background shadow-md">
                        {chats.find(c => c.id === activeChat)?.chat_type === 'direct' ? (
                          <>
                            <AvatarImage src={chats.find(c => c.id === activeChat)?.participants.find(p => p.user_id !== user?.id)?.profiles.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-medium">
                              {getUserInitials(getChatDisplayName(chats.find(c => c.id === activeChat) || {} as Chat))}
                            </AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                            <Users className="h-5 w-5" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {chats.find(c => c.id === activeChat)?.chat_type === 'direct' && (
                        <OnlineStatus 
                          isOnline={chats.find(c => c.id === activeChat)?.participants.find(p => p.user_id !== user?.id)?.profiles.is_online}
                          className="absolute -bottom-0.5 -right-0.5 border-2 border-background"
                        />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {getChatDisplayName(chats.find(c => c.id === activeChat) || {} as Chat)}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {chats.find(c => c.id === activeChat)?.chat_type === 'direct' 
                          ? (chats.find(c => c.id === activeChat)?.participants.find(p => p.user_id !== user?.id)?.profiles.is_online ? 'Online' : 'Terakhir dilihat baru-baru ini')
                          : `${chats.find(c => c.id === activeChat)?.participants.length} peserta`
                        }
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col h-[calc(100vh-350px)] p-0">
                  <div className="flex-1 overflow-hidden relative">
                    <div className="whatsapp-bg" />
                    <ScrollArea className="h-full px-4 chat-scrollbar relative z-10">
                      <div className="space-y-3 py-4">
                        {messages.map((message, index) => {
                          const previousMessage = index > 0 ? messages[index - 1] : undefined;
                          const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
                          const messageReactions = getReactionsForMessage(message.id);

                          return (
                            <div key={message.id}>
                              {showDateSeparator && (
                                <div className="text-center py-2 text-xs text-muted-foreground">
                                  {formatMessageDate(message.created_at)}
                                </div>
                              )}
                              <div
                                className={`flex gap-2 ${
                                  message.sender_id === user?.id ? 'flex-row-reverse' : ''
                                }`}
                              >
                                {message.sender_id !== user?.id && (
                                  <Avatar className="h-8 w-8 border border-background shadow-sm">
                                    <AvatarImage src={message.sender.avatar_url} />
                                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-accent text-white">
                                      {getUserInitials(message.sender.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className={`max-w-xs lg:max-w-md ${
                                  message.sender_id === user?.id ? 'text-right' : ''
                                }`}>
                                  {message.sender_id !== user?.id && (
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                      <span className="text-xs font-medium text-primary">
                                        {message.sender.full_name}
                                      </span>
                                      {getRoleIcon(message.sender.role)}
                                    </div>
                                  )}
                                   <div className={`
                                     relative px-3 py-2 rounded-2xl shadow-sm message-bubble group
                                     ${message.sender_id === user?.id 
                                       ? 'bg-[#00A693] text-white rounded-br-md ml-auto'
                                       : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md mr-auto'
                                     }
                                     max-w-[80vw] lg:max-w-md
                                   `}>
                                    {/* Reply display */}
                                    {message.reply_to && (
                                      <ReplyDisplay 
                                        repliedMessage={{
                                          id: message.id,
                                          content: message.content,
                                          sender: message.sender
                                        }}
                                        className="mb-2"
                                      />
                                    )}
                                    
                                     {/* Message content */}
                                     <div className="break-words">
                                       {/* Check if message has file_url (uploaded file) */}
                                       {message.file_url && isImageFile(message.file_url) ? (
                                         <div className="space-y-2">
                                           <MessageImage
                                             src={message.file_url}
                                             alt={message.content.replace('📎 ', '') || "Shared image"}
                                             isOwnMessage={message.sender_id === user?.id}
                                           />
                                           {message.content && !message.content.startsWith('📎') && (
                                             <p className="text-sm leading-relaxed mt-2">{message.content}</p>
                                           )}
                                         </div>
                                       ) : message.file_url && !isImageFile(message.file_url) ? (
                                         <div className="space-y-2">
                                           <div className={`text-sm ${message.sender_id === user?.id ? 'text-white/80' : 'text-gray-600'}`}>
                                             📎 {message.content.replace('📎 ', '') || 'File'}
                                           </div>
                                           <a 
                                             href={message.file_url} 
                                             target="_blank" 
                                             rel="noopener noreferrer"
                                             className={`inline-flex items-center gap-2 p-2 rounded-lg transition-colors ${
                                               message.sender_id === user?.id 
                                                 ? 'bg-white/20 hover:bg-white/30 text-white' 
                                                 : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                                             }`}
                                           >
                                             <File className="h-4 w-4" />
                                             <span className="text-sm">Download File</span>
                                           </a>
                                         </div>
                                       ) : message.content.startsWith('📎') ? (
                                         <div className="space-y-2">
                                           <div className={`text-sm ${message.sender_id === user?.id ? 'text-white/80' : 'text-gray-600'}`}>
                                             {message.content.replace('📎 ', '')}
                                           </div>
                                           <div className={`text-xs ${message.sender_id === user?.id ? 'text-white/60' : 'text-gray-500'}`}>
                                             File tidak dapat ditampilkan
                                           </div>
                                         </div>
                                       ) : (
                                         <p className="text-sm leading-relaxed">{message.content}</p>
                                       )}
                                     </div>
                                    
                                    {/* Reactions */}
                                    <ReactionDisplay 
                                      reactions={messageReactions}
                                      className="mt-2"
                                    />
                                    
                                    <div className={`
                                      flex items-center justify-end gap-1 mt-1
                                      ${message.sender_id === user?.id 
                                        ? 'text-white/70' 
                                        : 'text-gray-400'
                                      }
                                    `}>
                                      <span className="text-[10px]">
                                        {format(new Date(message.created_at), 'HH:mm', { locale: id })}
                                      </span>
                                      {message.sender_id === user?.id && (
                                        <MessageStatus 
                                          status={message.status || 'read'} 
                                          className="ml-1"
                                        />
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Message actions */}
                                  <div className={`
                                    flex items-center gap-1 mt-1 px-1
                                    ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}
                                  `}>
                                    <MessageReactions
                                      messageId={message.id}
                                      reactions={messageReactions}
                                      onReact={handleReaction}
                                      onRemoveReaction={handleRemoveReaction}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleReplyToMessage(message)}
                                      className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
                                    >
                                      <Reply className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <TypingIndicator typingUsers={typingUsers} />
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <div className="border-t bg-background/95 backdrop-blur p-4">
                    {/* Reply message display */}
                    {repliedMessage && (
                      <ReplyMessage
                        repliedMessage={repliedMessage}
                        onCancel={clearReply}
                        className="mb-3"
                      />
                    )}
                    
                     {/* File attachments preview */}
                     {attachedFiles.length > 0 && (
                       <div className="flex flex-wrap gap-2 mb-3">
                         {attachedFiles.map((file, index) => (
                           <div key={index}>
                             {file.type.startsWith('image/') ? (
                               <ImagePreview
                                 file={file}
                                 onRemove={() => handleFileRemove(index)}
                               />
                             ) : (
                               <FilePreview
                                 file={file}
                                 onRemove={() => handleFileRemove(index)}
                               />
                             )}
                           </div>
                         ))}
                       </div>
                     )}
                    
                    {/* Voice messages preview */}
                    {voiceMessages.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {voiceMessages.map((voice, index) => (
                          <VoiceMessage
                            key={voice.id}
                            audioURL={voice.audioURL}
                            duration={voice.duration}
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2 items-end">
                      <EmojiPickerComponent
                        onEmojiClick={handleEmojiClick}
                      />
                      <FileAttachment
                        onFileSelect={handleFileSelect}
                      />
                      <Input
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        placeholder="Ketik pesan..."
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        disabled={sending}
                        className="whatsapp-input flex-1 resize-none min-h-[40px] max-h-[120px]"
                      />
                      {newMessage.trim() || attachedFiles.length > 0 || voiceMessages.length > 0 ? (
                         <Button 
                           onClick={handleSendMessage} 
                           disabled={sending}
                           size="icon"
                           className="rounded-full h-10 w-10 shadow-md hover:shadow-lg transition-all bg-[#00A693] hover:bg-[#008F7A]"
                         >
                          <Send className="h-4 w-4" />
                        </Button>
                      ) : (
                        <VoiceRecorder
                          onVoiceRecord={handleVoiceRecord}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="text-center">
                  <div className="p-6 bg-primary/10 rounded-full mb-6 mx-auto w-fit">
                    <MessageCircle className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Mulai Percakapan</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Pilih chat dari daftar sebelah kiri atau klik tombol + untuk memulai percakapan baru
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;