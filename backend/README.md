# DealFlow360 Backend

FastAPI backend for the DealFlow360 CPQ system.

## Tech Stack

- **FastAPI** - Modern, fast web framework for Python
- **SQLAlchemy** - SQL ORM
- **SQLite** - Database (easy development, switch to PostgreSQL for production)
- **Pydantic** - Data validation
- **JWT** - Authentication
- **Uvicorn** - ASGI server

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py          # Settings and configuration
│   ├── database.py        # Database connection and session
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   ├── auth.py            # Authentication utilities
│   └── routers/           # API route handlers
│       ├── __init__.py
│       ├── auth.py        # Login, signup, token endpoints
│       ├── quotations.py  # Quotations CRUD + line items
│       ├── dashboard.py   # Dashboard stats and activity
│       └── products.py    # Products and suggestions
├── main.py                # FastAPI app entry point
├── seed_database.py       # Database seeding script
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
└── README.md
```

## Getting Started

### 1. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

The `.env` file is already configured for development with SQLite:

```env
DATABASE_URL=sqlite:///./dealflow360.db
SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:3000
```

For production, use PostgreSQL and generate a new secret key:
```bash
openssl rand -hex 32
```

### 4. Seed the Database

```bash
python seed_database.py
```

This creates:
- 4 test users (rep, manager, finance, customer)
- 6 products
- 6 quotations with various statuses
- Line items for Q-1042 (Acme Corp)
- Activity logs

### 5. Run the Development Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at:
- **API:** http://localhost:8000
- **Docs:** http://localhost:8000/docs (Swagger UI)
- **ReDoc:** http://localhost:8000/redoc

## Test Credentials

After seeding, use these credentials to log in:

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Rep      | rep@dealflow.com         | password123 |
| Manager  | manager@dealflow.com     | password123 |
| Finance  | finance@dealflow.com     | password123 |
| Customer | customer@example.com     | password123 |

## API Endpoints

### Authentication

```
POST   /api/auth/login      # Login and get JWT token
POST   /api/auth/signup     # Register new user
GET    /api/auth/me         # Get current user info
```

### Quotations

```
GET    /api/quotations                          # List all quotations (filterable by status)
POST   /api/quotations                          # Create new quotation
GET    /api/quotations/{id}                     # Get quotation detail
PUT    /api/quotations/{id}                     # Update quotation
DELETE /api/quotations/{id}                     # Delete quotation
POST   /api/quotations/{id}/submit              # Submit for approval

POST   /api/quotations/{id}/line-items          # Add line item
PUT    /api/quotations/{id}/line-items/{item_id} # Update line item
DELETE /api/quotations/{id}/line-items/{item_id} # Delete line item
```

### Dashboard

```
GET    /api/dashboard/stats     # Get dashboard statistics
GET    /api/dashboard/activity  # Get recent activity feed
```

### Products

```
GET    /api/products                       # List products
GET    /api/products/{product_id}          # Get product detail
GET    /api/products/suggestions/{quote_id} # Get upsell suggestions
```

## Authentication Flow

1. **Login/Signup** → Receive JWT token
2. Include token in subsequent requests:
   ```
   Authorization: Bearer <token>
   ```
3. Token expires after 30 minutes (configurable)

## Database Models

### User
- id, email, hashed_password, name, role
- Roles: REP, MANAGER, FINANCE, ADMIN, CUSTOMER

### Quotation
- id, quotation_number, customer_name, status, total_value, blended_score
- Status: DRAFT, PENDING_APPROVAL, APPROVED, NEGOTIATION, CONFIRMED
- Has many LineItems

### LineItem
- id, product_id, product_name, quantity, unit_price, discount, discount_limit
- Calculated: line_total, status (OK/OVER), overage
- Belongs to Quotation

### Product
- id, product_id, name, price, margin, promo_discount, discount_limit

### ActivityLog
- id, message, quotation_id, user_id, created_at

## Business Logic

### Discount Validation

Each line item validates discount against its own limit:

```python
if discount <= discount_limit:
    status = "OK"
    overage = 0
else:
    status = "OVER"
    overage = discount - discount_limit
```

### Blended Score Calculation

```python
blended_score = sum(line_item.overage for line_item in quotation.line_items)
```

### Auto-Approval Logic

```python
if blended_score == 0:
    status = "APPROVED"  # Auto-approved
else:
    status = "PENDING_APPROVAL"  # Requires manager/finance approval
```

## Development Tips

### View Database

```bash
# SQLite browser
sqlite3 dealflow360.db
.tables
.schema quotations
SELECT * FROM quotations;
```

### Reset Database

```bash
# Delete database file
rm dealflow360.db

# Re-seed
python seed_database.py
```

### Run Tests (When Added)

```bash
pytest
```

### Format Code

```bash
pip install black
black .
```

### Type Checking

```bash
pip install mypy
mypy app/
```

## CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:3000` (frontend dev server)
- Any origin specified in `FRONTEND_URL` env variable

For production, update to your actual frontend domain.

## Switching to PostgreSQL

1. Install PostgreSQL
2. Create database: `createdb dealflow360`
3. Update `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/dealflow360
   ```
4. Remove SQLite-specific config from `database.py`:
   ```python
   engine = create_engine(settings.DATABASE_URL)
   ```
5. Run seed script

## Production Deployment

### Security Checklist

- [ ] Generate new `SECRET_KEY`
- [ ] Use PostgreSQL, not SQLite
- [ ] Enable HTTPS only
- [ ] Set proper CORS origins
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Add request logging
- [ ] Set up monitoring
- [ ] Use httpOnly cookies instead of localStorage for tokens
- [ ] Implement refresh tokens
- [ ] Add input sanitization
- [ ] Enable database backups

### Deploy to Cloud

**Option 1: Railway**
```bash
railway init
railway add
railway up
```

**Option 2: Render**
1. Connect GitHub repo
2. Set environment variables
3. Deploy

**Option 3: Docker**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Troubleshooting

### "Database is locked" error
- SQLite doesn't handle concurrent writes well
- Switch to PostgreSQL for production

### "401 Unauthorized"
- Check JWT token is included in Authorization header
- Token may have expired (re-login)
- Check SECRET_KEY matches between environments

### CORS errors
- Verify FRONTEND_URL in .env
- Check browser console for actual error
- Ensure credentials: true in frontend axios config

## Next Steps

1. Add approval workflow endpoints
2. Implement pagination for list endpoints
3. Add filtering and search
4. Add email notifications
5. Implement file uploads (for quotes/contracts)
6. Add audit trail
7. Implement role-based permissions
8. Add real-time updates (WebSockets)
9. Add comprehensive tests
10. Set up CI/CD

## License

TBD
