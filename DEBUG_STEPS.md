# 🔍 Debug Steps - Tạo Folder/Set không hoạt động

## Cách debug:

1. **Mở Console** (F12 hoặc Ctrl+Shift+I)

2. **Click nút "+"** góc phải
   - Console phải show: `"+ button clicked, current state: false"`
   
3. **Click "Create Folder"**
   - Console phải show:
     ```
     === CREATE FOLDER CLICKED ===
     onCreateNewFolder function: function...
     handleCreateNewFolder called
     Folder name entered: ...
     Creating new folder: {...}
     ```

4. **Click "Create Set"**
   - Console phải show:
     ```
     === CREATE SET CLICKED ===
     onCreateNewSet function: function...
     handleCreateNewSet called
     Set name entered: ...
     Creating new set: {...}
     ```

## Nếu không thấy logs:

### Scenario 1: Không thấy "=== CREATE FOLDER CLICKED ==="
→ Event handler không được gọi
→ Có thể do event propagation bị block

### Scenario 2: Thấy "CLICKED" nhưng không thấy "handleCreateNewFolder called"
→ Function không được pass đúng
→ Check FlashcardManager có pass props không

### Scenario 3: Thấy "called" nhưng không thấy prompt
→ window.prompt bị block bởi browser/popup blocker
→ Check browser settings

## Quick Fix Test:

Thử paste code này vào Console:

```javascript
// Test if handlers exist
console.log('Testing handlers...');
const homeProps = window.React?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current;
console.log('Home component props:', homeProps);
```

## Expected Flow:

```
User clicks "+"
  ↓
showCreationMenu = true
  ↓
Menu appears
  ↓
User clicks "Create Folder"
  ↓
console.log "=== CREATE FOLDER CLICKED ==="
  ↓
setShowCreationMenu(false)
  ↓
onCreateNewFolder()
  ↓
console.log "handleCreateNewFolder called"
  ↓
window.prompt("Tên folder mới:")
  ↓
User enters name
  ↓
dispatch CREATE_FOLDER
  ↓
Navigate to folders page
```

## Common Issues:

1. **Popup blocker**: Disable trong browser settings
2. **Event propagation**: Thêm stopPropagation
3. **React state**: Menu ref không đúng
4. **Props not passed**: Check FlashcardManager

## Temporary Workaround:

Nếu vẫn không work, thử click vào "Manage Folders & Sets" button ở home page, rồi tạo folder/set từ đó.

