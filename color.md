# SBS Brand Color Palette - Strategic Brand Solutions

This document defines the core color system, utility tokens, and typography color hierarchy used across the SBS (Strategic Brand Solutions) Admin & Client Portal.

---

## 1. Core Color Scheme

The SBS brand uses a premium, modern palette centered around deep violet and clean slate colors, balanced with semantic indicators for workflow states.

### Primary Brand Colors (Violet & Indigo Accent)
- **Primary Purple (Default Accent)**: `#7c3aed` (HSL 262°, 83%, 58%)
- **Primary Dark**: `#6d28d9` (HSL 263°, 70%, 50%)
- **Primary Light (Border Tint)**: `#a78bfa` (HSL 258°, 94%, 77%)
- **Gradient Combo**: Indigo-to-Violet-to-Emerald
  - `linear-gradient(90deg, #7c3aed 0%, #a78bfa 50%, #10b981 100%)`

### Neutral Grayscale & Typography
- **Text Main (Dark Slate)**: `#0f172a` (HSL 222°, 47%, 11%) — *Used for headings, strong elements, and core labels.*
- **Text Muted (Slate Gray)**: `#64748b` (HSL 215°, 16%, 47%) — *Used for description lines, secondary labels, and footers.*
- **Border Gray**: `#e2e8f0` (HSL 214°, 32%, 91%) — *Used for cards, dividers, and input borders.*
- **Card Background (White)**: `#ffffff` — *Used for card components, modals, and tables.*
- **App Background (Light Gray-Blue)**: `#f1f5f9` (HSL 200°, 24%, 96%) — *Used for dashboard page backgrounds.*
- **Card Light Header**: `#f8fafc` (HSL 210°, 40%, 98%) — *Used for table headers and shaded panel backgrounds.*

---

## 2. Semantic Color Variables

Used to show transaction, project, and workflow status.

### Success / Paid (`verified`)
- **Emerald Green Accent**: `#10b981` (HSL 150°, 84%, 44%)
- **Pill Text**: `#059669` (HSL 150°, 84%, 37%)
- **Pill Background**: `#ecfdf5` (HSL 149°, 80%, 96%)
- **Pill Border**: `#a7f3d0` (HSL 150°, 80%, 80%)

### Warning / Pending (`pending` / `submitted`)
- **Amber Yellow Accent**: `#f59e0b` (HSL 38°, 92%, 50%)
- **Pill Text**: `#d97706` (HSL 36°, 100%, 43%)
- **Pill Background**: `#fefbeb` (HSL 48°, 100%, 97%)
- **Pill Border**: `#fde68a` (HSL 48°, 100%, 88%)

### Info / Action Needed (`first_verified` / `submitted`)
- **Blue Accent**: `#3b82f6` (HSL 221°, 90%, 59%)
- **Pill Text**: `#2563eb` (HSL 224°, 76%, 48%)
- **Pill Background**: `#eff6ff` (HSL 214°, 100%, 97%)
- **Pill Border**: `#bfdbfe` (HSL 213°, 100%, 88%)

### Danger / Rejected (`rejected` / `failed`)
- **Red/Rose Accent**: `#ef4444` (HSL 0°, 84%, 60%)
- **Pill Text**: `#dc2626` (HSL 0°, 72%, 51%)
- **Pill Background**: `#fef2f2` (HSL 0°, 100%, 97%)
- **Pill Border**: `#fca5a5` (HSL 0°, 100%, 83%)

---

## 3. CSS Variable Mapping (`:root`)

Apply these core tokens inside standard stylesheet variables (`index.css` / components):

```css
:root {
  --primary: #7c3aed;
  --primary-dark: #6d28d9;
  --primary-light: #a78bfa;
  --accent: #10b981;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  --bg-light: #f8fafc;
  --bg-card: #ffffff;
  --bg-app: #f1f5f9;
}
```
