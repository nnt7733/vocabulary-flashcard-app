import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DelimiterType, CardSeparatorType } from '../types';

interface ImportFormProps {
  onImport: (cards: { term: string; definition: string }[]) => void;
  onClose: () => void;
}

type ImportMode = 'normal' | 'quizlet';

const ImportForm: React.FC<ImportFormProps> = ({ onImport, onClose }) => {
  const [importMode, setImportMode] = useState<ImportMode>('normal');
  const [inputText, setInputText] = useState('');
  const [termDelimiter, setTermDelimiter] = useState<DelimiterType>('tab');
  const [cardSeparator, setCardSeparator] = useState<CardSeparatorType>('newline');
  const [customTermDelimiter, setCustomTermDelimiter] = useState('');
  const [customCardSeparator, setCustomCardSeparator] = useState('');
  const [previewCards, setPreviewCards] = useState<{ term: string; definition: string }[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleTextareaKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.currentTarget;
      const selectionStart = textarea.selectionStart ?? 0;
      const selectionEnd = textarea.selectionEnd ?? selectionStart;
      const newValue = `${inputText.slice(0, selectionStart)}\t${inputText.slice(selectionEnd)}`;
      setInputText(newValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart + 1;
        textarea.selectionEnd = selectionStart + 1;
      });
    }
  }, [inputText]);

  const interpretDelimiter = useCallback((value: string) => {
    return value
      .replace(/\\t/g, '\t')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r');
  }, []);

  const resolvedTermDelimiter = useMemo(() => {
    if (termDelimiter === 'tab') {
      return '\t';
    }
    if (termDelimiter === 'comma') {
      return ',';
    }
    return interpretDelimiter(customTermDelimiter);
  }, [customTermDelimiter, interpretDelimiter, termDelimiter]);

  const resolvedCardSeparator = useMemo(() => {
    if (cardSeparator === 'newline') {
      return '\n';
    }
    if (cardSeparator === 'semicolon') {
      return ';';
    }
    return interpretDelimiter(customCardSeparator);
  }, [cardSeparator, customCardSeparator, interpretDelimiter]);

  // Parse Quizlet CSV format
  const parseQuizletCSV = useCallback((csvText: string): { term: string; definition: string }[] => {
    const lines = csvText.trim().split('\n');
    const cards: { term: string; definition: string }[] = [];
    
    // Skip header row if it starts with "Term,Definition"
    const startIndex = lines[0]?.trim().toLowerCase().startsWith('term') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV with quoted values
      // Match: "text","text" or text,text
      const csvRegex = /^"(.*)","(.*)"$|^([^,]+),(.+)$/;
      const match = line.match(csvRegex);
      
      if (match) {
        // Unescape doubled quotes ""  -> "
        const term = (match[1] || match[3] || '').replace(/""/g, '"').trim();
        const definition = (match[2] || match[4] || '').replace(/""/g, '"').trim();
        
        if (term && definition) {
          cards.push({ term, definition });
        }
      }
    }
    
    return cards;
  }, []);

  const parseCards = useCallback(() => {
    if (!inputText.trim()) {
      setPreviewCards([]);
      setParseError(null);
      return;
    }

    // Quizlet mode
    if (importMode === 'quizlet') {
      try {
        const cards = parseQuizletCSV(inputText);
        if (cards.length === 0) {
          setParseError('Không tìm thấy thẻ hợp lệ. Hãy chắc chắn bạn đã dán đúng định dạng CSV từ Quizlet.');
        } else {
          setParseError(null);
        }
        setPreviewCards(cards);
      } catch (error) {
        setParseError('Lỗi khi phân tích dữ liệu CSV. Vui lòng kiểm tra lại định dạng.');
        setPreviewCards([]);
      }
      return;
    }

    // Normal mode
    if (!resolvedTermDelimiter) {
      setParseError('Vui lòng nhập ký tự phân tách giữa thuật ngữ và định nghĩa.');
      setPreviewCards([]);
      return;
    }

    if (!resolvedCardSeparator) {
      setParseError('Vui lòng nhập ký tự phân tách giữa các thẻ.');
      setPreviewCards([]);
      return;
    }

    const normalizedText = inputText.replace(/\r\n/g, '\n');
    const rawEntries =
      cardSeparator === 'newline'
        ? normalizedText.split(/\n+/)
        : normalizedText.split(resolvedCardSeparator);

    const cards: { term: string; definition: string }[] = [];
    const invalidLines: number[] = [];

    rawEntries.forEach((rawEntry, index) => {
      const entry = rawEntry.trim();
      if (!entry) {
        return;
      }

      const delimiterIndex = entry.indexOf(resolvedTermDelimiter);
      if (delimiterIndex === -1) {
        invalidLines.push(index);
        return;
      }

      const term = entry.slice(0, delimiterIndex).trim();
      const definition = entry.slice(delimiterIndex + resolvedTermDelimiter.length).trim();

      if (!term || !definition) {
        invalidLines.push(index);
        return;
      }

      cards.push({ term, definition });
    });

    if (cards.length === 0) {
      setParseError('Không tìm thấy thẻ hợp lệ. Hãy kiểm tra lại ký tự phân tách và định dạng dữ liệu.');
    } else if (invalidLines.length > 0) {
      const sampleLine = invalidLines[0] + 1;
      setParseError(`Đã bỏ qua ${invalidLines.length} dòng không hợp lệ (ví dụ: dòng ${sampleLine}). Hãy kiểm tra lại định dạng các dòng này.`);
    } else {
      setParseError(null);
    }

    setPreviewCards(cards);
  }, [cardSeparator, inputText, resolvedCardSeparator, resolvedTermDelimiter, importMode, parseQuizletCSV]);

  useEffect(() => {
    parseCards();
  }, [parseCards]);

  const handleImport = async () => {
    if (previewCards.length === 0) return;
    
    setIsImporting(true);
    setImportProgress(0);
    
    const totalCards = previewCards.length;
    const batchSize = 10; // Process 10 cards at a time
    
    // Simulate progressive import for smooth UX
    for (let i = 0; i < totalCards; i += batchSize) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for animation
      const progress = Math.min(((i + batchSize) / totalCards) * 100, 100);
      setImportProgress(progress);
    }
    
    // Actually import the cards
    onImport(previewCards);
    setImportedCount(previewCards.length);
    
    // Show success
    setImportProgress(100);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setIsImporting(false);
    setShowSuccess(true);
    
    // Auto-hide success message and reset after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
      setInputText('');
      setPreviewCards([]);
      setParseError(null);
      setImportProgress(0);
    }, 3000);
  };

  return (
    <div className="import-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Nhập dữ liệu</h2>
        <button
          onClick={onClose}
          className="import-close-btn"
        >
          ×
        </button>
      </div>

      {/* Import Mode Selector */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <button
            onClick={() => setImportMode('normal')}
            className={`btn ${importMode === 'normal' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 20px', fontSize: '0.9rem' }}
          >
            📝 Normal Import
          </button>
          <button
            onClick={() => setImportMode('quizlet')}
            className={`btn ${importMode === 'quizlet' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 20px', fontSize: '0.9rem' }}
          >
            🎓 Import from Quizlet
          </button>
        </div>
      </div>

      <p className="import-description">
        {importMode === 'normal' ? (
          <>
            Chép và dán dữ liệu ở đây (từ Word, Excel, Google Docs, v.v.). Mỗi dòng nên có định dạng:
            <br />
            <strong>Từ</strong> [delimiter] <strong>Định nghĩa</strong>
          </>
        ) : (
          <>
            <strong>🎓 Import từ Quizlet - 3 bước đơn giản:</strong>
            <br />
            <div style={{ 
              background: 'var(--bg-secondary)', 
              padding: '12px 16px', 
              borderRadius: '8px',
              marginTop: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  1️⃣ Copy script → 2️⃣ Chạy trên Quizlet (F12) → 3️⃣ Paste vào đây
                </span>
                <button
                  onClick={() => {
                    const script = `(() => {
  try {
    const terms = document.getElementsByClassName('SetPageTermsList-term');
    if (terms.length === 0) {
      console.log('No terms found. Make sure you are on the correct page.');
      return;
    }
    const csv = ['Term,Definition'];
    let extractedCount = 0;
    Array.from(terms).forEach((term) => {
      const termTexts = term.querySelectorAll('.TermText');
      if (termTexts.length >= 2) {
        const word = termTexts[0].textContent.trim().replace(/[\\n\\r]+/g, ' ');
        const def = termTexts[1].textContent.trim().replace(/[\\n\\r]+/g, ' ');
        const escapedWord = word.replace(/"/g, '""');
        const escapedDef = def.replace(/"/g, '""');
        csv.push(\`"\${escapedWord}","\${escapedDef}"\`);
        extractedCount++;
      }
    });
    if (extractedCount === 0) {
      console.log('No valid term pairs found.');
      return;
    }
    navigator.clipboard.writeText(csv.join('\\n'))
      .then(() => console.log(\`✅ CSV data with \${extractedCount} terms copied to clipboard!\`))
      .catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = csv.join('\\n');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        console.log(\`✅ CSV data with \${extractedCount} terms copied to clipboard!\`);
      });
  } catch (error) {
    console.error('Script error:', error);
  }
})();`;
                    navigator.clipboard.writeText(script).then(() => {
                      alert('✅ Script đã copy!\n\nBước tiếp theo:\n1. Mở Quizlet set\n2. Nhấn F12\n3. Paste vào Console\n4. Nhấn Enter\n5. Quay lại app và Paste dữ liệu');
                    }).catch(() => {
                      alert('Không thể copy. Hãy copy script từ file QUIZLET_IMPORT_GUIDE.md');
                    });
                  }}
                  className="btn btn-success"
                  style={{ 
                    fontSize: '0.8125rem', 
                    padding: '8px 14px',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📋</span>
                  <span>Copy Script</span>
                </button>
              </div>
            </div>
          </>
        )}
      </p>

      {importMode === 'normal' && (
        <div className="input-group">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder='Từ 1\tĐịnh nghĩa 1\nTừ 2\tĐịnh nghĩa 2'
            className="textarea-large"
          />
        </div>
      )}

      {parseError && (
        <div className="import-error">
          {parseError}
        </div>
      )}

      {/* Show delimiter options only in normal mode */}
      {importMode === 'normal' && (
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
              <label htmlFor="tab">Tab (\t)</label>
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
              <label htmlFor="comma">Dấu phẩy (,)</label>
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
            </div>
          </div>
          {termDelimiter === 'custom' && (
            <input
              type="text"
              id="custom-term"
              value={customTermDelimiter}
              onChange={(e) => setCustomTermDelimiter(e.target.value)}
              placeholder="Ví dụ: => hoặc ::"
              style={{ marginTop: '8px' }}
            />
          )}
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
              <label htmlFor="newline">Xuống dòng (\n)</label>
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
              <label htmlFor="semicolon">Dấu chấm phẩy (;)</label>
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
            </div>
          </div>
          {cardSeparator === 'custom' && (
            <input
              type="text"
              id="custom-card"
              value={customCardSeparator}
              onChange={(e) => setCustomCardSeparator(e.target.value)}
              placeholder="Ví dụ: || hoặc ###"
              style={{ marginTop: '8px' }}
            />
          )}
        </div>
        </div>
      )}

      {/* Progress Bar */}
      {isImporting && (
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '8px',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}>
            <span>Đang import...</span>
            <span>{Math.round(importProgress)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${importProgress}%`,
              height: '100%',
              backgroundColor: '#0e7c0e',
              transition: 'width 0.3s ease',
              borderRadius: '4px'
            }} />
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div style={{
          marginTop: '20px',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#d1fae5',
          border: '1px solid #86efac',
          borderRadius: '8px',
          color: '#065f46',
          textAlign: 'center',
          fontSize: '1rem',
          fontWeight: '600',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          ✅ Import hoàn tất – {importedCount} từ đã được thêm!
        </div>
      )}

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
              <div className="import-preview-more">
                ... và {previewCards.length - 3} thẻ khác
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button 
          onClick={onClose} 
          className="btn btn-secondary"
          disabled={isImporting}
        >
          {showSuccess ? 'Đóng' : 'Hủy'}
        </button>
        <button
          onClick={handleImport}
          className="btn btn-primary"
          disabled={previewCards.length === 0 || isImporting}
        >
          {isImporting ? 'Đang import...' : `Nhập ${previewCards.length} thẻ`}
        </button>
      </div>
    </div>
  );
};

export default ImportForm;
