# 📚 Hướng dẫn Push lên Git

## 🎯 **Tại sao nên push lên Git?**

✅ **Backup code** - Không sợ mất code
✅ **Chia sẻ dễ dàng** - Bạn bè clone về
✅ **Version control** - Theo dõi thay đổi
✅ **Làm việc nhóm** - Nhiều người cùng code
✅ **Deploy dễ** - Kết nối Vercel/Netlify

## 🚀 **Bước 1: Tạo repository trên GitHub**

### **1.1. Tạo tài khoản GitHub (nếu chưa có):**
- Truy cập [github.com](https://github.com)
- Nhấn "Sign up"
- Làm theo hướng dẫn

### **1.2. Tạo repository mới:**
1. **Nhấn "New repository"** (góc phải trên)
2. **Đặt tên:** `vocabulary-flashcard-app`
3. **Description:** "Ứng dụng học từ vựng với spaced repetition"
4. **Chọn:** Public hoặc Private
5. **KHÔNG tick** "Initialize with README" (đã có README.md)
6. **Nhấn "Create repository"**

## 💻 **Bước 2: Push code lên Git**

### **2.1. Cài đặt Git (nếu chưa có):**
- Tải từ [git-scm.com](https://git-scm.com)
- Cài đặt với tùy chọn mặc định

### **2.2. Kiểm tra Git:**
```bash
git --version
```

### **2.3. Cấu hình Git (lần đầu):**
```bash
git config --global user.name "Tên của bạn"
git config --global user.email "email@example.com"
```

### **2.4. Khởi tạo Git trong project:**
```bash
# Trong thư mục D:\quizlet
git init
```

### **2.5. Thêm remote repository:**
```bash
# Thay YOUR_USERNAME bằng username GitHub của bạn
git remote add origin https://github.com/YOUR_USERNAME/vocabulary-flashcard-app.git
```

### **2.6. Add và commit code:**
```bash
# Add tất cả files (trừ những file trong .gitignore)
git add .

# Commit với message
git commit -m "Initial commit: Vocabulary Flashcard Desktop App"
```

### **2.7. Push lên GitHub:**
```bash
# Push lên branch main
git push -u origin main
```

**Lưu ý:** Có thể cần đăng nhập GitHub trong terminal

## 🔐 **Bước 3: Xác thực GitHub**

### **Cách 1: Personal Access Token (Khuyến nghị)**

1. **Tạo token:**
   - Vào GitHub → Settings → Developer settings
   - Personal access tokens → Tokens (classic)
   - Generate new token
   - Chọn scope: `repo`
   - Copy token

2. **Sử dụng token:**
   - Khi push, nhập username
   - Password: Dán token vừa copy

### **Cách 2: GitHub CLI**
```bash
# Cài đặt GitHub CLI
winget install --id GitHub.cli

# Đăng nhập
gh auth login
```

## 📤 **Bước 4: Chia sẻ với bạn bè**

### **Cách 1: Clone repository (Cho bạn biết code)**
```bash
# Bạn bè chạy:
git clone https://github.com/YOUR_USERNAME/vocabulary-flashcard-app.git
cd vocabulary-flashcard-app
npm install
npm start
```

### **Cách 2: Chỉ gửi file .exe (Cho bạn bè chỉ dùng)**
- Gửi file `dist/Vocabulary Flashcard Setup 1.0.0.exe`
- Bạn bè cài đặt như app bình thường

## 🔄 **Update code trên Git:**

### **Khi có thay đổi:**
```bash
# Xem files đã thay đổi
git status

# Add files mới/thay đổi
git add .

# Commit với message
git commit -m "Add edit/delete features"

# Push lên GitHub
git push
```

## 🌿 **Git workflow:**

```
1. Sửa code
2. git add .
3. git commit -m "Message mô tả thay đổi"
4. git push
5. Lặp lại
```

## 📋 **Các lệnh Git cơ bản:**

```bash
# Xem trạng thái
git status

# Xem lịch sử commit
git log --oneline

# Xem thay đổi
git diff

# Pull code mới từ GitHub
git pull

# Tạo branch mới
git checkout -b feature-name

# Chuyển branch
git checkout main

# Merge branch
git merge feature-name
```

## ⚠️ **Những file KHÔNG nên push:**

File `.gitignore` đã được tạo sẵn với:
- `node_modules/` - Dependencies (quá lớn)
- `build/` - File build React
- `dist/` - File build Electron
- `*.exe` - File executable

**Lý do:** Những file này:
- Quá lớn (hàng trăm MB)
- Có thể tạo lại bằng `npm install` và `npm run build`
- Không cần backup

## 🎯 **Repository structure trên Git:**

```
vocabulary-flashcard-app/
├── src/                 # Source code
├── public/              # Static files + electron.js
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── .gitignore          # Files to ignore
└── README.md           # Documentation
```

## 🔗 **URL repository mẫu:**

```
https://github.com/YOUR_USERNAME/vocabulary-flashcard-app
```

Chia sẻ URL này cho bạn bè để họ clone code!

## 💡 **Tips:**

### **Push lần đầu lỗi?**
```bash
# Nếu branch là master thay vì main
git push -u origin master

# Nếu có conflict
git pull --rebase origin main
git push
```

### **Quên commit message?**
- Nên viết message rõ ràng
- Ví dụ: "Add desktop app support"
- Tránh: "update", "fix"

### **Push file quá lớn?**
- Kiểm tra `.gitignore`
- Xóa cache: `git rm -r --cached .`
- Add lại: `git add .`

---

**Bạn đã sẵn sàng push code lên Git! 🚀**

**Câu hỏi cho bạn:**
1. Bạn đã có tài khoản GitHub chưa?
2. Bạn muốn repository Public hay Private?
3. Bạn cần hỗ trợ push lên Git không?
