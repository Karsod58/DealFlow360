# DealFlow360 - Quick Start Guide

## Prerequisites

- Node.js v20+ (you have v20.11.0)
- npm v10+ (you have v10.2.4)

## Installation & Running

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies (Already Done)
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

The app will start at **http://localhost:3000**

## Testing the Application

### Screen 1: Login
1. Open **http://localhost:3000** (redirects to `/login`)
2. Enter any email and password (mock auth)
3. Click "Log In"
4. You'll be redirected to the Dashboard

### Screen 2: Dashboard
1. See three stat cards with mock numbers
2. Click any stat card to navigate to that module
3. Click "+ New Quotation" to create a new draft quotation
4. See recent activity feed

### Screen 3: Quotations List
1. From Dashboard, click "Open Quotations" stat card OR
2. Navigate to `/quotations` via navbar
3. See Kanban board with 5 columns
4. Use search bar to filter by customer name
5. Click any card to open detail view

### Screen 4: Quotation Detail (The Core Screen!)
1. Click "Acme Corp - $12,400" card from Draft column
2. See Q-1042 with 3 line items
3. **Test Live Discount Validation:**
   - Line 2 (Onsite Setup) has 18% discount with 10% limit
   - Status shows "OVER +8pt" (red badge)
   - Risk Score badge shows "8pt (Low)"
   - Change discount to 9% → status becomes "OK" (green)
   - Change back to 18% → status becomes "OVER +8pt" again
   - Blended score updates in real-time!

4. **Test Quantity Changes:**
   - Change quantity of any item
   - Total recalculates automatically

5. **Add Upsell Products:**
   - Click "+" on any suggestion card
   - Product appears in line items table
   - Total updates

6. **Remove Items:**
   - Click trash icon on any line item
   - Item removed, total updates

7. **Submit for Approval:**
   - If all discounts are within limits (blended score = 0):
     - Status becomes "Approved" automatically
   - If any discount exceeds limit (blended score > 0):
     - Status becomes "Pending Approval"

## Key Features to Test

### ✅ Tab Toggle (Login Screen)
- Switch between Login and Sign Up
- Sign Up shows role selector

### ✅ Search (Quotations List)
- Type "Acme" → only Acme Corp shown
- Type "Beta" → only Beta Industries shown
- Clear search → all quotations shown

### ✅ Live Calculations (Quotation Detail)
```
Example with Q-1042:
├─ Laptop Pro 14 (2 × $1,299)
│  └─ 12% discount (limit 15%) → OK → $2,286.24
├─ Onsite Setup (1 × $450)
│  └─ 18% discount (limit 10%) → OVER +8pt → $369
├─ Extended Warranty (1 × $199)
│  └─ 5% discount (limit 15%) → OK → $189.05
└─ Blended Score: 8pt (from line 2 overage)
```

Change Onsite Setup discount from 18% to 9%:
```
├─ Onsite Setup (1 × $450)
│  └─ 9% discount (limit 10%) → OK → $409.50
└─ Blended Score: 0pt → Auto-approved!
```

### ✅ Navigation Flow
```
Login → Dashboard → Quotations List → Quotation Detail
  ↓                    ↓
Portal             New Quote
```

### ✅ Risk Score Badge
- Score = 0: Green "No Risk (Auto-approved)"
- Score < 5: Blue "Low"
- Score 5-14: Yellow "Medium"
- Score ≥ 15: Red "High"

## Mock Data Exploration

### Pre-loaded Quotations
1. **Q-1042 (Acme Corp)** - Draft - $12,400
   - Has 3 line items with mixed status
   - Good for testing discount validation

2. **Q-1038 (Delta LLC)** - Draft - $5,200
   - Empty (no line items)
   - Good for testing fresh quotation

3. **Q-1035 (Beta Industries)** - Pending Approval - $28,600
   - High-value deal with risk score 12

4. **Q-1029 (Nova Retail)** - Approved - $8,750
   - Already approved

5. **Q-1022 (Zenith Co)** - Negotiation - $19,300
   - In negotiation status

6. **Q-1015 (Orion Ltd)** - Confirmed - $41,200
   - Large confirmed deal

## Common Actions

### Create New Quotation
```
Dashboard → "+ New Quotation" → Empty quotation detail page
```

### Edit Customer Name
```
Quotation Detail → Customer field → Type new name
```

### Change Price List
```
Quotation Detail → Price List dropdown → Select different list
```

### Add Product to Quotation
```
Quotation Detail → Scroll to Upsell section → Click "+" on any card
```

### Save Draft
```
Quotation Detail → "Save Draft" button → Mock API call (500ms delay)
```

### Submit for Approval
```
Quotation Detail → "Submit for Approval" button
  → If score = 0: Auto-approved
  → If score > 0: Pending approval
  → Redirects to Quotations List
```

## File Structure (What to Edit)

### Want to add a new component?
```
src/components/[module]/YourComponent.tsx
```

### Want to add a new page?
```
src/pages/YourPage.tsx
then update src/App.tsx routing
```

### Want to change colors?
```
tailwind.config.js → theme.extend.colors
```

### Want to modify API responses?
```
src/services/api.ts → MOCK_* constants
```

### Want to add new types?
```
src/types/index.ts
```

## Development Workflow

1. Make changes to any `.tsx` or `.css` file
2. Save file
3. Browser auto-refreshes (Vite HMR)
4. See changes immediately

## Build for Production

```bash
npm run build
```

Output goes to `frontend/dist/` folder.

## Troubleshooting

### Port 3000 already in use?
Edit `vite.config.ts`:
```typescript
server: {
  port: 3001,  // Change to any available port
}
```

### Tailwind classes not working?
1. Check `tailwind.config.js` content paths
2. Restart dev server: `Ctrl+C` then `npm run dev`

### TypeScript errors?
1. Check `src/types/index.ts` for type definitions
2. Run `npm run build` to see all errors
3. VS Code should show inline errors

### Components not rendering?
1. Check browser console for errors (F12)
2. Check React DevTools
3. Verify imports are correct

## Next: Connect to Backend

Once you have the FastAPI backend running:

1. Update `vite.config.ts` proxy target:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8000',  // Your FastAPI server
  },
}
```

2. Update `src/services/api.ts`:
   - Remove mock implementations
   - Use actual `apiRequest()` calls
   - Add proper error handling

3. Test authentication flow with real JWT

## Tips

💡 **Use browser DevTools (F12):**
- Console: See API calls and errors
- Network: See HTTP requests
- React DevTools: Inspect component state

💡 **Keyboard shortcuts:**
- `Ctrl+C` in terminal: Stop dev server
- `Ctrl+Shift+R`: Hard refresh browser
- `F12`: Open DevTools

💡 **VS Code extensions:**
- ESLint: Catch errors
- Tailwind CSS IntelliSense: Autocomplete classes
- TypeScript Hero: Auto-import
- ES7+ React snippets: Quick component templates

## Questions?

Check `PROJECT_OVERVIEW.md` for detailed architecture and design decisions.
Check `frontend/README.md` for project-specific docs.
