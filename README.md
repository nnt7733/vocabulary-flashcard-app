# 📚 Vocabulary Flashcard App

<div align="center">

![App Logo](https://img.shields.io/badge/Vocabulary-Flashcard-blue?style=for-the-badge&logo=book)
![Version](https://img.shields.io/badge/Version-2.1.0-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Ứng dụng học từ vựng thông minh với hệ thống lặp lại ngắt quãng (Spaced Repetition)**

[![Download](https://img.shields.io/badge/Download-Latest%20Release-brightgreen?style=for-the-badge&logo=download)](https://github.com/nnt7733/vocabulary-flashcard-app/releases)
[![GitHub Stars](https://img.shields.io/github/stars/nnt7733/vocabulary-flashcard-app?style=for-the-badge&logo=github)](https://github.com/nnt7733/vocabulary-flashcard-app/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/nnt7733/vocabulary-flashcard-app?style=for-the-badge&logo=github)](https://github.com/nnt7733/vocabulary-flashcard-app/network)

</div>

---

## ✨ Tính năng nổi bật

### 🧠 **Hệ thống học tập thông minh**
- **Spaced Repetition Algorithm** - Tối ưu hóa thời gian học tập
- **6 cấp độ học tập** - Từ cơ bản đến nâng cao
- **Tự động lên lịch** - Học đúng thời điểm để ghi nhớ lâu dài

### 🎯 **Giao diện thân thiện**
- **Thiết kế hiện đại** - UI/UX tối ưu cho việc học
- **Hoạt động mượt mà** - 60fps, không lag
- **Tương thích đa nền tảng** - Windows, macOS, Linux

### 🔊 **Hỗ trợ phát âm**
- **Text-to-Speech** - Phát âm tiếng Anh chuẩn
- **Học bằng tai** - Cải thiện kỹ năng nghe
- **Tích hợp sẵn** - Không cần cài đặt thêm

### 📊 **Quản lý từ vựng**
- **Thêm/Sửa/Xóa** từ vựng dễ dàng
- **Import hàng loạt** - Nhập nhiều từ cùng lúc
- **Thống kê học tập** - Theo dõi tiến độ

---

## 🚀 Cài đặt và sử dụng

### **📥 Tải xuống**
1. Vào [Releases](https://github.com/nnt7733/vocabulary-flashcard-app/releases)
2. Tải file `Vocabulary Flashcard Setup 1.0.0.exe`
3. Chạy file cài đặt và làm theo hướng dẫn

### **⚡ Chạy nhanh**
```bash
# Clone repository
git clone https://github.com/nnt7733/vocabulary-flashcard-app.git
cd vocabulary-flashcard-app

# Cài đặt dependencies
npm install

# Chạy development mode
npm run electron:dev

# Build cho production
npm run electron:build-win
```

---

## 🎮 Cách sử dụng

### **1. Thêm từ vựng mới**
- Nhấn **"➕ Thêm từ mới"**
- Nhập từ tiếng Anh và nghĩa tiếng Việt
- Hỗ trợ import hàng loạt theo format Quizlet

### **2. Bắt đầu học**
- Nhấn **"🚀 Bắt đầu học"**
- Xem từ tiếng Anh → đoán nghĩa
- **Vuốt phải** nếu biết, **vuốt trái** nếu chưa biết
- Nghe phát âm bằng nút 🔊

### **3. Quản lý từ vựng**
- Nhấn **"📝 Quản lý từ vựng"**
- Xem danh sách tất cả từ
- **Edit** để sửa từ
- **Delete** để xóa từ
- **Xóa tất cả** để reset

---

## 🧠 Hệ thống học tập

### **📈 Cơ chế Spaced Repetition**

| Cấp độ | Thời gian lặp lại | Mô tả |
|--------|------------------|-------|
| **Cấp 0** | 0 ngày | Học ngay lập tức |
| **Cấp 1** | 1 ngày | Học sau 1 ngày |
| **Cấp 2** | 3 ngày | Học sau 3 ngày |
| **Cấp 3** | 7 ngày | Học sau 1 tuần |
| **Cấp 4** | 14 ngày | Học sau 2 tuần |
| **Cấp 5** | 28 ngày | Học sau 1 tháng |

### **🎯 Quy tắc học tập**
- ✅ **Trả lời đúng** → Tăng 1 cấp độ
- ❌ **Trả lời sai** → Giảm 1 cấp độ  
- 🔄 **Sai 2 lần liên tiếp** → Reset về cấp 0

---

## 🛠️ Công nghệ sử dụng

### **Frontend**
- **React 18** - UI Framework hiện đại
- **TypeScript** - Type safety và developer experience
- **CSS3** - Styling và animations

### **Desktop App**
- **Electron** - Cross-platform desktop wrapper
- **Node.js** - Backend runtime
- **Web Speech API** - Text-to-speech

### **Build Tools**
- **Create React App** - Development environment
- **Electron Builder** - Packaging và distribution
- **Webpack** - Module bundling

---

## 📊 Thống kê dự án

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/nnt7733/vocabulary-flashcard-app?style=for-the-badge)
![GitHub language count](https://img.shields.io/github/languages/count/nnt7733/vocabulary-flashcard-app?style=for-the-badge)
![GitHub top language](https://img.shields.io/github/languages/top/nnt7733/vocabulary-flashcard-app?style=for-the-badge)

</div>

### **📈 Code Statistics**
- **25+ files** source code
- **2,000+ lines** TypeScript/JavaScript
- **100% TypeScript** coverage
- **Zero dependencies** runtime

---

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp! Hãy:

1. **Fork** repository này
2. Tạo **feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. **Push** lên branch (`git push origin feature/AmazingFeature`)
5. Mở **Pull Request**

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Tác giả

**nnt7733** - *Initial work* - [GitHub Profile](https://github.com/nnt7733)

---

## 💝 Hỗ trợ dự án

Nếu ứng dụng này hữu ích với bạn, hãy ủng hộ tác giả để phát triển thêm tính năng mới!

<div align="center">

### 💳 Thông tin chuyển khoản

**🏦 Ngân hàng:** MB Bank  
**💳 Số tài khoản:** `0396202885`  
**👤 Tên tài khoản:** `NGUYEN NGOC THOAI`

### 📱 QR Code

<div align="center">

**🔧 Cách tạo QR Code chuyển khoản MB Bank:**

1. **Mở app MB Bank** trên điện thoại
2. **Đăng nhập** vào tài khoản
3. **Chọn "Quét QR"** → **"QR nhận tiền"**
4. **Lưu QR code** và upload lên đây

**📱 Hoặc sử dụng QR Code Generator:**
- Vào [MB Bank QR Generator](https://mbbank.com.vn/qr-generator)
- Nhập: **0396202885**
- Tên: **NGUYEN NGOC THOAI**
- Tạo và tải QR code

**📋 Xem hướng dẫn chi tiết:** [DONATE.md](DONATE.md)

</div>

</div>

---

<div align="center">

### ⭐ Nếu thích dự án, hãy cho một star!

[![GitHub stars](https://img.shields.io/github/stars/nnt7733/vocabulary-flashcard-app?style=social)](https://github.com/nnt7733/vocabulary-flashcard-app/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/nnt7733/vocabulary-flashcard-app?style=social)](https://github.com/nnt7733/vocabulary-flashcard-app/network)

**Made with ❤️ by nnt7733**

</div>
