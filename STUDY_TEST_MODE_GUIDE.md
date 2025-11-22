# 📖 Study & Test Mode - Complete Guide

## ✨ Tính năng mới

Hệ thống học tập 2 chế độ hoàn toàn mới với Favorites và Study Again!

## 🎯 2 Chế Độ Học Tập

### 📖 **Study Mode** (Học không áp lực)
**Mục đích**: Làm quen với từ vựng, không lo sợ sai

**Đặc điểm**:
- ✅ Không tracking tiến độ
- ✅ Không tăng/giảm level
- ✅ Không đánh dấu "learned"
- ✅ Chỉ tập trung vào việc học
- ✅ Hiển thị accuracy sau khi xong (chỉ để tham khảo)

**Khi nào dùng**:
- Lần đầu học set mới
- Ôn lại từ cũ không muốn ảnh hưởng progress
- Study Again sau khi hoàn thành

### ✅ **Test Mode** (Kiểm tra mastery)
**Mục đích**: Đánh giá thực lực, tăng cấp độ

**Đặc điểm**:
- ✅ Track từng câu trả lời
- ✅ Đúng → Tăng 1 level
- ✅ Sai → Giảm 1 level  
- ✅ Đánh dấu từ "learned" khi thuộc
- ✅ Lưu vào study session history

**Khi nào dùng**:
- Đã study qua rồi, muốn test
- Muốn level up và track progress
- Ôn tập theo lịch spaced repetition

## ⭐ Favorite Words

### Đánh dấu Favorite:
1. Vào **"Manage Cards"**
2. Click icon **☆** (star rỗng) bên cạnh từ
3. Star sẽ chuyển thành **⭐** (vàng)
4. Click lại để bỏ favorite

### Study Favorites Only:
1. Trong set detail page
2. Nếu có favorites, sẽ hiện nút **"📚 All Cards"** / **"⭐ Favorites Only"**
3. Click để toggle
4. Khi bật Favorites Only:
   - Chỉ study những từ đã đánh dấu ⭐
   - Button đổi thành **"🚀 Study Favorites"**

## 🔄 Study Again

Sau khi hoàn thành set (Study hoặc Test):

### Study Again button:
- Xuất hiện ngay trong Session Summary
- Text: **"🔄 Study lại set này"**
- Click để restart set

### Đặc điểm Study Again:
- ✅ Chạy trong **Study Mode** (không ảnh hưởng progress)
- ✅ Hiển thị accuracy rate cuối cùng
- ✅ Không level up/down
- ✅ Perfect để ôn lại ngay lập tức

## 📱 User Flow

### Flow 1: Học set mới lần đầu

```
1. Click "🚀 Start Learning"
   ↓
2. Chọn mode:
   ┌─────────────────────┬─────────────────────┐
   │  📖 Study Mode      │  ✅ Test Mode       │
   │  Learn without      │  Check mastery      │
   │  pressure           │  and level up       │
   └─────────────────────┴─────────────────────┘
   ↓
3. (Chọn Study cho lần đầu)
   ↓
4. Study cards...
   ↓
5. Summary hiện:
   - Accuracy: 75%
   - "📖 Study Complete!"
   - "Đã xem 20 thẻ (chỉ học, chưa test)"
   - Buttons: [🔄 Study lại] [✅ Hoàn thành]
   ↓
6. Click "Study lại" → Ôn ngay lập tức
   OR
   Click "Hoàn thành" → Quay về set
```

### Flow 2: Test để level up

```
1. Click "🚀 Start Learning"
   ↓
2. Chọn "✅ Test Mode"
   ↓
3. Test cards...
   ↓
4. Summary hiện:
   - Accuracy: 85%
   - "🎉 Test Complete!"
   - "Đã hoàn thành 20 thẻ từ vựng"
   - Progress ĐÃ ĐƯỢC CẬP NHẬT ✅
   - Buttons: [🔄 Study lại] [✅ Hoàn thành]
```

### Flow 3: Study Favorites Only

```
1. Đánh dấu vài từ quan trọng ⭐
   ↓
2. Trong set detail, click "⭐ Favorites Only"
   ↓
3. Click "🚀 Study Favorites"
   ↓
4. Chọn Study/Test mode
   ↓
5. Chỉ học những từ favorite!
```

## 🎨 UI Elements

