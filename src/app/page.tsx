"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Camera, StopCircle, Video, Download, Pause, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const ScreenRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer logic
  useEffect(() => {
    if (recording && !paused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recording, paused]);

  // Countdown logic
  useEffect(() => {
    if (countdown > 0) {
      const countdownInterval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else if (countdown === 0 && mediaRecorderRef.current === null) {
      initiateRecording();
    }
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hrs > 0) parts.push(hrs.toString().padStart(2, '0'));
    parts.push(mins.toString().padStart(2, '0'));
    parts.push(secs.toString().padStart(2, '0'));
    
    return parts.join(':');
  };

  const initiateRecording = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const loopbackDevice = devices.find(
        (device) => device.kind === "audioinput" && device.label.includes("Loopback")
      );

      let audioStream;
      if (loopbackDevice) {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: loopbackDevice.deviceId,
          },
        });
      } else {
        console.warn("Loopback device not found, defaulting to microphone.");
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      const tracks = [
        ...displayStream.getTracks(),
        ...(audioStream?.getTracks() || [])
      ];
      const combinedStream = new MediaStream(tracks);

      streamRef.current = combinedStream;
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        tracks.forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setRecording(true);
      setPaused(false);
      setError('');
    } catch (err) {
      setError('Failed to start recording. Please ensure you have granted necessary permissions.');
      setCountdown(0);
    }
  };

  const startRecording = () => {
    setElapsedTime(0);
    setCountdown(3); // 3 second countdown
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setPaused(false);
    }
  };

  const togglePause = () => {
    if (mediaRecorderRef.current && recording) {
      if (paused) {
        mediaRecorderRef.current.resume();
        setPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setPaused(true);
      }
    }
  };

  const downloadVideo = () => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screen-recording-${new Date().toISOString()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          {countdown > 0 ? (
            <div className="text-6xl font-bold text-blue-500 animate-pulse">
              {countdown}
            </div>
          ) : (
            <div className="text-2xl font-mono">
              {formatTime(elapsedTime)}
            </div>
          )}
          
          <div className="flex justify-center space-x-4">
            {!recording && !videoBlob && !countdown && (
              <Button onClick={startRecording} className="flex items-center space-x-2">
                <Video className="w-4 h-4" />
                <span>Start Recording</span>
              </Button>
            )}
            
            {recording && (
              <>
                <Button 
                  onClick={togglePause} 
                  variant="outline" 
                  className="flex items-center space-x-2"
                >
                  {paused ? (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={stopRecording} 
                  variant="destructive" 
                  className="flex items-center space-x-2"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Stop Recording</span>
                </Button>
              </>
            )}
            
            {videoBlob && (
              <Button 
                onClick={downloadVideo} 
                variant="outline" 
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Recording</span>
              </Button>
            )}
          </div>
        </div>

        {videoBlob && (
          <div className="mt-4">
            <video 
              src={URL.createObjectURL(videoBlob)} 
              controls 
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-500">
          {recording ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>{paused ? "Recording paused" : "Recording in progress..."}</span>
            </div>
          ) : countdown > 0 ? (
            <p className="text-center">Get ready to record...</p>
          ) : (
            <p className="text-center">Click "Start Recording" to begin capturing your screen</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreenRecorder;