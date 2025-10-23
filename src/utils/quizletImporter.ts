export interface ParsedCard {
  term: string;
  definition: string;
}

export interface ProxyAttemptError {
  proxyUrl: string;
  message: string;
}

export class QuizletImportError extends Error {
  constructor(
    message: string,
    public readonly proxyErrors: ProxyAttemptError[] = []
  ) {
    super(message);
    this.name = 'QuizletImportError';
  }
}

export function parseQuizletReadableText(text: string): ParsedCard[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const cards: ParsedCard[] = [];

  const pushIfValid = (term?: string, definition?: string) => {
    if (!term || !definition) return;
    const trimmedTerm = term.trim().replace(/^["']|["']$/g, '');
    const trimmedDefinition = definition.trim().replace(/^["']|["']$/g, '');
    const tooShort = trimmedTerm.length < 1 || trimmedDefinition.length < 1;
    const tooLong = trimmedTerm.length > 200 || trimmedDefinition.length > 500;
    const isHeader = /^(term|definition|word|meaning)$/i.test(trimmedTerm);
    if (!tooShort && !tooLong && !isHeader) {
      if (!cards.find(card => card.term === trimmedTerm && card.definition === trimmedDefinition)) {
        cards.push({ term: trimmedTerm, definition: trimmedDefinition });
      }
    }
  };

  // Strategy A: Quizlet style separators
  const separators = [' — ', ' – ', ' - ', ' : ', ' → ', ' →', '→ '];
  lines.forEach(line => {
    separators.forEach(sep => {
      if (line.includes(sep)) {
        const [term, ...rest] = line.split(sep);
        const definition = rest.join(sep);
        pushIfValid(term, definition);
      }
    });
  });

  if (cards.length === 0) {
    lines.forEach(line => {
      const numberedMatch = line.match(/^\d+\.\s*(.+?)\s*[-–—:]\s*(.+)$/);
      if (numberedMatch) {
        pushIfValid(numberedMatch[1], numberedMatch[2]);
      }
    });
  }

  if (cards.length === 0) {
    lines.forEach(line => {
      const htmlMatch = line.match(/<[^>]*>([^<]+)<[^>]*>\s*[-–—:]\s*<[^>]*>([^<]+)<[^>]*>/);
      if (htmlMatch) {
        pushIfValid(htmlMatch[1], htmlMatch[2]);
      }
    });
  }

  if (cards.length === 0) {
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const term = lines[i];
      const definition = lines[i + 1];
      const headingLike = /^(Terms in this set|Definition|Định nghĩa|Thuật ngữ|Từ vựng|Flashcards|Cards)/i;
      if (!headingLike.test(term)) {
        pushIfValid(term, definition);
      }
    }
  }

  if (cards.length === 0) {
    const fallbackSeparators = ['\t', ' | ', ' |', '| ', ' : ', ' :', ': '];
    lines.forEach(line => {
      fallbackSeparators.forEach(sep => {
        if (line.includes(sep)) {
          const [term, ...rest] = line.split(sep);
          const definition = rest.join(sep);
          pushIfValid(term, definition);
        }
      });
    });
  }

  return cards;
}

export async function fetchAndParseQuizletUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed || !/quizlet\.com\//i.test(trimmed)) {
    throw new QuizletImportError('Vui lòng nhập URL Quizlet hợp lệ (https://quizlet.com/...)');
  }

  let normalizedUrl = trimmed.replace(/^https?:\/\//i, '');
  normalizedUrl = normalizedUrl.replace(/\/vn\//, '/');
  normalizedUrl = normalizedUrl.replace(/\/[a-z]{2}\//, '/');

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent('https://' + normalizedUrl)}`,
    `https://cors-anywhere.herokuapp.com/https://${normalizedUrl}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://' + normalizedUrl)}`,
    `https://thingproxy.freeboard.io/fetch/https://${normalizedUrl}`,
    `https://corsproxy.io/?${encodeURIComponent('https://' + normalizedUrl)}`
  ];

  const proxyErrors: ProxyAttemptError[] = [];
  let fetchedText = '';

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      if (text.length > 100) {
        fetchedText = text;
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      proxyErrors.push({ proxyUrl, message });
    }
  }

  if (!fetchedText) {
    throw new QuizletImportError('Không thể tải dữ liệu từ Quizlet bằng các proxy công khai.', proxyErrors);
  }

  const cards = parseQuizletReadableText(fetchedText);
  return { cards, proxyErrors };
}
