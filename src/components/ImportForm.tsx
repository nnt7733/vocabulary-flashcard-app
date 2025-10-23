import React, { useCallback, useEffect, useState } from 'react';
import { DelimiterType, CardSeparatorType } from '../types';
import { fetchAndParseQuizletUrl, QuizletImportError } from '../utils/quizletImporter';

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

  const parseCards = useCallback(() => {
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

  useEffect(() => {
    parseCards();
  }, [parseCards]);

  const handleQuizletImport = useCallback(async () => {
    setQuizletError(null);
    try {
      setIsFetchingQuizlet(true);
      const { cards, proxyErrors } = await fetchAndParseQuizletUrl(quizletUrl);

      if (cards.length === 0) {
        setPreviewCards([]);
        const proxyAttempts = proxyErrors.length;
        const guidance = [
          '❌ Không thể lấy dữ liệu trực tiếp từ URL Quizlet.',
          '',
          '🔧 Cách import từ Quizlet (100% hoạt động):',
          `1. Mở URL Quizlet trong tab mới: ${quizletUrl}`,
          '2. Nhấn nút "Export" (thường ở góc phải)',
          '3. Chọn "Copy text"',
          '4. Dán vào khung "Nhập thủ công" bên dưới',
          '5. Chọn delimiter phù hợp (Tab hoặc Comma)',
          '',
          `ℹ️ Đã thử ${proxyAttempts} proxy công khai${
            proxyAttempts
              ? `, lỗi cuối cùng: ${proxyErrors[proxyErrors.length - 1]?.message || 'Không xác định'}`
              : ''
          }.`
        ].join('\n');
        setQuizletError(guidance);
      } else {
        setPreviewCards(cards);
      }
    } catch (error) {
      if (error instanceof QuizletImportError) {
        const proxyAttempts = error.proxyErrors.length;
        const lastError = error.proxyErrors[error.proxyErrors.length - 1]?.message || 'Không xác định';
        const detailedMessage = [
          `Không thể tải dữ liệu từ Quizlet: ${error.message}.`,
          `Đã thử ${proxyAttempts} proxy công khai, lỗi cuối: ${lastError}.`,
          'Vui lòng kiểm tra URL, kết nối mạng hoặc nhập dữ liệu thủ công.'
        ].join('\n');
        setQuizletError(detailedMessage);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        setQuizletError(`Không thể tải dữ liệu từ Quizlet: ${message}. Vui lòng kiểm tra mạng và thử lại.`);
      }
      setPreviewCards([]);
    } finally {
      setIsFetchingQuizlet(false);
    }
  }, [quizletUrl]);

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
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
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
          {isFetchingQuizlet ? 'Đang lấy...' : 'Import từ URL Quizlet (đang phát triển)'}
        </button>
      </div>
      <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
        💡 Tính năng Import URL đang phát triển. Khuyến nghị dùng Export trên Quizlet:
        Mở set → Menu ⋯ → Export → Copy text → dán vào khung "Nhập thủ công" bên dưới.
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
