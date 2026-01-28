'use client';

import React, { useRef, useState, useCallback, useEffect, ChangeEvent } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, AlertCircle, Loader2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import offlineClassifier, { type ClassificationResult } from '@/lib/offline-classifier';

interface ScanResult {
  disease: string;
  confidence: number;
  treatment: string;
  severity: 'low' | 'medium' | 'high';
}

interface DiseaseScannerProps {
  onResult: (result: ScanResult) => void;
  onClose: () => void;
}

export function DiseaseScanner({ onResult, onClose }: DiseaseScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<string>('');
  const { t } = useI18n();

  // Load model on mount
  useEffect(() => {
    const initModel = async () => {
      try {
        setIsModelLoading(true);
        setScanProgress(t('scanner.loadingModel', 'Loading AI model...'));
        await offlineClassifier.loadModel();
        setScanProgress(t('scanner.modelReady', 'Model ready'));
        setIsModelLoading(false);
      } catch (err) {
        console.error('Failed to load model:', err);
        setError(err instanceof Error ? err.message : 'Failed to load AI model');
        setIsModelLoading(false);
      }
    };

    initModel();

    // Cleanup on unmount
    return () => {
      // Don't dispose model as it might be used again
      // offlineClassifier.disposeModel();
    };
  }, []);

  const handleCapture = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setScanProgress(t('scanner.capturingImage', 'Capturing image...'));

      // Get video element from webcam
      const video = webcamRef.current?.video;
      if (!video) {
        throw new Error(t('scanner.noCamera', 'Camera not available'));
      }

      // Wait for video to be ready
      if (video.readyState < 2) {
        throw new Error(t('scanner.cameraNotReady', 'Camera is not ready yet'));
      }

      setScanProgress(t('scanner.analyzingPlant', 'Analyzing plant...'));

      // Run classification
      const result: ClassificationResult = await offlineClassifier.classifyFromWebcam(video);

      console.log('Classification result:', result);
      
      // Show progress with detected disease
      setScanProgress(`Detected: ${result.displayName} (${result.confidence.toFixed(1)}%)`);

      // Wait a moment to show the result
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return result
      onResult({
        disease: result.displayName,
        confidence: result.confidence,
        treatment: result.treatment,
        severity: result.severity,
      });
    } catch (err) {
      console.error('Classification error:', err);
      setError(
        err instanceof Error
          ? err.message
          : t('scanner.errorClassification', 'Failed to analyze image')
      );
      setScanProgress('');
    } finally {
      setIsLoading(false);
    }
  }, [onResult, t]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setIsLoading(true);
        setError(null);
        setScanProgress(t('scanner.loadingImage', 'Loading image...'));

        // Read file as data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(file);
        });

        setScanProgress(t('scanner.analyzingPlant', 'Analyzing plant...'));

        const result: ClassificationResult = await offlineClassifier.classifyImage(
          dataUrl
        );

        setScanProgress(
          `Detected: ${result.displayName} (${result.confidence.toFixed(1)}%)`
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        onResult({
          disease: result.displayName,
          confidence: result.confidence,
          treatment: result.treatment,
          severity: result.severity,
        });
      } catch (err) {
        console.error('Classification error:', err);
        setError(
          err instanceof Error
            ? err.message
            : t('scanner.errorClassification', 'Failed to analyze image')
        );
        setScanProgress('');
      } finally {
        setIsLoading(false);
        // reset input so same file can be selected again
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    [onResult, t]
  );

  const videoConstraints = {
    facingMode: 'environment',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl overflow-hidden max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 bg-opacity-80 p-4 flex justify-between items-center absolute top-0 left-0 right-0 z-10">
          <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${
            isModelLoading ? 'bg-yellow-500' : isLoading ? 'bg-emerald-500' : 'bg-blue-500'
          }`}>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="text-white text-xs font-semibold">
              {isModelLoading
                ? `⚡ ${t('scanner.loadingModel', 'Loading AI...')}`
                : isLoading
                ? `🔍 ${t('scanner.scanning', 'Scanning...')}`
                : `✓ ${t('scanner.modelReady', 'Ready')}`}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-white hover:bg-gray-700 p-2 rounded-lg transition-colors disabled:opacity-50 bg-gray-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Camera Feed */}
        <div className="relative bg-black aspect-[3/4] min-h-[500px]">
          {!error ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4 p-6">
              <AlertCircle className="w-16 h-16 text-red-500" />
              <p className="text-center text-red-400 font-semibold">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsModelLoading(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                {t('scanner.retry', 'Try Again')}
              </button>
            </div>
          )}

          {/* Target Frame Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
              
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 border-2 border-emerald-400 rounded-full"></div>
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-400 transform -translate-y-1/2"></div>
                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-emerald-400 transform -translate-x-1/2"></div>
              </div>

              {/* Scanning line animation */}
              {isLoading && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan"></div>
                </div>
              )}
            </div>
          </div>

          {/* Scanning Progress */}
          {(isLoading || isModelLoading) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col items-center justify-end pb-20">
              <div className="bg-emerald-500 bg-opacity-90 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
                <div className="flex items-center gap-3 justify-center mb-2">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <div className="text-white font-bold text-lg">
                    {scanProgress || t('scanner.processing', 'Processing...')}
                  </div>
                </div>
                {!isModelLoading && (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-full bg-emerald-700 rounded-full h-2 max-w-[200px]">
                      <div className="bg-white h-2 rounded-full animate-pulse" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom instruction text */}
        {!isLoading && !isModelLoading && !error && (
          <div className="absolute bottom-20 left-0 right-0 text-center px-4">
            <p className="text-white text-sm bg-black bg-opacity-50 backdrop-blur-sm rounded-lg py-2 px-4 inline-block">
              {t('scanner.subtitle', 'Position leaf within the frame')}
            </p>
          </div>
        )}

        {/* Model Loading Message */}
        {isModelLoading && !error && (
          <div className="absolute bottom-20 left-0 right-0 text-center px-4">
            <div className="text-white text-sm bg-blue-600 bg-opacity-90 backdrop-blur-sm rounded-lg py-3 px-4 inline-block">
              <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
              {t('scanner.loadingModel', 'Loading AI model...')}
            </div>
          </div>
        )}

        {/* Capture & Gallery Buttons */}
        {!isLoading && !isModelLoading && !error && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 items-center px-4">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-white/90 text-gray-900 text-xs font-semibold shadow hover:bg-white transition-colors"
              >
                {t('scanner.gallery', 'Gallery / Files')}
              </button>
              <p className="text-[10px] text-gray-300">
                {t('scanner.galleryHint', 'Use saved leaf photo')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <button
              onClick={handleCapture}
              disabled={isLoading || isModelLoading}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center">
                <Camera className="w-7 h-7 text-white" />
              </div>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(256px);
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
