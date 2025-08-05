import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onVoiceRecord: (audioBlob: Blob) => void;
  className?: string;
}

export function VoiceRecorder({ onVoiceRecord, className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        
        // Create audio element to get duration
        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon sudah diberikan.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const playRecording = () => {
    if (audioURL && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    setAudioURL(null);
    setDuration(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const sendRecording = () => {
    if (audioURL) {
      fetch(audioURL)
        .then(response => response.blob())
        .then(blob => {
          onVoiceRecord(blob);
          deleteRecording();
        });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioURL) {
    return (
      <div className={cn("flex items-center gap-2 p-2 bg-gray-50 rounded-lg", className)}>
        <audio
          ref={audioRef}
          src={audioURL}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
        />
        
        <Button
          size="icon"
          variant="ghost"
          onClick={playRecording}
          className="h-8 w-8"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <div className="flex-1">
          <div className="text-sm font-medium">Voice Message</div>
          <div className="text-xs text-gray-500">{formatDuration(duration)}</div>
        </div>
        
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={deleteRecording}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={sendRecording}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Kirim
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={isRecording ? stopRecording : startRecording}
      className={cn(
        "rounded-full h-10 w-10 transition-all",
        isRecording 
          ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
          : "hover:bg-gray-100",
        className
      )}
    >
      {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5 text-gray-500" />}
    </Button>
  );
}

// Component untuk menampilkan voice message yang sudah dikirim
interface VoiceMessageProps {
  audioURL: string;
  duration: number;
  className?: string;
}

export function VoiceMessage({ audioURL, duration, className }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-3 p-3 bg-gray-50 rounded-lg", className)}>
      <audio
        ref={audioRef}
        src={audioURL}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
      />
      
      <Button
        size="icon"
        variant="ghost"
        onClick={playAudio}
        className="h-10 w-10"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>
      
      <div className="flex-1">
        <div className="text-sm font-medium">Voice Message</div>
        <div className="text-xs text-gray-500">{formatDuration(duration)}</div>
      </div>
    </div>
  );
} 