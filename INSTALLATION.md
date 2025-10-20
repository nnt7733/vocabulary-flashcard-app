# 📥 Hướng dẫn cài đặt

## 🖥️ Yêu cầu hệ thống

### **Windows**
- Windows 10 hoặc mới hơn
- RAM: 4GB trở lên
- Dung lượng: 200MB trống

### **macOS**
- macOS 10.14 (Mojave) hoặc mới hơn
- RAM: 4GB trở lên
- Dung lượng: 200MB trống

### **Linux**
- Ubuntu 18.04+ hoặc tương đương
- RAM: 4GB trở lên
- Dung lượng: 200MB trống

## 🚀 Cài đặt nhanh

### **Bước 1: Tải file cài đặt**
1. Vào [Releases](https://github.com/nnt7733/vocabulary-flashcard-app/releases)
2. Tải file phù hợp với hệ điều hành:
   - **Windows:** `Vocabulary Flashcard Setup 1.0.0.exe`
   - **macOS:** `Vocabulary Flashcard-1.0.0.dmg`
   - **Linux:** `Vocabulary Flashcard-1.0.0.AppImage`

### **Bước 2: Cài đặt**

#### **Windows:**
1. Double-click file `.exe`
2. Nếu Windows hỏi "Windows protected your PC":
   - Nhấn **"More info"**
   - Nhấn **"Run anyway"**
3. Làm theo hướng dẫn cài đặt
4. Chọn tạo shortcut Desktop và Start Menu

#### **macOS:**
1. Double-click file `.dmg`
2. Kéo app vào thư mục Applications
3. Mở app từ Applications hoặc Launchpad

#### **Linux:**
1. Cấp quyền thực thi: `chmod +x Vocabulary Flashcard-1.0.0.AppImage`
2. Chạy: `./Vocabulary Flashcard-1.0.0.AppImage`

## 🔧 Cài đặt từ source code

### **Yêu cầu:**
- Node.js 16+ 
- npm hoặc yarn

### **Các bước:**
```bash
# Clone repository
git clone https://github.com/nnt7733/vocabulary-flashcard-app.git
cd vocabulary-flashcard-app

# Cài đặt dependencies
npm install

# Chạy development mode
npm run electron:dev

# Build cho production
npm run electron:build-win    # Windows
npm run electron:build-mac    # macOS
npm run electron:build-linux  # Linux
```

## ⚠️ Xử lý sự cố

### **Lỗi "Windows protected your PC"**
- **Nguyên nhân:** App chưa được ký số
- **Giải pháp:** Nhấn "More info" → "Run anyway"

### **App không mở**
- **Kiểm tra:** Task Manager xem có process không
- **Thử:** Chạy lại file cài đặt
- **Alternative:** Chạy development mode

### **Mất dữ liệu**
- **Windows:** `C:\Users\[Tên]\AppData\Roaming\Vocabulary Flashcard\`
- **macOS:** `~/Library/Application Support/Vocabulary Flashcard/`
- **Linux:** `~/.config/Vocabulary Flashcard/`

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra [Issues](https://github.com/nnt7733/vocabulary-flashcard-app/issues)
2. Tạo issue mới với mô tả chi tiết
3. Liên hệ tác giả qua GitHub
