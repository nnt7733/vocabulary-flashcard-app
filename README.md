# 📚 Vocabulary Flashcard App

Ứng dụng học từ vựng với hệ thống spaced repetition giống Anki, được xây dựng bằng React và TypeScript.

## ✨ Tính năng

- **Spaced Repetition**: Hệ thống lặp lại theo khoảng cách thời gian tối ưu (6 lần theo lịch trình)
- **Import dữ liệu**: Nhập từ vựng theo 2 cách giống Quizlet (Tab/Comma + Newline/Semicolon)
- **Text-to-Speech**: Phát âm từ tiếng Anh tự động
- **Giao diện đơn giản**: Không cần chọn mục học, tất cả ở một nơi
- **Lưu trữ local**: Dữ liệu được lưu trong trình duyệt

## 🚀 Cài đặt và chạy

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Chạy ứng dụng:**
   ```bash
   npm start
   ```

3. **Mở trình duyệt:**
   Truy cập `http://localhost:3000`

## 📖 Cách sử dụng

### 1. Thêm từ vựng mới
- Nhấn nút "➕ Thêm từ mới"
- Chọn cách phân cách giữa từ và định nghĩa (Tab hoặc Phẩy)
- Chọn cách phân cách giữa các thẻ (Dòng mới hoặc Chấm phẩy)
- Dán dữ liệu vào ô text và nhấn "Nhập"

### 2. Học từ vựng
- Nhấn "🚀 Bắt đầu học" để bắt đầu phiên học
- Nhấn vào thẻ để xem định nghĩa
- Nhấn nút "Đúng ✅" hoặc "Sai ❌" sau khi xem định nghĩa
- Nhấn biểu tượng 🔊 để nghe phát âm

### 3. Lịch trình lặp lại
Hệ thống sẽ tự động sắp xếp thời gian ôn tập theo lịch trình:
- **Lần 1**: Ngày 0 (học lần đầu)
- **Lần 2**: Ngày 1 (1 ngày sau)
- **Lần 3**: Ngày 3 (2 ngày sau lần 2)
- **Lần 4**: Ngày 7 (4 ngày sau lần 3)
- **Lần 5**: Ngày 14 (7 ngày sau lần 4)
- **Lần 6**: Ngày 28 (14 ngày sau lần 5)

## 🛠️ Công nghệ sử dụng

- **React 18** - UI framework
- **TypeScript** - Type safety
- **CSS3** - Styling với responsive design
- **Web Speech API** - Text-to-speech
- **localStorage** - Lưu trữ dữ liệu

## 📱 Responsive Design

Ứng dụng được thiết kế responsive, hoạt động tốt trên:
- Desktop
- Tablet
- Mobile

## 🎯 Lợi ích

- **Hiệu quả học tập cao**: Spaced repetition giúp ghi nhớ lâu dài
- **Giao diện thân thiện**: Dễ sử dụng, không phức tạp
- **Tự động hóa**: Không cần quản lý lịch học thủ công
- **Linh hoạt**: Import dữ liệu từ nhiều nguồn khác nhau
