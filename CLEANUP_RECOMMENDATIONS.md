# TRAE Unity AI Platform - Cleanup Recommendations

## 🎯 **Current System Analysis**

**Status**: ✅ **FULLY OPERATIONAL**  
**Configuration**: Multi-monitor desktop streaming working perfectly  
**Services**: All running on correct ports (WebSocket: 8085, Frontend: 5174)

---

## 🗑️ **FILES TO DELETE** (Safe to Remove)

### **Debug & Test Files** 
```bash
# Debug images (generated during testing)
debug_windows_full_desktop_1754475108.png
debug_windows_monitor_0_1754475108.png  
debug_windows_monitor_1_1754475108.png
debug_windows_monitor_2_1754475108.png
debug_windows_monitor_3_1754475108.png

# Debug Python scripts (temporary)
debug_monitor_coordinates.py
debug_windows_monitors.py

# Test files
test.txt
test_dual_screen.py
dual_screen_capture_client.py  # Duplicate of desktop-client version

# Generated test spec
addallnodes_6dc33ecb-b8c2-4e10-b113-98c25c70f45a.spec.ts
```

### **Test Output Directory** 
```bash
# FFmpeg test outputs (can be regenerated)
test-output/
├── audio.mp3
├── compressed.mp4  
├── test-video.mp4
└── thumbnail.jpg
```

### **Playwright Test Results**
```bash
# Test results (regenerated on each run)
test-results/
└── .last-run.json

# Playwright reports (regenerated)
playwright-report/
└── index.html
```

---

## ⚠️ **FILES TO REVIEW** (Potential Cleanup)

### **Redundant Scripts**
```bash
# Multiple startup scripts - consider consolidating
start-application.bat     # ❓ Redundant with .ps1 version?
start-application.sh      # ❓ Linux version - needed?
start-claude-on-secondary-monitor.ps1  # ❓ Specific use case?
test-secondary-monitor.ps1  # ❓ Testing script?

# Setup scripts
setup-ffmpeg.ps1         # ❓ Duplicate of .bat version?
setup-ngrok.ps1          # ❓ Ngrok needed for current setup?
```

### **Configuration Files**
```bash
# Vercel deployment (if not using Vercel)
.vercel/
└── project.json

# Ngrok configuration (if not using ngrok)
ngrok.yml

# Bun lockfile (if using npm)
bun.lockb               # ❓ Using npm or bun?
```

### **Frontend Directory**
```bash
# Empty frontend directory structure
frontend/
└── src/
    ├── config/
    └── types/
# ❓ Seems unused - main frontend is in src/
```

---

## 🔧 **CONFIGURATION FIXES NEEDED**

### **1. Vite Configuration** ⚠️ **NEEDS UPDATE**
**File**: `vite.config.ts`  
**Issue**: Port configured as 5173, but running on 5174  
**Fix**: Update default port to avoid conflicts

```typescript
// Current (line 9)
port: 5173,

// Recommended
port: 5174,
```

### **2. Package.json Scripts** ✅ **GOOD**
All npm scripts are functional and necessary for the current setup.

---

## 📁 **DIRECTORIES TO KEEP** (Essential)

### **Core Application**
- `src/` - Main frontend application ✅
- `desktop-client/` - Python capture clients ✅  
- `backend/` - Backend services ✅
- `supabase/` - Database functions ✅

### **Configuration**
- `config/` - Project configuration ✅
- `public/` - Static assets ✅
- `tools/ffmpeg/` - FFmpeg binaries ✅

### **Scripts** 
- `scripts/` - Repository management ✅
- Essential startup/stop scripts ✅

### **Documentation**
- `docs/` - Project documentation ✅
- `README.md`, `STARTUP_GUIDE.md` etc. ✅

---

## 🎯 **RECOMMENDED CLEANUP ACTIONS**

### **Phase 1: Safe Deletions** (No Risk)
```powershell
# Delete debug files
Remove-Item debug_windows_*.png
Remove-Item debug_*.py
Remove-Item test.txt, test_dual_screen.py
Remove-Item dual_screen_capture_client.py
Remove-Item addallnodes_*.spec.ts

# Delete test outputs (can be regenerated)
Remove-Item -Recurse test-output/
Remove-Item -Recurse test-results/
Remove-Item -Recurse playwright-report/
```

### **Phase 2: Configuration Updates** (Low Risk)
```typescript
// Update vite.config.ts port
server: {
  host: "::",
  port: 5174,  // Changed from 5173
}
```

### **Phase 3: Review & Decide** (Manual Review)
- Evaluate if Vercel deployment is needed
- Check if ngrok configuration is required
- Decide between npm vs bun (remove unused lockfile)
- Review redundant startup scripts

---

## 📊 **CLEANUP IMPACT**

### **Disk Space Savings**
- Debug images: ~15-20 MB
- Test outputs: ~5-10 MB  
- Test results: ~1-2 MB
- **Total**: ~20-30 MB

### **Repository Cleanliness**
- Removes 15+ temporary/debug files
- Eliminates confusion from duplicate scripts
- Improves repository navigation

### **Maintenance Benefits**
- Clearer project structure
- Reduced file clutter
- Easier onboarding for new developers

---

## ✅ **CURRENT STATUS SUMMARY**

**Working Configuration**: Perfect ✅  
**All Services**: Running smoothly ✅  
**Multi-Monitor**: Fully functional ✅  
**Scripts**: Properly categorized ✅  

**Next Step**: Execute safe cleanup actions to optimize repository structure while maintaining full functionality.