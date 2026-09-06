# Large Dataset Seed Instructions 🌱

## Overview

The `seed_large_dataset.py` script generates **100-200 comprehensive dummy records** across all database tables for a production-ready demo.

---

## What Gets Seeded

### Users (7 records)
- 1 ADMIN
- 1 MANAGER  
- 1 FINANCE
- 4 REPs (Sales Representatives)

### Customers (50 records)
- Realistic names and emails
- 40 different companies
- Distributed across 4 tiers (Bronze, Silver, Gold, Platinum)
- Credit limits from $50K to $1M
- 10 customers with portal magic tokens

### Products (25 records)
- Software (10 products)
- Hardware (5 products)
- Services (6 products)
- Consulting (3 products)
- Cloud (1 product)
- Prices ranging from $10K to $75K

### Warehouses (5 records)
- East Coast, West Coast, Central, South, North
- Different shipping costs per location

### Stock Levels (~87 records)
- Each warehouse has 60-80% of products
- Random stock quantities (10-100 units)
- Some reserved stock for realism

### Quotations (100 records)
- Distributed across all statuses:
  - Draft
  - Pending Approval
  - Approved
  - Confirmed
  - Rejected
- Created over past 90 days
- 1-5 line items per quotation
- Realistic discount overages (30% of quotes have risk)

### Line Items (~250 records)
- Based on quotation products
- Quantities: 1-10 units
- Some with discount overages
- Automatic blended score calculation

### Approval Steps (~70 records)
- Manager approval for all submitted quotes
- Finance approval for high-risk quotes (blended_score ≥ 10)
- Proper status tracking

### Audit Logs (~200 records)
- Creation, submission, approval events
- Complete audit trail for each quotation

### Invoices & Payments (~50 invoices, ~75 payments)
- Generated for 50% of approved quotations
- Invoice line items match quotation items
- Various payment statuses (Unpaid, Partially Paid, Paid)
- Multiple payment methods

### Discount Ceilings (9 records)
- Tier-based limits (Bronze: 5%, Silver: 10%, Gold: 15%, Platinum: 20%)
- Category-based limits for each product type

---

## How to Run

### Prerequisites

1. **Backend virtual environment activated:**
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   ```

2. **Database running:**
   - PostgreSQL should be accessible
   - Connection string in `.env` file

### Run the Seed Script

```powershell
# From backend directory
python seed_large_dataset.py
```

### Expected Output

```
============================================================
DealFlow360 Large Dataset Seed Script
============================================================
Clearing existing data...
✅ Database cleared
Seeding users...
✅ Created 7 users
Seeding 50 customers...
✅ Created 50 customers
Seeding 25 products...
✅ Created 25 products
Seeding 5 warehouses...
✅ Created 5 warehouses
Seeding stock levels...
✅ Created 87 stock level records
Seeding discount ceilings...
✅ Created 9 discount ceilings
Seeding 100 quotations with line items...
✅ Created 100 quotations with line items
Seeding approval workflow...
✅ Created 70 approval steps and 200 audit logs
Seeding invoices and payments...
✅ Created 50 invoices with 75 payments

============================================================
✅ SEED COMPLETE!
============================================================
Users: 7
Customers: 50
Products: 25
Warehouses: 5
Quotations: 100
Stock Levels: ~87
============================================================

Test Credentials:
  admin@dealflow.com / password123
  manager@dealflow.com / password123
  finance@dealflow.com / password123
  rep@dealflow.com / password123
============================================================
```

---

## Data Characteristics

### Realistic Quotations

**Status Distribution:**
- ~20% Draft (REP working on it)
- ~20% Pending Approval (awaiting manager/finance)
- ~30% Approved (ready for fulfillment)
- ~20% Confirmed (customer accepted)
- ~10% Rejected

**Risk Distribution:**
- ~70% Low/Medium risk (within discount limits)
- ~30% High risk (requires finance approval)

**Time Range:**
- Created randomly over past 90 days
- Updated 1-48 hours after creation
- Realistic progression timestamps

### Customer Portal

10 customers have active portal tokens for testing:
- Token format: `token-{id}-{random}`
- 30-day expiration
- Can access via: `/portal/negotiate/{token}`

### Financial Data

**Invoice Statuses:**
- 40% Unpaid
- 30% Partially Paid
- 30% Fully Paid

**Payment Methods:**
- Credit Card
- Wire Transfer
- Check
- ACH

---

## Testing Scenarios

### 1. Sales Rep View
Login as: `rep@dealflow.com`
- Should see only their own quotations (~25 quotes)
- Dashboard shows their activity only
- Can create/edit/submit quotations

### 2. Manager View
Login as: `manager@dealflow.com`
- See all quotations (100 total)
- ~20 pending approvals to review
- Dashboard shows platform-wide stats
- Can approve medium/high-risk deals

### 3. Finance View
Login as: `finance@dealflow.com`
- View all quotations
- ~10 high-risk deals requiring finance approval
- Access to invoices and payments
- Can handle warehouse fulfillment

### 4. Admin View
Login as: `admin@dealflow.com`
- Full system access
- User management (7 users to manage)
- System configuration
- All reports and analytics

### 5. Customer Portal
Use any token from first 10 customers:
- Example: `token-0-{random}`
- View quotation online
- Submit counter-offers
- Confirm terms

---

## Customization

### Adjust Record Counts

Edit `seed_large_dataset.py`:

```python
# Line 479 - Change customer count
customers = seed_customers(db, count=50)  # Change 50 to desired number

