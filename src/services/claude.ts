import { SRTEntry } from '../types';
import { parseSRT, chunkSRTEntries, serializeSRT } from '../utils/srt-parser';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

export type TranslationProgressCallback = (progress: number, message: string) => void;

const LANGUAGE_NAMES: Record<string, string> = {
  he: 'Hebrew',
  en: 'English',
  ar: 'Arabic',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  pt: 'Portuguese',
  it: 'Italian',
  tr: 'Turkish',
};

/**
 * Translate a single SRT chunk using Claude API
 */
const translateSRTChunk = async (
  srtChunk: string,
  targetLanguage: string,
  apiKey: string,
  retryCount: number = 0
): Promise<string> => {
  const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  const systemPrompt = `You are a professional subtitle translator. Translate the following SRT subtitles to ${targetLangName}.
Preserve all SRT formatting, timestamps, and numbering exactly.
Only translate the text content lines (not the numbers or timestamps).
Ensure the translation reads naturally and fits the timing constraints.
For RTL languages like Hebrew and Arabic, the text should flow naturally in that language.
Return ONLY the translated SRT content with no additional text or explanation.`;

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please translate these SRT subtitles to ${targetLangName}:\n\n${srtChunk}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Claude API error: ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }

    if (response.status === 429) {
      // Rate limit - implement exponential backoff
      if (retryCount < 3) {
        const waitTime = Math.pow(2, retryCount) * 5000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return translateSRTChunk(srtChunk, targetLanguage, apiKey, retryCount + 1);
      }
      throw new Error(`חריגה ממגבלת קצב ה-API של Claude. אנא המתן ונסה שנית.`);
    } else if (response.status === 401) {
      throw new Error('מפתח ה-API של Claude אינו תקין. אנא בדוק את ההגדרות.');
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = data.content?.[0];

  if (!content || content.type !== 'text') {
    throw new Error('Invalid response from Claude API');
  }

  return content.text.trim();
};

/**
 * Extract SRT entries from Claude's response, handling potential formatting issues
 */
const extractSRTFromResponse = (response: string, originalEntries: SRTEntry[]): SRTEntry[] => {
  // Try to parse the response as SRT
  const parsed = parseSRT(response);

  if (parsed.length > 0) {
    return parsed;
  }

  // If parsing fails, try to extract text lines and map to original entries
  const lines = response.split('\n').filter((l) => l.trim());
  const textLines = lines.filter((l) => {
    const trimmed = l.trim();
    // Filter out timestamps and index numbers
    return (
      !trimmed.match(/^\d+$/) &&
      !trimmed.match(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/) &&
      trimmed.length > 0
    );
  });

  // Map extracted text to original entries
  return originalEntries.map((entry, idx) => ({
    ...entry,
    text: textLines[idx] || entry.text,
  }));
};

/**
 * Translate SRT content to target language using Claude API
 */
export const translateSRT = async (
  srtContent: string,
  targetLanguage: string,
  apiKey: string,
  onProgress?: TranslationProgressCallback
): Promise<string> => {
  const entries = parseSRT(srtContent);

  if (entries.length === 0) {
    throw new Error('No subtitle entries found in SRT content');
  }

  // Split into chunks to handle long subtitle files
  const chunks = chunkSRTEntries(entries, 3000);
  const translatedChunkEntries: SRTEntry[][] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progressBase = (i / chunks.length) * 100;
    const progressEnd = ((i + 1) / chunks.length) * 100;

    onProgress?.(
      progressBase,
      chunks.length > 1
        ? `מתרגם חלק ${i + 1} מתוך ${chunks.length}...`
        : 'שולח לתרגום...'
    );

    const chunkSRT = serializeSRT(chunk);
    const translatedChunkSRT = await translateSRTChunk(chunkSRT, targetLanguage, apiKey);

    // Extract translated entries
    const translatedEntries = extractSRTFromResponse(translatedChunkSRT, chunk);
    translatedChunkEntries.push(translatedEntries);

    onProgress?.(progressEnd, `הושלם תרגום חלק ${i + 1}`);
  }

  // Merge all translated chunks, preserving original timestamps
  const allTranslated: SRTEntry[] = [];
  let index = 1;

  for (const chunkEntries of translatedChunkEntries) {
    for (const entry of chunkEntries) {
      allTranslated.push({ ...entry, index });
      index++;
    }
  }

  // Serialize back to SRT
  const finalSRT = allTranslated
    .map(
      (entry) =>
        `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`
    )
    .join('\n\n');

  return finalSRT;
};