### Mode Selector Dialog:
```
┌──────────────────────────────────────┐
│     Choose Learning Mode             │
│     Set Name Here                    │
│                                      │
│  ┌──────────────┐  ┌──────────────┐ │
│  │ 📖           │  │ ✅           │ │
│  │ Study Mode   │  │ Test Mode    │ │
│  │ Learn and    │  │ Check mastery│ │
│  │ review...    │  │ and level up │ │
│  │              │  │              │ │
│  │ • No progress│  │ • Track...   │ │
│  │ • No level...│  │ • Level up...│ │
│  └──────────────┘  └──────────────┘ │
│                                      │
│         [Cancel]                     │
└──────────────────────────────────────┘
```

### Session Summary (Study Mode):
```
📖 Study Complete!
Đã xem 20 thẻ (chỉ học, chưa test)

Correct: 15 | Incorrect: 5 | Accuracy: 75%

📖 Study Mode: Phiên học này không ảnh hưởng
   đến tiến độ hay cấp độ của từ vựng.

[🔄 Study lại set này] [✅ Hoàn thành]
```

### Session Summary (Test Mode):
```
🎉 Test Complete!
Đã hoàn thành 20 thẻ từ vựng

Correct: 17 | Incorrect: 3 | Accuracy: 85%

💡 Cơ chế học tập:
• Trả lời đúng → Tăng 1 cấp độ
• Trả lời sai → Giảm 1 cấp độ
...

[🔄 Study lại set này] [✅ Hoàn thành]
```

## 🔧 Technical Implementation

### Types Updated:
```typescript
interface Flashcard {
  // ... existing fields
  isFavorite?: boolean; // NEW
}

interface AppState {
  // ... existing fields
  learningMode: 'study' | 'test' | null; // NEW
  showFavoritesOnly: boolean; // NEW
}

interface StudySessionResult {
  // ... existing fields
  learningMode: 'study' | 'test'; // NEW
}
```

### Components Created:
- **StudyModeSelector.tsx**: Beautiful dialog to choose Study/Test
- **CreateDialog.tsx**: Custom dialog (replaces window.prompt for Electron)

### Components Updated:
- **StudySession.tsx**: Respects learningMode, only updates in Test mode
- **SessionSummary.tsx**: Shows mode-specific messages, Study Again button
- **FlashcardList.tsx**: Favorite toggle (⭐/☆)
- **FlashcardManager.tsx**: Mode selector integration, favorites filter

## 📊 Progress Tracking Logic

### Study Mode:
```javascript
const updatedCard = learningMode === 'study' 
  ? previousCardState  // NO CHANGE
  : updateCardAfterReview(previousCardState, correct);
```

### Test Mode:
```javascript
// Full spaced repetition logic applies
- Correct → Level up
- Incorrect → Level down
- Track in session history
- Update nextReviewDate
```

## 🎮 Keyboard Shortcuts

During study/test:
- **Space**: Flip card
- **→ Arrow**: I know this (correct)
- **← Arrow**: I don't know (incorrect)
- **S**: Speak word (TTS)
- **ESC**: Exit session

## 💡 Best Practices

### Recommended Workflow:

1. **First Time**:
   - Import words
   - **📖 Study Mode** → Get familiar
   - Mark important words as ⭐ Favorites

2. **Practice**:
   - **🔄 Study Again** → Review without pressure
   - Check accuracy (should be improving!)

3. **Mastery Check**:
   - **✅ Test Mode** → Level up!
   - Only test when confident

4. **Maintenance**:
   - **⭐ Favorites Only** → Focus on hard words
   - Mix Study and Test modes as needed

## 🆚 Comparison

| Feature | Study Mode | Test Mode |
|---------|------------|-----------|
| **Progress** | ❌ No change | ✅ Updates |
| **Level** | ❌ No change | ✅ Up/Down |
| **Learned status** | ❌ No change | ✅ Marks learned |
| **Session history** | ❌ Not saved | ✅ Saved |
| **Accuracy shown** | ✅ Yes | ✅ Yes |
| **Pressure** | 🟢 Low | 🔴 High |
| **Best for** | Learning | Testing |

## 🚀 Quick Start

1. Create a set and add words
2. Click "🚀 Start Learning"
3. Choose "📖 Study Mode" first time
4. Study all cards, see accuracy
5. Click "🔄 Study lại" to review
6. When confident, choose "✅ Test Mode"
7. Level up your words!
8. Mark hard words as ⭐ Favorites
9. Study favorites only when needed

---

**Made with ❤️ for effective vocabulary learning**

