# 🎓 Hướng dẫn Import từ Quizlet

## Tổng quan

Tính năng mới này cho phép bạn import trực tiếp từ vựng từ Quizlet vào ứng dụng của mình với progress bar và thông báo hoàn thành.

## Cách sử dụng

### Bước 1: Export dữ liệu từ Quizlet

1. Mở Quizlet set bạn muốn export trong trình duyệt
2. Nhấn `F12` để mở Developer Tools
3. Chuyển sang tab **Console**
4. Copy và paste đoạn code sau vào Console:

```javascript
(() => {
  try {
    const terms = document.getElementsByClassName('SetPageTermsList-term');
    
    if (terms.length === 0) {
      console.log('No terms found. Make sure you\'re on the correct page.');
      return;
    }
    
    const csv = ['Term,Definition']; // Add header row
    let extractedCount = 0;

    Array.from(terms).forEach((term) => {
      const termTexts = term.querySelectorAll('.TermText');
      
      if (termTexts.length >= 2) {
        // Clean up text by removing extra whitespace and newlines
        const word = termTexts[0].textContent.trim().replace(/[\n\r]+/g, ' ');
        const def = termTexts[1].textContent.trim().replace(/[\n\r]+/g, ' ');
        
        // Escape quotes in CSV by doubling them
        const escapedWord = word.replace(/"/g, '""');
        const escapedDef = def.replace(/"/g, '""');
        
        csv.push(`"${escapedWord}","${escapedDef}"`);
        extractedCount++;
      }
    });

    if (extractedCount === 0) {
      console.log('No valid term pairs found.');
      return;
    }

    // Modern clipboard API (preferred method)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(csv.join('\n'))
        .then(() => {
          console.log(`✅ CSV data with ${extractedCount} terms copied to clipboard!`);
          console.log('Preview:', csv.slice(0, 3).join('\n') + (csv.length > 3 ? '\n...' : ''));
        })
        .catch((err) => {
          console.error('Failed to copy to clipboard:', err);
          fallbackCopy();
        });
    } else {
      // Fallback method for older browsers
      fallbackCopy();
    }

    function fallbackCopy() {
      const textarea = document.createElement('textarea');
      textarea.value = csv.join('\n');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          console.log(`✅ CSV data with ${extractedCount} terms copied to clipboard!`);
          console.log('Preview:', csv.slice(0, 3).join('\n') + (csv.length > 3 ? '\n...' : ''));
        } else {
          console.log('❌ Copy failed. Here\'s the CSV data:');
          console.log(csv.join('\n'));
        }
      } catch (err) {
        console.log('❌ Copy not supported. Here\'s the CSV data:');
        console.log(csv.join('\n'));
      }
      
      document.body.removeChild(textarea);
    }

  } catch (error) {
    console.error('Script error:', error);
  }
})();
```

5. Nhấn `Enter` để chạy script
6. Dữ liệu sẽ được tự động copy vào clipboard

### Bước 2: Import vào ứng dụng

1. Trong ứng dụng, chọn set bạn muốn thêm từ vựng
2. Nhấn **"➕ Thêm từ mới"** hoặc **"Add Words"**
3. Chọn tab **"🎓 Import from Quizlet"**
4. Nhấn `Ctrl+V` (hoặc `Cmd+V` trên Mac) để paste dữ liệu
5. Xem preview các từ vựng
6. Nhấn nút **"Nhập X thẻ"**

### Bước 3: Theo dõi quá trình Import

- **Progress Bar**: Hiển thị % hoàn thành real-time
- **Success Notification**: Thông báo khi hoàn tất: "✅ Import hoàn tất – X từ đã được thêm!"
- **Auto-close**: Thông báo tự động đóng sau 3 giây

## Định dạng dữ liệu

Script Quizlet export dữ liệu dưới dạng CSV:

```csv
Term,Definition
"hello","xin chào"
"world","thế giới"
"computer","máy tính"
```

### Đặc điểm của format:

- **Header row**: `Term,Definition` (tự động bỏ qua khi import)
- **Quoted values**: Tất cả giá trị được bọc trong dấu ngoặc kép `"..."`
- **Escaped quotes**: Dấu ngoặc kép bên trong được escape bằng `""` (double quote)
- **Clean text**: Khoảng trắng và newline thừa đã được xử lý

## Ưu điểm

✅ **Tự động**: Không cần chỉnh sửa format thủ công  
✅ **Nhanh chóng**: Import hàng trăm từ trong vài giây  
✅ **Trực quan**: Progress bar và thông báo rõ ràng  
✅ **An toàn**: Preview trước khi import  
✅ **Tương thích**: Hỗ trợ tất cả ký tự đặc biệt và Unicode

## Troubleshooting

### "No terms found"
- Đảm bảo bạn đang ở trang Quizlet set (có URL dạng `quizlet.com/.../...`)
- Đảm bảo trang đã load xong hoàn toàn

### "Không tìm thấy thẻ hợp lệ"
- Kiểm tra xem đã paste đúng dữ liệu CSV chưa
- Đảm bảo dữ liệu có format: `"term","definition"`

### Import bị lỗi
- Thử copy lại từ Quizlet
- Kiểm tra Console có lỗi không
- Thử import ít từ hơn để test

## So sánh với Normal Import

| Feature | Normal Import | Quizlet Import |
|---------|---------------|----------------|
| Nguồn dữ liệu | Word, Excel, text | Quizlet sets |
| Format | Tùy chỉnh delimiter | CSV cố định |
| Setup | Cần chọn delimiter | Tự động |
| Tốc độ | Nhanh | Rất nhanh |
| Phù hợp | Dữ liệu linh hoạt | Import từ Quizlet |

## Kỹ thuật Implementation

### CSV Parser

```typescript
const parseQuizletCSV = (csvText: string) => {
  const lines = csvText.trim().split('\n');
  const cards = [];
  
  // Skip header if exists
  const startIndex = lines[0]?.trim().toLowerCase().startsWith('term') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Match: "text","text"
    const csvRegex = /^"(.*)","(.*)"$|^([^,]+),(.+)$/;
    const match = line.match(csvRegex);
    
    if (match) {
      // Unescape doubled quotes
      const term = (match[1] || match[3] || '').replace(/""/g, '"').trim();
      const definition = (match[2] || match[4] || '').replace(/""/g, '"').trim();
      
      if (term && definition) {
        cards.push({ term, definition });
      }
    }
  }
  
  return cards;
};
```

### Progress Simulation

```typescript
const handleImport = async () => {
  setIsImporting(true);
  const totalCards = previewCards.length;
  const batchSize = 10;
  
  // Simulate progressive import
  for (let i = 0; i < totalCards; i += batchSize) {
    await new Promise(resolve => setTimeout(resolve, 100));
    setImportProgress(Math.min(((i + batchSize) / totalCards) * 100, 100));
  }
  
  // Actually import
  onImport(previewCards);
  setShowSuccess(true);
};
```

## Tips & Tricks

💡 **Bookmark Script**: Lưu script Quizlet vào bookmark để dùng nhanh  
💡 **Batch Import**: Có thể import nhiều sets liên tiếp  
💡 **Preview First**: Luôn xem preview trước khi import  
💡 **Check Count**: Đối chiếu số từ trong Quizlet vs số từ imported

---

**Made with ❤️ for efficient vocabulary learning**

