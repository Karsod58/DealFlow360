# Magic Token Test Guide

## ✅ Magic Token Implementation Status

### Backend (Correct ✅)
- `generate_portal_link()` creates magic token with `secrets.token_urlsafe(32)`
- Token stored in `customers.portal_magic_token` (NOT per-quotation)
- Expiry: 30 days from generation
- Returns: `/portal/negotiate/{magic_token}`

### Frontend (Correct ✅)
- QuotationDetail generates link via `/api/portal/generate-link/{quotation_id}`
- Receives `portal_url` from backend
- Constructs full URL: `${window.location.origin}${data.portal_url}`
- CustomerPortal uses `token` from URL params (not JWT)

## Test Flow

### 1. Start Services
```powershell
# Backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm run dev
```

### 2. Generate Portal Link
1. Login as **rep@dealflow.com** / password123
2. Go to **Quotations**
3. Click any **APPROVED** or **NEGOTIATION** quotation (NOT DRAFT)
4. Scroll down to **Customer Portal** section
5. Click **"🔗 Generate Portal Link"**
6. Success message shows: **Portal link copied to clipboard!**

### 3. Example Link Format
```
http://localhost:5173/portal/negotiate/TaBUtjSH5Xh_Iq-B6WR68tzm9RsRT_LMgK4--h8RtS0
                                       ↑ This is the MAGIC TOKEN (NOT JWT)
```

### 4. Test Portal Access
1. Open **new incognito/private window** (to simulate customer)
2. Paste the portal link
3. Should see customer portal with:
   - Customer name
   - Quotation details
   - Line items with negotiation forms
   - Submit/Confirm buttons

### 5. Verify No JWT Required
- Portal route does NOT require `Authorization: Bearer` header
- Only needs magic token in URL
- Backend validates: `customer.portal_magic_token == magic_token`

## Common Issues

### Issue: "Invalid or expired portal link"
**Causes:**
- Token not in database (customer has no `portal_magic_token`)
- Token expired (`portal_token_expires < now`)
- Wrong token format

**Fix:**
- Regenerate link from REP account
- Check backend logs for actual token value

### Issue: "Access token" shown instead
**This is NOT happening!**
- Backend never returns JWT access token
- Only returns magic token
- If you see JWT format (eyJ...), that's wrong

### Issue: Portal shows blank/error
**Causes:**
- Backend not running
- CORS issue
- Customer has no quotations

**Fix:**
- Check backend console for errors
- Verify CORS allows `http://localhost:5173`
- Check customer has quotations in database

## Magic Token vs JWT Access Token

### Magic Token (Used for Portal) ✅
- Format: `TaBUtjSH5Xh_Iq-B6WR68tzm9RsRT_LMgK4--h8RtS0`
- Length: ~43 characters (URL-safe base64)
- Stored: `customers.portal_magic_token`
- Purpose: Customer portal access WITHOUT login
- Expiry: 30 days

### JWT Access Token (Used for Internal Users) ❌ NOT for portal
- Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi...`
- Length: ~200+ characters
- Stored: `localStorage.getItem('token')`
- Purpose: REP/MANAGER/FINANCE/ADMIN authentication
- Expiry: 30 minutes (configurable)

## Database Check

```sql
-- Check if customer has magic token
SELECT id, name, email, portal_magic_token, portal_token_expires 
FROM customers 
WHERE id = 181;  -- Replace with your customer ID

-- Check quotations for customer
SELECT id, quotation_number, customer_id, status 
FROM quotations 
WHERE customer_id = 181;
```

## Success Criteria ✅
- [x] Portal link format: `/portal/negotiate/{random_token}`
- [x] Token is NOT JWT (no dots, no "eyJ" prefix)
- [x] Token stored in `customers` table
- [x] Portal accessible without login
- [x] Token expires after 30 days
- [x] Customer can view quotations
- [x] Customer can submit negotiations

## Conclusion
**Magic token implementation is CORRECT!**
If you're seeing JWT tokens, check:
1. Are you copying the right link? (from "Generate Portal Link" button)
2. Are you in incognito window? (clear cookies/cache)
3. Check browser console for actual URL being loaded
