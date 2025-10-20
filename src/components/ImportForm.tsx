import React, { useState } from 'react';
import { DelimiterType, CardSeparatorType } from '../types';

interface ImportFormProps {
  onImport: (cards: { term: string; definition: string }[]) => void;
  onClose: () => void;
}

const ImportForm: React.FC<ImportFormProps> = ({ onImport, onClose }) => {
  const [inputText, setInputText] = useState('');
  const [termDelimiter, setTermDelimiter] = useState<DelimiterType>('tab');
  const [cardSeparator, setCardSeparator] = useState<CardSeparatorType>('newline');
  const [customTermDelimiter, setCustomTermDelimiter] = useState('');
  const [customCardSeparator, setCustomCardSeparator] = useState('');
  const [previewCards, setPreviewCards] = useState<{ term: string; definition: string }[]>([]);
  // Quizlet URL import states
  const [quizletUrl, setQuizletUrl] = useState('');
  const [isFetchingQuizlet, setIsFetchingQuizlet] = useState(false);
  const [quizletError, setQuizletError] = useState<string | null>(null);

  const parseCards = React.useCallback(() => {
    if (!inputText.trim()) {
      setPreviewCards([]);
      return;
    }

    const cardSeparatorValue = cardSeparator === 'custom' ? customCardSeparator : 
      cardSeparator === 'newline' ? '\n' : ';';
    
    const termDelimiterValue = termDelimiter === 'custom' ? customTermDelimiter :
      termDelimiter === 'tab' ? '\t' : ',';

    const lines = inputText.split(cardSeparatorValue).filter(line => line.trim());
    const cards: { term: string; definition: string }[] = [];

    lines.forEach(line => {
      const parts = line.split(termDelimiterValue);
      if (parts.length >= 2) {
        cards.push({
          term: parts[0].trim(),
          definition: parts.slice(1).join(termDelimiterValue).trim()
        });
      }
    });

    setPreviewCards(cards);
  }, [inputText, termDelimiter, cardSeparator, customTermDelimiter, customCardSeparator]);

  React.useEffect(() => {
    parseCards();
  }, [parseCards]);

  // Parse readable text fetched from Quizlet page via proxy
  function parseQuizletReadableText(text: string): { term: string; definition: string }[] {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const cards: { term: string; definition: string }[] = [];

    // Strategy A: Look for Quizlet-specific patterns
    // Pattern 1: "term" - "definition" or "term" — "definition"
    for (const line of lines) {
      const separators = [' — ', ' – ', ' - ', ' : ', ' → ', ' →', '→ '];
      for (const sep of separators) {
        if (line.includes(sep)) {
          const [term, ...rest] = line.split(sep);
          const definition = rest.join(sep).trim();
          if (term && definition && term.length <= 200 && definition.length <= 500) {
            cards.push({ term: term.trim(), definition });
            break; // Only use first separator found
          }
        }
      }
    }

    // Strategy B: Look for numbered lists or bullet points
    if (cards.length === 0) {
      for (const line of lines) {
        const numberedMatch = line.match(/^\d+\.\s*(.+?)\s*[-–—:]\s*(.+)$/);
        if (numberedMatch) {
          const [, term, definition] = numberedMatch;
          if (term && definition) {
            cards.push({ term: term.trim(), definition: definition.trim() });
          }
        }
      }
    }

    // Strategy C: Look for HTML-like patterns (if any HTML leaked through)
    if (cards.length === 0) {
      for (const line of lines) {
        const htmlMatch = line.match(/<[^>]*>([^<]+)<[^>]*>\s*[-–—:]\s*<[^>]*>([^<]+)<[^>]*>/);
        if (htmlMatch) {
          const [, term, definition] = htmlMatch;
          if (term && definition) {
            cards.push({ term: term.trim(), definition: definition.trim() });
          }
        }
      }
    }

    // Strategy D: alternating lines (fallback)
    if (cards.length === 0) {
      for (let i = 0; i + 1 < lines.length; i += 2) {
        const term = lines[i];
        const definition = lines[i + 1];
        const headingLike = /^(Terms in this set|Definition|Định nghĩa|Thuật ngữ|Từ vựng|Flashcards|Cards)/i;
        const tooShort = term.length < 2 || definition.length < 2;
        const tooLong = term.length > 200 || definition.length > 500;
        
        if (!headingLike.test(term) && !tooShort && !tooLong && term && definition) {
          cards.push({ term, definition });
        }
      }
    }

    // Strategy E: Look for any line with common separators
    if (cards.length === 0) {
      for (const line of lines) {
        const separators = ['\t', ' | ', ' |', '| ', ' : ', ' :', ': '];
        for (const sep of separators) {
          if (line.includes(sep)) {
            const [term, ...rest] = line.split(sep);
            const definition = rest.join(sep).trim();
            if (term && definition && term.length <= 200 && definition.length <= 500) {
              cards.push({ term: term.trim(), definition });
              break;
            }
          }
        }
      }
    }

    // Clean up and deduplicate
    const cleaned = cards.map(card => ({
      term: card.term.replace(/^["']|["']$/g, '').trim(), // Remove quotes
      definition: card.definition.replace(/^["']|["']$/g, '').trim()
    })).filter(card => 
      card.term.length > 0 && 
      card.definition.length > 0 &&
      !/^(term|definition|word|meaning)$/i.test(card.term) // Filter out obvious headers
    );

    const unique: { term: string; definition: string }[] = [];
    for (const c of cleaned) {
      if (!unique.find(u => u.term === c.term && u.definition === c.definition)) {
        unique.push(c);
      }
    }
    
    return unique;
  }

  async function handleQuizletImport() {
    setQuizletError(null);
    const url = quizletUrl.trim();
    if (!url || !/quizlet\.com\//i.test(url)) {
      setQuizletError('Vui lòng nhập URL Quizlet hợp lệ (https://quizlet.com/...)');
      return;
    }
    try {
      setIsFetchingQuizlet(true);
      
      // Normalize URL - remove /vn/ and other language prefixes
      let normalizedUrl = url.replace(/^https?:\/\//i, '');
      normalizedUrl = normalizedUrl.replace(/\/vn\//, '/');
      normalizedUrl = normalizedUrl.replace(/\/[a-z]{2}\//, '/'); // Remove other language codes
      
      // Use r.jina.ai to fetch readable page content (bypasses CORS)
      const proxyUrl = `https://r.jina.ai/http://${normalizedUrl}`;
      console.log('Fetching from:', proxyUrl);
      
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const text = await res.text();
      console.log('Fetched text length:', text.length);
      console.log('First 500 chars:', text.substring(0, 500));
      
      const parsed = parseQuizletReadableText(text);
      console.log('Parsed cards:', parsed.length);
      
      if (parsed.length === 0) {
        setQuizletError('Không đọc được dữ liệu từ URL này. Hãy thử dùng Export trên Quizlet rồi dán vào khung nhập thủ công.');
        setPreviewCards([]);
      } else {
        setPreviewCards(parsed);
      }
    } catch (e) {
      console.error('Quizlet import error:', e);
      setQuizletError(`Không thể tải dữ liệu từ Quizlet: ${e.message}. Vui lòng kiểm tra mạng và thử lại.`);
    } finally {
      setIsFetchingQuizlet(false);
    }
  }

  const handleImport = () => {
    if (previewCards.length > 0) {
      onImport(previewCards);
      setInputText('');
      setPreviewCards([]);
    }
  };

  return (
    <div className="import-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1f2937' }}>Nhập dữ liệu</h2>
        <button 
          onClick={onClose}
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer',
            color: '#6b7280'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setPreviewCards([]);
            setQuizletError(null);
            setQuizletUrl('');
          }}
          title="Chuyển sang nhập thủ công"
        >
          Nhập thủ công
        </button>
        <div style={{ flex: 1 }} />
        <input
          type="url"
          value={quizletUrl}
          onChange={(e) => setQuizletUrl(e.target.value)}
          placeholder="https://quizlet.com/123456/set/..."
          style={{ flex: 2, padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
        />
        <button
          onClick={handleQuizletImport}
          className="btn btn-primary"
          disabled={isFetchingQuizlet || !quizletUrl}
        >
          {isFetchingQuizlet ? 'Đang lấy...' : 'Import từ URL Quizlet'}
        </button>
      </div>
      {quizletError && (
        <div style={{ color: '#b91c1c', marginTop: '-8px', marginBottom: '8px' }}>{quizletError}</div>
      )}

      <p style={{ color: '#6b7280', marginBottom: '16px' }}>
        Chép và dán dữ liệu ở đây (từ Word, Excel, Google Docs, v.v.) hoặc dùng ô bên trên để nhập từ URL Quizlet.
      </p>

      <div className="input-group">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Từ 1	Định nghĩa 1&#10;Từ 2	Định nghĩa 2&#10;Từ 3	Định nghĩa 3"
          className="textarea-large"
        />
      </div>

      <div className="delimiter-options">
        <div className="delimiter-group">
          <label>Giữa thuật ngữ và định nghĩa</label>
          <div className="radio-group">
            <div className="radio-item">
              <input
                type="radio"
                id="tab"
                name="termDelimiter"
                value="tab"
                checked={termDelimiter === 'tab'}
                onChange={(e) => setTermDelimiter(e.target.value as DelimiterType)}
              />
              <label htmlFor="tab">Tab</label>
            </div>
            <div className="radio-item">
              <input
                type="radio"
                id="comma"
                name="termDelimiter"
                value="comma"
                checked={termDelimiter === 'comma'}
                onChange={(e) => setTermDelimiter(e.target.value as DelimiterType)}
              />
              <label htmlFor="comma">Phẩy</label>
            </div>
            <div className="radio-item">
              <input
                type="radio"
                id="custom-term"
                name="termDelimiter"
                value="custom"
                checked={termDelimiter === 'custom'}
                onChange={(e) => setTermDelimiter(e.target.value as DelimiterType)}
              />
              <label htmlFor="custom-term">Tùy chỉnh</label>
              {termDelimiter === 'custom' && (
                <input
                  type="text"
                  value={customTermDelimiter}
                  onChange={(e) => setCustomTermDelimiter(e.target.value)}
                  placeholder="Nhập ký tự phân cách"
                  style={{ width: '150px', marginLeft: '8px' }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="delimiter-group">
          <label>Giữa các thẻ</label>
          <div className="radio-group">
            <div className="radio-item">
              <input
                type="radio"
                id="newline"
                name="cardSeparator"
                value="newline"
                checked={cardSeparator === 'newline'}
                onChange={(e) => setCardSeparator(e.target.value as CardSeparatorType)}
              />
              <label htmlFor="newline">Dòng mới</label>
            </div>
            <div className="radio-item">
              <input
                type="radio"
                id="semicolon"
                name="cardSeparator"
                value="semicolon"
                checked={cardSeparator === 'semicolon'}
                onChange={(e) => setCardSeparator(e.target.value as CardSeparatorType)}
              />
              <label htmlFor="semicolon">Chấm phẩy</label>
            </div>
            <div className="radio-item">
              <input
                type="radio"
                id="custom-card"
                name="cardSeparator"
                value="custom"
                checked={cardSeparator === 'custom'}
                onChange={(e) => setCardSeparator(e.target.value as CardSeparatorType)}
              />
              <label htmlFor="custom-card">Tùy chỉnh</label>
              {cardSeparator === 'custom' && (
                <input
                  type="text"
                  value={customCardSeparator}
                  onChange={(e) => setCustomCardSeparator(e.target.value)}
                  placeholder="Nhập ký tự phân cách"
                  style={{ width: '150px', marginLeft: '8px' }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="preview">
        <strong>Xem trước {previewCards.length} thẻ</strong>
        {previewCards.length > 0 && (
          <div style={{ marginTop: '12px', textAlign: 'left' }}>
            {previewCards.slice(0, 3).map((card, index) => (
              <div key={index} style={{ marginBottom: '8px', padding: '8px', background: 'white', borderRadius: '4px' }}>
                <strong>{card.term}</strong> - {card.definition}
              </div>
            ))}
            {previewCards.length > 3 && (
              <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                ... và {previewCards.length - 3} thẻ khác
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button onClick={onClose} className="btn btn-secondary">
          Hủy
        </button>
        <button 
          onClick={handleImport} 
          className="btn btn-primary"
          disabled={previewCards.length === 0}
        >
          Nhập {previewCards.length} thẻ
        </button>
      </div>
    </div>
  );
};

export default ImportForm;
