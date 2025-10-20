# 📖 Cách hoạt động của ứng dụng

## 🎯 Quy trình học tập

### 1. **Bắt đầu phiên học**
- Nhấn "🚀 Bắt đầu học"
- Ứng dụng hiển thị các thẻ cần ôn tập hôm nay

### 2. **Học từng từ**
- Xem **thuật ngữ** (từ tiếng Anh)
- Nhấn vào thẻ để xem **định nghĩa** (nghĩa tiếng Việt)
- Nhấn 🔊 để nghe phát âm

### 3. **Đánh giá kết quả**

#### ✅ **Nhấn "Đúng"**
- Từ đó tăng 1 cấp độ
- Được lên lịch ôn tập xa hơn
- Chuyển sang từ tiếp theo

**Ví dụ:**
- Đang ở cấp 2 (ôn lại sau 3 ngày)
- Nhấn "Đúng" → Lên cấp 3 (ôn lại sau 7 ngày)

#### ❌ **Nhấn "Sai"**
- Từ đó được lưu vào danh sách cần ôn lại
- **Giảm 1 cấp độ** (không reset về 0 ngay)
- **Sai 2 lần liên tiếp** → Reset về cấp 0
- Chuyển sang từ tiếp theo

**Ví dụ:**
- Đang ở cấp 5 → Nhấn "Sai" → Xuống cấp 4
- Cấp 4 mà lại "Sai" → Reset về cấp 0
- Đang ở cấp 2 → Nhấn "Sai" → Xuống cấp 1

### 4. **Màn hình tổng kết**

**Sau khi học hết tất cả các từ:**

**Hiển thị:**
- ✅ Số từ thuộc (trả lời đúng)
- ❌ Số từ chưa thuộc (trả lời sai)
- 📊 Độ chính xác (%)
- 📝 Danh sách chi tiết các từ sai

**Bạn có 2 lựa chọn:**
1. **"📚 Ôn lại X từ chưa thuộc"** - Học lại ngay các từ sai
2. **"✅ Hoàn thành"** - Kết thúc, các từ sai sẽ xuất hiện trong phiên học sau

### 5. **Lịch trình ôn tập**

Các từ sẽ được lên lịch theo 6 cấp độ:

| Cấp độ | Thời gian ôn lại | Khoảng cách |
|--------|------------------|-------------|
| **0** | Ngay lập tức | Mới học/Sai |
| **1** | 1 ngày sau | +1 ngày |
| **2** | 3 ngày sau | +2 ngày |
| **3** | 7 ngày sau | +4 ngày |
| **4** | 14 ngày sau | +7 ngày |
| **5** | 28 ngày sau | +14 ngày |

## 🔄 Điều gì xảy ra khi trả lời SAI?

### Cơ chế giảm cấp độ:
1. **Sai lần đầu:** Giảm 1 cấp độ
   - Ví dụ: Cấp 5 → Cấp 4, Cấp 3 → Cấp 2
2. **Sai lần 2 liên tiếp:** Reset về cấp 0
   - Ví dụ: Cấp 4 (sai) → Cấp 3 → Cấp 3 (sai lại) → Cấp 0

### Sau khi hoàn thành phiên học:
1. Từ sai được lưu vào danh sách
2. Hiển thị màn hình tổng kết
3. **Bạn chọn:** Học lại ngay HOẶC học sau
4. Nếu không học lại → Từ sẽ xuất hiện trong phiên học tiếp theo

## 💡 Ví dụ thực tế

**Bạn có 5 từ cần học:**
1. Apple (Cấp 3) - ✅ Đúng → Lên cấp 4
2. Book (Cấp 2) - ❌ Sai → Xuống cấp 1
3. Cat (Cấp 0) - ✅ Đúng → Lên cấp 1
4. Dog (Cấp 4) - ❌ Sai → Xuống cấp 3
5. Egg (Cấp 1) - ✅ Đúng → Lên cấp 2

**→ Kết thúc phiên học: 3 đúng, 2 sai**

**Màn hình tổng kết:**
```
🎉 Hoàn thành phiên học!

✅ Thuộc: 3 từ (Apple, Cat, Egg)
❌ Chưa thuộc: 2 từ (Book, Dog)
📊 Độ chính xác: 60%

📝 Các từ cần ôn lại:
- Book (giờ ở cấp 1)
- Dog (giờ ở cấp 3)
```

**Bạn chọn:**
- **"📚 Ôn lại 2 từ chưa thuộc"** → Học ngay
- **"✅ Hoàn thành"** → Kết thúc, 2 từ này sẽ xuất hiện khi đến lịch ôn tập

## 🎯 Lợi ích của cơ chế này

✅ **Giảm cấp thông minh** - Không mất hết tiến độ khi sai 1 lần
✅ **Linh hoạt** - Tự chọn có học lại ngay hay không
✅ **Công bằng** - Sai 2 lần mới reset về đầu
✅ **Theo dõi rõ ràng** - Biết chính xác cấp độ của từng từ
✅ **Động lực cao** - Không nản khi sai vài từ

## 📱 Giao diện

### Khi học từ vựng:
```
Học từ vựng (1/5)
━━━━━━━━━━ 20%

[Thẻ từ vựng]

[Sai ❌] [Đúng ✅]
```

### Màn hình tổng kết:
```
🎉 Hoàn thành phiên học!

✅ Thuộc: 4
❌ Chưa thuộc: 1
📊 Độ chính xác: 80%

📝 Các từ cần ôn lại:
- Dog - Con chó

[📚 Ôn lại 1 từ chưa thuộc] [✅ Hoàn thành]
```

## 🚀 Bắt đầu sử dụng

1. Cài đặt Node.js
2. Chạy `npm install`
3. Chạy `npm start`
4. Thêm từ vựng và bắt đầu học!

Chúc bạn học tập hiệu quả! 📚✨
