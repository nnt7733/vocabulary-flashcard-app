import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [parseError, setParseError] = useState<string | null>(null);

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

  const parseCards = useCallback(() => {
    if (!inputText.trim()) {
      setPreviewCards([]);
      setParseError(null);
      return;
    }

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
  }, [cardSeparator, inputText, resolvedCardSeparator, resolvedTermDelimiter]);

  useEffect(() => {
    parseCards();
  }, [parseCards]);

  const handleImport = () => {
    if (previewCards.length > 0) {
      onImport(previewCards);
      setInputText('');
      setPreviewCards([]);
      setParseError(null);
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

      <p style={{ color: '#6b7280', marginBottom: '16px' }}>
        Chép và dán dữ liệu ở đây (từ Word, Excel, Google Docs, v.v.). Mỗi dòng nên có định dạng:
        <br />
        <strong>Từ</strong> [delimiter] <strong>Định nghĩa</strong>
      </p>

      <div className="input-group">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder={'Từ 1\tĐịnh nghĩa 1\nTừ 2\tĐịnh nghĩa 2'}
          className="textarea-large"
        />
      </div>

      {parseError && (
        <div style={{ color: '#b45309', background: '#fef3c7', borderRadius: '6px', padding: '12px', marginBottom: '16px', textAlign: 'left' }}>
          {parseError}
        </div>
      )}

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
