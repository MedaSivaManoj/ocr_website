import Tesseract from 'tesseract.js';

/**
 * Script to Tesseract language code mapping
 * Maps detected scripts to the most common language for that script
 */
const SCRIPT_TO_LANGUAGE: Record<string, string> = {
  'Latin': 'eng',
  'Cyrillic': 'rus',
  'Arabic': 'ara',
  'Hebrew': 'heb',
  'Devanagari': 'hin',
  'Han': 'chi_sim',
  'Hangul': 'kor',
  'Hiragana': 'jpn',
  'Katakana': 'jpn',
  'Greek': 'ell',
  'Thai': 'tha',
  'Vietnamese': 'vie',
  'Tamil': 'tam',
  'Telugu': 'tel',
  'Bengali': 'ben',
};

/**
 * Character range based language detection
 * Analyzes character distribution to guess the language
 */
function detectByCharacterRanges(text: string): string | null {
  if (!text || text.length < 10) return null;
  
  const charCounts: Record<string, number> = {
    latin: 0,
    cyrillic: 0,
    arabic: 0,
    hebrew: 0,
    devanagari: 0,
    chinese: 0,
    korean: 0,
    japanese: 0,
    greek: 0,
    thai: 0,
  };
  
  let totalLetters = 0;
  
  for (const char of text) {
    const code = char.charCodeAt(0);
    
    // Latin (Basic Latin + Latin Extended)
    if ((code >= 0x0041 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x024F)) {
      charCounts.latin++;
      totalLetters++;
    }
    // Cyrillic
    else if (code >= 0x0400 && code <= 0x04FF) {
      charCounts.cyrillic++;
      totalLetters++;
    }
    // Arabic
    else if (code >= 0x0600 && code <= 0x06FF) {
      charCounts.arabic++;
      totalLetters++;
    }
    // Hebrew
    else if (code >= 0x0590 && code <= 0x05FF) {
      charCounts.hebrew++;
      totalLetters++;
    }
    // Devanagari (Hindi)
    else if (code >= 0x0900 && code <= 0x097F) {
      charCounts.devanagari++;
      totalLetters++;
    }
    // CJK (Chinese)
    else if (code >= 0x4E00 && code <= 0x9FFF) {
      charCounts.chinese++;
      totalLetters++;
    }
    // Korean Hangul
    else if ((code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x1100 && code <= 0x11FF)) {
      charCounts.korean++;
      totalLetters++;
    }
    // Japanese Hiragana/Katakana
    else if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF)) {
      charCounts.japanese++;
      totalLetters++;
    }
    // Greek
    else if (code >= 0x0370 && code <= 0x03FF) {
      charCounts.greek++;
      totalLetters++;
    }
    // Thai
    else if (code >= 0x0E00 && code <= 0x0E7F) {
      charCounts.thai++;
      totalLetters++;
    }
  }
  
  if (totalLetters < 5) return null;
  
  // Find the dominant script
  const sorted = Object.entries(charCounts).sort((a, b) => b[1] - a[1]);
  const [topScript, topCount] = sorted[0];
  
  // Need at least 30% of letters to be in that script
  if (topCount / totalLetters < 0.3) return null;
  
  const scriptToLang: Record<string, string> = {
    latin: 'eng',
    cyrillic: 'rus',
    arabic: 'ara',
    hebrew: 'heb',
    devanagari: 'hin',
    chinese: 'chi_sim',
    korean: 'kor',
    japanese: 'jpn',
    greek: 'ell',
    thai: 'tha',
  };
  
  return scriptToLang[topScript] || null;
}

/**
 * Detect language from an image using Tesseract OSD
 * Falls back to multi-language sampling if OSD fails
 */
export async function detectLanguage(
  imageSource: string | File,
  onProgress?: (message: string) => void
): Promise<{ language: string; confidence: number; method: string }> {
  try {
    onProgress?.('Detecting language...');
    
    // Convert File to data URL if needed
    let imageSrc = imageSource;
    if (imageSource instanceof File) {
      imageSrc = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageSource);
      });
    }
    
    // Try Tesseract OSD first for script detection
    try {
      onProgress?.('Running script detection...');
      const osdResult = await Tesseract.recognize(imageSrc, 'osd', {
        logger: () => {},
      });
      
      // Check if we got useful OSD data - access via any since types don't include OSD fields
      const osdData = osdResult.data as any;
      if (osdData && osdData.script) {
        const detectedScript = osdData.script as string;
        const langCode = SCRIPT_TO_LANGUAGE[detectedScript];
        
        if (langCode) {
          return {
            language: langCode,
            confidence: osdData.script_confidence || 80,
            method: 'script_detection'
          };
        }
      }
    } catch (osdError) {
      console.warn('OSD detection failed, trying sampling method:', osdError);
    }
    
    // Fallback: Quick sample with English to get some text, then analyze
    onProgress?.('Sampling text for analysis...');
    const sampleResult = await Tesseract.recognize(imageSrc, 'eng', {
      logger: () => {},
    });
    
    const sampleText = sampleResult.data.text;
    
    if (sampleText && sampleText.length > 10) {
      const detectedLang = detectByCharacterRanges(sampleText);
      if (detectedLang) {
        return {
          language: detectedLang,
          confidence: 70,
          method: 'character_analysis'
        };
      }
    }
    
    // Default to English if detection fails
    return {
      language: 'eng',
      confidence: 50,
      method: 'default'
    };
    
  } catch (error) {
    console.error('Language detection failed:', error);
    return {
      language: 'eng',
      confidence: 0,
      method: 'error_fallback'
    };
  }
}

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
  const languageNames: Record<string, string> = {
    'eng': 'English',
    'spa': 'Spanish',
    'fra': 'French',
    'deu': 'German',
    'ita': 'Italian',
    'por': 'Portuguese',
    'nld': 'Dutch',
    'pol': 'Polish',
    'rus': 'Russian',
    'jpn': 'Japanese',
    'chi_sim': 'Chinese (Simplified)',
    'chi_tra': 'Chinese (Traditional)',
    'kor': 'Korean',
    'ara': 'Arabic',
    'hin': 'Hindi',
    'tur': 'Turkish',
    'vie': 'Vietnamese',
    'tha': 'Thai',
    'ukr': 'Ukrainian',
    'ces': 'Czech',
    'swe': 'Swedish',
    'dan': 'Danish',
    'nor': 'Norwegian',
    'fin': 'Finnish',
    'ell': 'Greek',
    'heb': 'Hebrew',
  };
  
  return languageNames[code] || code;
}