# Line 483 - Change quotation count
quotations = seed_quotations(db, customers, products, users, count=100)  # Change 100
```

### Add More Products

Edit `PRODUCTS` list (line 49):
```python
PRODUCTS = [
    ("Your Product", "Category", price, cost),
    # Add more tuples
]
```

### Add More Warehouses

Edit `WAREHOUSES` list (line 69):
```python
WAREHOUSES = [
    ("WH-CODE", "Name", "Location", shipping_cost),
    # Add more tuples
]
```

---

## Troubleshooting

### Error: "table does not exist"
```powershell
# Create tables first
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### Error: "connection refused"
- Check PostgreSQL is running
- Verify `.env` DATABASE_URL is correct
- Test connection: `psql -h <host> -U <user> -d <database>`

### Error: "unique constraint violation"
- Database already has data
- Script clears data automatically, but if it fails:
```powershell
# Manual reset
python reset_database.py
```

### Script runs but no data
- Check database connection
- Verify commit() calls are executed
- Check for exceptions in output

---

## Performance

**Seeding Time:** ~30-60 seconds
- Users: < 1 second
- Customers: ~2 seconds
- Products: < 1 second
- Quotations: ~15 seconds (includes line items calculation)
- Approval workflow: ~10 seconds
- Invoices/Payments: ~5 seconds

**Database Size:** ~5-10 MB after seeding

---

## Clean Up

To remove all seeded data and start fresh:

```powershell
# Option 1: Run seed script again (auto-clears)
python seed_large_dataset.py

# Option 2: Manual database reset
python reset_database.py

# Option 3: Drop and recreate tables
python -c "from app.database import Base, engine; Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine)"
```

---

## Data Validation

After seeding, verify data:

```sql
-- Check record counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'quotations', COUNT(*) FROM quotations
UNION ALL
SELECT 'line_items', COUNT(*) FROM line_items
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices;

-- Check quotation status distribution
SELECT status, COUNT(*) as count 
FROM quotations 
GROUP BY status;

-- Check risk level distribution
SELECT 
  CASE 
    WHEN blended_score = 0 THEN 'LOW'
    WHEN blended_score < 10 THEN 'MEDIUM'
    ELSE 'HIGH'
  END as risk_level,
  COUNT(*) as count
FROM quotations
GROUP BY 1;
```

---

## API Testing After Seed

### Test Dashboard Stats
```bash
curl -X GET "http://localhost:8000/api/dashboard/stats" \
  -H "Authorization: Bearer <manager_token>"
  
# Expected: 
# {
#   "pending_approvals": ~20,
#   "open_quotations": ~60,
#   "at_risk_deals": ~30
# }
```

### Test Quotations List
```bash
curl -X GET "http://localhost:8000/api/quotations" \
  -H "Authorization: Bearer <token>"
  
# Expected: Array of 100 quotations (filtered by role)
```

### Test Customer Portal
```bash
curl -X GET "http://localhost:8000/api/portal/negotiate/token-0-12345"

# Expected: Quotation details with customer info
```

---

## Production Considerations

⚠️ **This script is for DEMO/DEVELOPMENT only!**

For production:
1. Remove the `clear_database()` function
2. Add uniqueness checks before inserting
3. Use database migrations (Alembic)
4. Add data validation
5. Implement rollback on error
6. Use real customer data (not fake names)
7. Add data privacy considerations

---

## Support

If issues persist:
1. Check backend logs for detailed errors
2. Verify database schema is up to date
3. Ensure all dependencies installed (`pip install -r requirements.txt`)
4. Check PostgreSQL version compatibility (9.6+)

---

**Happy Seeding! 🌱**
