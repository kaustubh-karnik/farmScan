/**
 * Offline Plant Disease Classifier using TensorFlow.js
 * Loads and runs the MobileNetV2 model completely offline in the browser
 */

import * as tf from '@tensorflow/tfjs';

// Disease labels mapping
const DISEASE_LABELS = [
  'bellpepper_anthracnose',
  'bellpepper_bacterial_spot',
  'bellpepper_healthy',
  'potato_early_blight',
  'potato_healthy',
  'potato_late_blight',
  'tomato_bacterial_spot',
  'tomato_early_blight',
  'tomato_healthy',
  'tomato_late_blight',
  'tomato_leaf_mold',
];

// Disease information database
const DISEASE_INFO: Record<string, {
  displayName: string;
  severity: 'low' | 'medium' | 'high';
  treatment: string;
  description: string;
}> = {
  bellpepper_anthracnose: {
    displayName: 'Bell Pepper Anthracnose',
    severity: 'high',
    treatment: 'Apply copper-based fungicides. Remove infected fruits. Improve air circulation.',
    description: 'Fungal disease causing dark, sunken lesions on peppers.',
  },
  bellpepper_bacterial_spot: {
    displayName: 'Bell Pepper Bacterial Spot',
    severity: 'high',
    treatment: 'Use copper-based bactericides. Remove infected plants. Practice crop rotation.',
    description: 'Bacterial infection causing dark spots on leaves and fruits.',
  },
  bellpepper_healthy: {
    displayName: 'Healthy Bell Pepper',
    severity: 'low',
    treatment: 'No treatment needed. Continue regular care and monitoring.',
    description: 'Plant shows no signs of disease. Maintain good practices.',
  },
  potato_early_blight: {
    displayName: 'Potato Early Blight',
    severity: 'high',
    treatment: 'Apply fungicides. Remove infected leaves. Ensure proper spacing for airflow.',
    description: 'Fungal disease causing brown spots with concentric rings on leaves.',
  },
  potato_healthy: {
    displayName: 'Healthy Potato',
    severity: 'low',
    treatment: 'No treatment needed. Continue regular care and monitoring.',
    description: 'Plant shows no signs of disease. Maintain good practices.',
  },
  potato_late_blight: {
    displayName: 'Potato Late Blight',
    severity: 'high',
    treatment: 'Apply systemic fungicides immediately. Remove all infected plants. Destroy crop residues.',
    description: 'Severe fungal disease that can destroy entire crops quickly.',
  },
  tomato_bacterial_spot: {
    displayName: 'Tomato Bacterial Spot',
    severity: 'high',
    treatment: 'Use copper-based bactericides. Remove infected plants. Avoid overhead watering.',
    description: 'Bacterial infection causing dark spots on leaves, stems, and fruits.',
  },
  tomato_early_blight: {
    displayName: 'Tomato Early Blight',
    severity: 'high',
    treatment: 'Apply fungicides. Remove lower infected leaves. Mulch around plants.',
    description: 'Fungal disease causing brown spots with target-like patterns.',
  },
  tomato_healthy: {
    displayName: 'Healthy Tomato',
    severity: 'low',
    treatment: 'No treatment needed. Continue regular care and monitoring.',
    description: 'Plant shows no signs of disease. Maintain good practices.',
  },
  tomato_late_blight: {
    displayName: 'Tomato Late Blight',
    severity: 'high',
    treatment: 'Apply systemic fungicides immediately. Remove infected plants. Improve drainage.',
    description: 'Severe fungal disease that spreads rapidly in humid conditions.',
  },
  tomato_leaf_mold: {
    displayName: 'Tomato Leaf Mold',
    severity: 'medium',
    treatment: 'Improve ventilation. Apply fungicides. Remove infected leaves.',
    description: 'Fungal disease causing yellow spots on upper leaf surfaces.',
  },
};

export interface ClassificationResult {
  disease: string;
  displayName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  treatment: string;
  description: string;
  allPredictions: Array<{
    label: string;
    confidence: number;
  }>;
}

class OfflineClassifier {
  private model: tf.LayersModel | null = null;
  private modelLoading: Promise<tf.LayersModel> | null = null;
  private isInitialized = false;

