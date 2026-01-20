import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  processingTimeMs: number;
  pageCount?: number;
}

export interface ProcessingProgress {
  status: string;
  progress: number;
}

export type OCRMode = 'printed' | 'handwritten';

export interface PreprocessingOptions {
  grayscale?: boolean;
  denoise?: boolean;
  contrast?: boolean;
  threshold?: boolean;
  adaptiveThreshold?: boolean;
  sharpen?: boolean;
  deskew?: boolean;
  morphology?: boolean;
  mode?: OCRMode;
  contrastFactor?: number;
  adaptiveBlockSize?: number;
  adaptiveC?: number;
  // Enhanced accuracy options
  upscale?: boolean;
  bilateralFilter?: boolean;
  unsharpMask?: boolean;
}

/**
 * Image preprocessing functions using Canvas API
 * These simulate OpenCV-style preprocessing in the browser
 */
export class ImagePreprocessor {
  /**
   * Convert image to grayscale
   */
  static toGrayscale(imageData: ImageData): ImageData {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = avg;     // R
      data[i + 1] = avg; // G
      data[i + 2] = avg; // B
    }
    return imageData;
  }

  /**
   * Apply thresholding (Otsu's method approximation)
   */
  static threshold(imageData: ImageData, thresholdValue?: number): ImageData {
    const data = imageData.data;
    
    // Calculate Otsu's threshold if not provided
    const threshold = thresholdValue ?? this.calculateOtsuThreshold(imageData);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      const value = gray > threshold ? 255 : 0;
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
    }
    return imageData;
  }

  /**
   * Calculate Otsu's optimal threshold value
   */
  static calculateOtsuThreshold(imageData: ImageData): number {
    const histogram = new Array(256).fill(0);
    const data = imageData.data;
    const totalPixels = data.length / 4;

    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
      histogram[Math.floor(data[i])]++;
    }

    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;

      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const variance = wB * wF * (mB - mF) * (mB - mF);
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }

    return threshold;
  }

  /**
   * Adaptive thresholding for better results with varying lighting
   * Enhanced for handwritten text recognition
   */
  static adaptiveThreshold(imageData: ImageData, blockSize: number = 15, c: number = 5): ImageData {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);
    const half = Math.floor(blockSize / 2);

    // Use integral image for faster computation
    const integral = this.computeIntegralImage(imageData);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - half);
        const y1 = Math.max(0, y - half);
        const x2 = Math.min(width - 1, x + half);
        const y2 = Math.min(height - 1, y + half);

        const count = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum = this.getIntegralSum(integral, x1, y1, x2, y2, width);
        const mean = sum / count - c;

        const idx = (y * width + x) * 4;
        const value = data[idx] > mean ? 255 : 0;
        output[idx] = value;
        output[idx + 1] = value;
        output[idx + 2] = value;
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Compute integral image for fast region sum calculation
   */
  static computeIntegralImage(imageData: ImageData): Float64Array {
    const { width, height, data } = imageData;
    const integral = new Float64Array((width + 1) * (height + 1));

    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        rowSum += data[idx];
        integral[(y + 1) * (width + 1) + (x + 1)] = 
          rowSum + integral[y * (width + 1) + (x + 1)];
      }
    }

    return integral;
  }

  /**
   * Get sum of pixels in a rectangle using integral image
   */
  static getIntegralSum(integral: Float64Array, x1: number, y1: number, x2: number, y2: number, width: number): number {
    const w = width + 1;
    return integral[(y2 + 1) * w + (x2 + 1)] - 
           integral[(y1) * w + (x2 + 1)] - 
           integral[(y2 + 1) * w + (x1)] + 
           integral[(y1) * w + (x1)];
  }

  /**
   * Detect skew angle using projection profile method
   */
  static detectSkewAngle(imageData: ImageData): number {
    const { width, height, data } = imageData;
    let bestAngle = 0;
    let maxVariance = 0;

    // Test angles from -15 to 15 degrees in 0.5 degree steps
    for (let angle = -15; angle <= 15; angle += 0.5) {
      const radians = (angle * Math.PI) / 180;
      const cosA = Math.cos(radians);
      const sinA = Math.sin(radians);

      // Calculate horizontal projection profile
      const profile = new Array(height).fill(0);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const newY = Math.round(x * sinA + y * cosA);
          if (newY >= 0 && newY < height) {
            const idx = (y * width + x) * 4;
            if (data[idx] < 128) { // Count dark pixels (text)
              profile[newY]++;
            }
          }
        }
      }

      // Calculate variance of the profile
      const mean = profile.reduce((a, b) => a + b, 0) / profile.length;
      const variance = profile.reduce((sum, val) => sum + (val - mean) ** 2, 0) / profile.length;

      if (variance > maxVariance) {
        maxVariance = variance;
        bestAngle = angle;
      }
    }

    return bestAngle;
  }

  /**
   * Deskew image based on detected angle
   */
  static deskew(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageData: ImageData): ImageData {
    const angle = this.detectSkewAngle(imageData);
    
    if (Math.abs(angle) < 0.5) {
      return imageData; // No significant skew detected
    }

    const { width, height } = canvas;
    const radians = (-angle * Math.PI) / 180;
    const cosA = Math.cos(radians);
    const sinA = Math.sin(radians);

    // Create temporary canvas for rotation
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Calculate new dimensions to fit rotated image
    const newWidth = Math.abs(width * cosA) + Math.abs(height * sinA);
    const newHeight = Math.abs(width * sinA) + Math.abs(height * cosA);
    
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    
    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, newWidth, newHeight);
    
    // Translate and rotate
    tempCtx.translate(newWidth / 2, newHeight / 2);
    tempCtx.rotate(radians);
    tempCtx.translate(-width / 2, -height / 2);
    
    // Draw original image
    tempCtx.putImageData(imageData, 0, 0);
    
    // Get the deskewed image data
    const deskewedData = tempCtx.getImageData(0, 0, newWidth, newHeight);
    
    // Update main canvas dimensions
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    return deskewedData;
  }

  /**
   * Morphological dilation - expands text strokes (good for thin handwriting)
   */
  static dilate(imageData: ImageData, kernelSize: number = 3): ImageData {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);
    const half = Math.floor(kernelSize / 2);

    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let minVal = 255;
        
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            minVal = Math.min(minVal, data[idx]);
          }
        }
        
        const idx = (y * width + x) * 4;
        output[idx] = minVal;
        output[idx + 1] = minVal;
        output[idx + 2] = minVal;
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Morphological erosion - thins text strokes (good for thick text)
   */
  static erode(imageData: ImageData, kernelSize: number = 3): ImageData {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);
    const half = Math.floor(kernelSize / 2);

    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let maxVal = 0;
        
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            maxVal = Math.max(maxVal, data[idx]);
          }
        }
        
        const idx = (y * width + x) * 4;
        output[idx] = maxVal;
        output[idx + 1] = maxVal;
        output[idx + 2] = maxVal;
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Morphological closing - dilate then erode (fills small gaps in text)
   */
  static closing(imageData: ImageData, kernelSize: number = 3): ImageData {
    let result = this.dilate(imageData, kernelSize);
    result = this.erode(result, kernelSize);
    return result;
  }

  /**
   * Morphological opening - erode then dilate (removes small noise)
   */
  static opening(imageData: ImageData, kernelSize: number = 3): ImageData {
    let result = this.erode(imageData, kernelSize);
    result = this.dilate(result, kernelSize);
    return result;
  }

  /**
   * Increase contrast
   */
  static increaseContrast(imageData: ImageData, factor: number = 1.5): ImageData {
    const data = imageData.data;
    const intercept = 128 * (1 - factor);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * data[i] + intercept));
      data[i + 1] = Math.min(255, Math.max(0, factor * data[i + 1] + intercept));
      data[i + 2] = Math.min(255, Math.max(0, factor * data[i + 2] + intercept));
    }
    return imageData;
  }

  /**
   * Simple noise reduction using box blur
   */
  static denoise(imageData: ImageData, radius: number = 1): ImageData {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let count = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4 + c;
              sum += data[idx];
              count++;
            }
          }

          const idx = (y * width + x) * 4 + c;
          output[idx] = sum / count;
        }
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Median filter for noise reduction (better for handwriting)
   */
  static medianFilter(imageData: ImageData, radius: number = 1): ImageData {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        for (let c = 0; c < 3; c++) {
          const values: number[] = [];

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4 + c;
              values.push(data[idx]);
            }
          }

          values.sort((a, b) => a - b);
          const idx = (y * width + x) * 4 + c;
          output[idx] = values[Math.floor(values.length / 2)];
        }
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Sharpen image for better edge detection
   */
  static sharpen(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let ki = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4 + c;
              sum += data[idx] * kernel[ki++];
            }
          }
          const idx = (y * width + x) * 4 + c;
          output[idx] = Math.min(255, Math.max(0, sum));
        }
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Unsharp mask for enhanced edge clarity
   */
  static unsharpMask(imageData: ImageData, amount: number = 1.5, radius: number = 1): ImageData {
    // First blur the image
    const blurred = this.denoise(imageData, radius);
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const original = data[i + c];
        const blurredVal = blurred.data[i + c];
        const sharpened = original + amount * (original - blurredVal);
        output[i + c] = Math.min(255, Math.max(0, sharpened));
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Bilateral filter - smooths while preserving edges (better than simple denoise)
   */
  static bilateralFilter(imageData: ImageData, radius: number = 3, sigmaColor: number = 30, sigmaSpace: number = 30): ImageData {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        for (let c = 0; c < 3; c++) {
          const centerIdx = (y * width + x) * 4 + c;
          const centerVal = data[centerIdx];
          let sum = 0;
          let weightSum = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4 + c;
              const val = data[idx];
              
              const spaceWeight = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaSpace * sigmaSpace));
              const colorWeight = Math.exp(-Math.pow(val - centerVal, 2) / (2 * sigmaColor * sigmaColor));
              const weight = spaceWeight * colorWeight;
              
              sum += val * weight;
              weightSum += weight;
            }
          }

          output[centerIdx] = Math.round(sum / weightSum);
        }
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Upscale image for better OCR accuracy on low-resolution images
   */
  static upscale(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageData: ImageData, factor: number = 2): ImageData {
    const { width, height } = imageData;
    const newWidth = width * factor;
    const newHeight = height * factor;

    // Put original image data
    ctx.putImageData(imageData, 0, 0);
    
    // Create temporary canvas for upscaling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Use bicubic-like interpolation
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.drawImage(canvas, 0, 0, width, height, 0, 0, newWidth, newHeight);
    
    // Update main canvas
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    return tempCtx.getImageData(0, 0, newWidth, newHeight);
  }

  /**
   * Get default preprocessing options for printed text
   */
  static getDefaultPrintedOptions(): PreprocessingOptions {
    return {
      grayscale: true,
      denoise: true,
      contrast: true,
      threshold: false,
      adaptiveThreshold: false,
      sharpen: true,
      deskew: false,
      morphology: false,
      mode: 'printed',
      contrastFactor: 1.3,
      upscale: false,
      bilateralFilter: false,
      unsharpMask: false,
    };
  }

  /**
   * Get default preprocessing options for handwritten text
   * Enhanced settings for better handwriting recognition
   */
  static getDefaultHandwrittenOptions(): PreprocessingOptions {
    return {
      grayscale: true,
      denoise: true,
      contrast: true,
      threshold: false,
      adaptiveThreshold: true,
      sharpen: false,
      deskew: true,
      morphology: true,
      mode: 'handwritten',
      contrastFactor: 1.8, // Increased contrast for handwriting
      adaptiveBlockSize: 31, // Larger block for handwritten strokes
      adaptiveC: 12, // Higher C value for better ink separation
      upscale: true, // Upscale for better recognition
      bilateralFilter: true,
      unsharpMask: true, // Add edge clarity
    };
  }

  /**
   * Apply full preprocessing pipeline with enhanced options
   */
  static async preprocess(
    file: File,
    options: PreprocessingOptions = {}
  ): Promise<string> {
    // Select defaults based on mode
    const defaults = options.mode === 'handwritten' 
      ? this.getDefaultHandwrittenOptions()
      : this.getDefaultPrintedOptions();
    
    const opts = { ...defaults, ...options };

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Step 0: Upscale first for better small text recognition (especially handwriting)
        if (opts.upscale && opts.mode === 'handwritten') {
          imageData = this.upscale(canvas, ctx, imageData, 2);
          canvas.width = imageData.width;
          canvas.height = imageData.height;
        }

        // Step 1: Convert to grayscale first
        if (opts.grayscale) {
          imageData = this.toGrayscale(imageData);
        }

        // Step 2: Deskew (before other processing for best results)
        if (opts.deskew) {
          imageData = this.deskew(canvas, ctx, imageData);
          canvas.width = imageData.width;
          canvas.height = imageData.height;
        }

        // Step 3: Bilateral filter (better edge preservation)
        if (opts.bilateralFilter) {
          // Use stronger bilateral filter for handwriting
          const radius = opts.mode === 'handwritten' ? 3 : 2;
          imageData = this.bilateralFilter(imageData, radius, 40, 40);
        } else if (opts.denoise) {
          if (opts.mode === 'handwritten') {
            imageData = this.medianFilter(imageData, 2);
          } else {
            imageData = this.denoise(imageData);
          }
        }

        // Step 4: Increase contrast
        if (opts.contrast) {
          imageData = this.increaseContrast(imageData, opts.contrastFactor ?? 1.3);
        }

        // Step 5: Morphological operations (for handwriting)
        if (opts.morphology && opts.mode === 'handwritten') {
          // Apply opening first to remove noise, then closing to fill gaps
          imageData = this.opening(imageData, 2);
          imageData = this.closing(imageData, 3);
        }

        // Step 6: Sharpen or unsharp mask
        if (opts.unsharpMask) {
          const amount = opts.mode === 'handwritten' ? 2.0 : 1.5;
          imageData = this.unsharpMask(imageData, amount, 1);
        } else if (opts.sharpen && opts.mode !== 'handwritten') {
          imageData = this.sharpen(imageData);
        }

        // Step 7: Thresholding (adaptive for handwriting, Otsu for printed)
        if (opts.adaptiveThreshold) {
          imageData = this.adaptiveThreshold(
            imageData, 
            opts.adaptiveBlockSize ?? 15, 
            opts.adaptiveC ?? 5
          );
        } else if (opts.threshold) {
          imageData = this.threshold(imageData);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
}

/**
 * Perform OCR on an image file using Tesseract.js
 */
export async function performOCR(
  file: File | string,
  onProgress?: (progress: ProcessingProgress) => void,
  language: string = 'eng',
  preprocessingOptions?: PreprocessingOptions
): Promise<OCRResult> {
  const startTime = performance.now();

  try {
    // Handle PDF files - use dynamic import to avoid loading pdfjs on every page
    if (typeof file !== 'string' && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      onProgress?.({ status: 'Extracting PDF pages...', progress: 0.05 });
      
      const { extractPDFPages } = await import('./pdf');
      const pdfResult = await extractPDFPages(file, (p) => {
        onProgress?.({ status: `Extracting page ${Math.ceil(p * 100)}%...`, progress: 0.05 + p * 0.15 });
      });

      const allTexts: string[] = [];
      let totalConfidence = 0;

      for (let i = 0; i < pdfResult.pages.length; i++) {
        const page = pdfResult.pages[i];
        onProgress?.({ 
          status: `Processing page ${i + 1} of ${pdfResult.totalPages}...`, 
          progress: 0.2 + (i / pdfResult.totalPages) * 0.7 
        });

        const pageResult = await Tesseract.recognize(page.imageDataUrl, language, {
          logger: () => {}, // Suppress individual page logs
        });

        allTexts.push(`--- Page ${i + 1} ---\n${pageResult.data.text.trim()}`);
        totalConfidence += pageResult.data.confidence;
      }

      onProgress?.({ status: 'Complete!', progress: 1 });
      const endTime = performance.now();

      return {
        text: allTexts.join('\n\n'),
        confidence: totalConfidence / pdfResult.totalPages,
        processingTimeMs: Math.round(endTime - startTime),
        pageCount: pdfResult.totalPages,
      };
    }

    // Handle image files
    let imageSource: string;
    if (typeof file === 'string') {
      imageSource = file;
    } else {
      onProgress?.({ status: 'Preprocessing image...', progress: 0.1 });
      imageSource = await ImagePreprocessor.preprocess(file, preprocessingOptions);
    }

    onProgress?.({ status: 'Initializing OCR engine...', progress: 0.2 });

    const result = await Tesseract.recognize(imageSource, language, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.({
            status: 'Recognizing text...',
            progress: 0.2 + m.progress * 0.7,
          });
        } else if (m.status === 'loading language traineddata') {
          onProgress?.({
            status: 'Loading language model...',
            progress: 0.15,
          });
        }
      },
    });

    onProgress?.({ status: 'Complete!', progress: 1 });

    const endTime = performance.now();

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
      processingTimeMs: Math.round(endTime - startTime),
    };
  } catch (error) {
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch process multiple images
 */
export async function batchOCR(
  files: File[],
  onProgress?: (fileIndex: number, progress: ProcessingProgress) => void,
  language: string = 'eng',
  preprocessingOptions?: PreprocessingOptions
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await performOCR(
      files[i],
      (progress) => onProgress?.(i, progress),
      language,
      preprocessingOptions
    );
    results.push(result);
  }

  return results;
}
