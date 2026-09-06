# DealFlow360 Frontend

React + TypeScript frontend for the DealFlow360 CPQ system.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling with dark theme
- **React Router** - Client-side routing

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── shared/         # Shared components (NavBar, inputs, etc.)
│   ├── dashboard/      # Dashboard-specific components
│   ├── quotations/     # Quotations list components
│   └── quotationDetail/# Quotation detail components
├── pages/              # Route pages
│   ├── Login.tsx       # Login/Signup screen
│   ├── Dashboard.tsx   # Sales dashboard
│   ├── QuotationsList.tsx
│   └── QuotationDetail.tsx
├── services/           # API services and mock data
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── App.tsx             # Main app with routing
├── main.tsx            # App entry point
└── index.css           # Global styles and Tailwind
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

### Build for Production

```bash
npm run build
```

## Features Implemented

### Screen 1: Login / Signup
- Tab toggle between Login and Sign Up
- Email and password fields with validation
- Role selection for signup
- Info banner with helper text
- JWT authentication flow (mocked)
- Role-based redirect (internal users → Dashboard, customers → Portal)

### Screen 2: Sales Dashboard
- Three stat cards (Pending Approvals, Open Quotations, At-Risk Deals)
- Clickable cards that route to filtered views
- Action buttons (New Quotation, View Approvals)
- Recent Activity feed with timestamps

### Screen 3: Quotations List
- Kanban board with 5 status columns
  - Draft
  - Pending Approval
  - Approved
  - Negotiation
  - Confirmed
- Search by customer name
- Quotation cards showing customer name and total value
- Risk score badges for quotations with overage
- New Quotation button

### Screen 4: Quotation Detail
- Customer and Price List selectors
- Line items table with:
  - Product, Quantity, Price, Discount, Limit, Status columns
  - Live status calculation (OK / OVER +Npt)
  - Inline editing of quantity and discount
  - Remove item action
- Real-time blended score calculation
- Risk score badge (auto-approved if score = 0)
- Info banner explaining discount validation
- Upsell and Cross-Sell suggestions (3 cards)
- Add product to quotation action
- Save Draft button
- Submit for Approval button with auto-approval logic

## Key Features

### Live Discount Validation
- Each line item validates discount against its own limit
- Status badge shows OK (green) or OVER +Npt (red)
- Blended score = sum of all overage points
- Score of 0 = auto-approved
- Score > 0 = requires approval

### Dark Theme
- Tailwind CSS configured with custom dark color palette
- Consistent styling across all components
- Utility classes for buttons, inputs, cards, badges

### Mock API
- All API calls use mock data with realistic delays
- Easy to swap out for real FastAPI backend
- Service layer separates API logic from components

## Next Steps

1. Connect to real FastAPI backend
2. Implement authentication with real JWT tokens
3. Add Approvals List and Detail screens
4. Build Deal Health dashboard
5. Add more sophisticated product search/catalog
6. Implement WebSocket for real-time updates
7. Add form validation library (e.g., React Hook Form + Zod)
8. Add state management (e.g., Zustand or Redux)
9. Add proper error handling and toast notifications
10. Add loading states and skeleton screens

## Notes

- The app uses localStorage for token storage (should use httpOnly cookies in production)
- Mock data is defined in `src/services/api.ts`
- All monetary values are in USD
- Dates are in ISO 8601 format