  /**
   * Initialize TensorFlow.js backend
   */
  private async initializeBackend(): Promise<void> {
    try {
      // Try WebGL first for better performance
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('✅ TensorFlow.js WebGL backend initialized');
    } catch (error) {
      console.warn('⚠️ WebGL backend failed, falling back to CPU:', error);
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        console.log('✅ TensorFlow.js CPU backend initialized');
      } catch (cpuError) {
        throw new Error('Failed to initialize TensorFlow.js: ' + cpuError);
      }
    }
  }

  /**
   * Load the model from the public directory
   */
  async loadModel(): Promise<tf.LayersModel> {
    // Return existing model if already loaded
    if (this.model) {
      return this.model;
    }

    // Return ongoing loading promise if already loading
    if (this.modelLoading) {
      return this.modelLoading;
    }

    // Start loading
    this.modelLoading = (async () => {
      try {
        console.log('🔄 Loading plant disease classification model...');

        // Initialize backend first
        if (!this.isInitialized) {
          await this.initializeBackend();
          this.isInitialized = true;
        }

        // Load model from public directory
        const modelPath = '/models/image-classifier/model.json';
        
        // First, verify the model file is accessible
        console.log('📡 Checking model availability at:', modelPath);
        
        let model: tf.LayersModel;
        
        try {
          // Fetch and fix model JSON for Keras 3 compatibility
          const response = await fetch(modelPath);
          if (!response.ok) {
            throw new Error(`Model file not found: ${response.status} ${response.statusText}`);
          }
          const modelJson = await response.json();
          console.log('✅ Model JSON loaded:', modelJson.format, modelJson.generatedBy);
          
          // Fix Keras 3.x InputLayer compatibility issue
          if (modelJson.modelTopology?.model_config?.layers) {
            modelJson.modelTopology.model_config.layers.forEach((layer: {
              class_name?: string;
              config?: {
                batch_shape?: number[];
                input_shape?: number[];
                batchInputShape?: number[];
              };
            }) => {
              if (layer.class_name === 'InputLayer' && layer.config?.batch_shape) {
                // TensorFlow.js expects 'batchInputShape' instead of 'batch_shape'
                if (!layer.config.batchInputShape) {
                  layer.config.batchInputShape = layer.config.batch_shape;
                  console.log('🔧 Fixed InputLayer config for TF.js compatibility');
                }
              }
            });
          }
          
          // Load weights manifest
          const weightsManifest = modelJson.weightsManifest;
          const weightSpecs = weightsManifest[0].weights;
          const weightDataPaths = weightsManifest[0].paths.map((path: string) => 
            `/models/image-classifier/${path}`
          );
          
          // Fetch weight data
          const weightDataBuffers = await Promise.all(
            weightDataPaths.map(async (path: string) => {
              const res = await fetch(path);
              return res.arrayBuffer();
            })
          );
          
          // Concatenate weight data
          const totalBytes = weightDataBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
          const concatenatedWeights = new Uint8Array(totalBytes);
          let offset = 0;
          for (const buffer of weightDataBuffers) {
            concatenatedWeights.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
          }
          
          // Create model artifacts with fixed topology
          const modelArtifacts = {
            modelTopology: modelJson.modelTopology,
            weightSpecs: weightSpecs,
            weightData: concatenatedWeights.buffer,
            format: modelJson.format,
            generatedBy: modelJson.generatedBy,
            convertedBy: modelJson.convertedBy,
            trainingConfig: modelJson.trainingConfig,
          };
          
          // Load model from memory with fixed artifacts
          console.log('🔄 Loading model layers with compatibility fixes...');
          model = await tf.loadLayersModel(tf.io.fromMemory(modelArtifacts));
          
        } catch (fetchError) {
          console.error('❌ Failed to load model:', fetchError);
          // Fallback: try direct loading (might still fail)
          console.log('⚠️ Attempting direct model loading as fallback...');
          model = await tf.loadLayersModel(modelPath);
        }

        // Verify model structure
        if (!model.inputs || !model.outputs) {
          throw new Error('Invalid model structure: missing inputs or outputs');
        }

        console.log('✅ Model loaded successfully');
        console.log('📊 Model input shape:', model.inputs[0].shape);
        console.log('📊 Model output shape:', model.outputs[0].shape);
        console.log('📊 Total layers:', model.layers.length);

        // Warm up the model with a dummy inference
        console.log('🔥 Warming up model...');
        const dummyInput = tf.zeros([1, 224, 224, 3]);
        const dummyOutput = model.predict(dummyInput) as tf.Tensor;
        dummyInput.dispose();
        dummyOutput.dispose();
        console.log('✅ Model warm-up complete');

        this.model = model;
        return model;
      } catch (error) {
        console.error('❌ Failed to load model:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        
        this.modelLoading = null;
        
        // Provide more helpful error message
        if (error instanceof Error) {
          if (error.message.includes('not found') || error.message.includes('404')) {
            throw new Error('Model files not found. Please ensure the model files are in the public/models/image-classifier directory.');
          } else if (error.message.includes('CORS') || error.message.includes('network')) {
            throw new Error('Network error loading model. Please check your connection and try again.');
          } else if (error.message.includes('InputLayer')) {
            throw new Error('Model format error. The model may be corrupted or incompatible.');
          } else {
            throw new Error(`Failed to load model: ${error.message}`);
          }
        }
        
        throw new Error('Failed to load classification model. Please try again later.');
      }
    })();

    return this.modelLoading;
  }

  /**
   * Preprocess image for model input
   */
  private preprocessImage(imageElement: HTMLImageElement | HTMLVideoElement): tf.Tensor4D {
    return tf.tidy(() => {
      // Convert image to tensor
      const tensor = tf.browser.fromPixels(imageElement);

      // Resize to 224x224 (MobileNetV2 input size)
      const resized = tf.image.resizeBilinear(tensor, [224, 224]);

      // Normalize to [-1, 1] range (MobileNetV2 preprocessing)
      const normalized = tf.div(resized, 127.5).sub(1);

      // Add batch dimension
      const batched = normalized.expandDims(0) as tf.Tensor4D;

      return batched;
    });
  }

  /**
   * Classify an image
   */
  async classifyImage(imageSource: string | HTMLImageElement | HTMLVideoElement): Promise<ClassificationResult> {
    try {
      // Ensure model is loaded
      const model = await this.loadModel();

      let imageElement: HTMLImageElement | HTMLVideoElement;

      // Handle different input types
      if (typeof imageSource === 'string') {
        // Load image from data URL or URL
        imageElement = await this.loadImageFromUrl(imageSource);
      } else {
        imageElement = imageSource;
      }

      // Preprocess image
      const preprocessed = this.preprocessImage(imageElement);

      // Run inference
      console.log('🔍 Running inference...');
      const predictions = model.predict(preprocessed) as tf.Tensor;
      const probabilities = await predictions.data();

      // Clean up tensors
      preprocessed.dispose();
      predictions.dispose();

      // Get all predictions sorted by confidence
      const allPredictions = Array.from(probabilities)
        .map((confidence, index) => ({
          label: DISEASE_LABELS[index],
          confidence: confidence * 100,
        }))
        .sort((a, b) => b.confidence - a.confidence);

      // Get top prediction
      const topPrediction = allPredictions[0];
      const diseaseKey = topPrediction.label;
      const diseaseInfo = DISEASE_INFO[diseaseKey];

      console.log('✅ Classification complete:', topPrediction);
      console.log('📊 Top 3 predictions:', allPredictions.slice(0, 3));

      return {
        disease: diseaseKey,
        displayName: diseaseInfo.displayName,
        confidence: topPrediction.confidence,
        severity: diseaseInfo.severity,
        treatment: diseaseInfo.treatment,
        description: diseaseInfo.description,
        allPredictions,
      };
    } catch (error) {
      console.error('❌ Classification error:', error);
      throw new Error('Failed to classify image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Load image from URL
   */
  private loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.src = url;
    });
  }

  /**
   * Classify from webcam stream
   */
  async classifyFromWebcam(videoElement: HTMLVideoElement): Promise<ClassificationResult> {
    // Check if video is ready
    if (videoElement.readyState < 2) {
      throw new Error('Video element is not ready');
    }

    return this.classifyImage(videoElement);
  }

  /**
   * Get memory usage
   */
  getMemoryInfo(): { numTensors: number; numBytes: number } {
    return {
      numTensors: tf.memory().numTensors,
      numBytes: tf.memory().numBytes,
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.modelLoading = null;
  }
}

// Singleton instance
const classifierInstance = new OfflineClassifier();

export default classifierInstance;

// Export utility functions
export const loadModel = () => classifierInstance.loadModel();
export const classifyImage = (imageSource: string | HTMLImageElement | HTMLVideoElement) => 
  classifierInstance.classifyImage(imageSource);
export const classifyFromWebcam = (videoElement: HTMLVideoElement) => 
  classifierInstance.classifyFromWebcam(videoElement);
export const getMemoryInfo = () => classifierInstance.getMemoryInfo();
export const disposeModel = () => classifierInstance.dispose();
