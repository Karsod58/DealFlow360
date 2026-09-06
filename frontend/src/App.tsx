import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RequireRole } from './components/shared/RequireRole';
import AdminPanel from './pages/AdminPanel';
import {
  Login,
  Dashboard,
  QuotationsList,
  QuotationDetail,
  ApprovalsList,
  ApprovalDetail,
  FulfillmentList,
  FulfillmentDetail,
  CustomerPortal,
  SubscriptionsList,
  BillingDetail,
  InvoicesList,
  InvoiceDetail,
  DiscountConfig,
  DealHealthDashboard,
  ProductCatalog,
  ProductDetail,
  Forbidden,
  Reports,
} from './pages';
import { NewQuotation } from './pages/NewQuotation';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/403" element={<Forbidden />} />
        
        {/* Customer Portal - Public route with magic link auth */}
        <Route path="/portal/negotiate/:token" element={<CustomerPortal />} />
        
        {/* Protected: Dashboard - All internal roles */}
        <Route
          path="/dashboard"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <Dashboard />
            </RequireRole>
          }
        />
        
        {/* Protected: Quotations - All internal roles */}
        <Route
          path="/quotations"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <QuotationsList />
            </RequireRole>
          }
        />
        <Route
          path="/quotations/:id/edit"
          element={
            <RequireRole allowedRoles={['REP', 'ADMIN']}>
              <NewQuotation />
            </RequireRole>
          }
        />
        <Route
          path="/quotations/:id"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <QuotationDetail />
            </RequireRole>
          }
        />
        
        {/* Protected: Approvals - Manager, Finance, Admin */}
        <Route
          path="/approvals"
          element={
            <RequireRole allowedRoles={['MANAGER', 'FINANCE', 'ADMIN']}>
              <ApprovalsList />
            </RequireRole>
          }
        />
        <Route
          path="/approvals/:id"
          element={
            <RequireRole allowedRoles={['MANAGER', 'FINANCE', 'ADMIN']}>
              <ApprovalDetail />
            </RequireRole>
          }
        />
        
        {/* Protected: Fulfillment - All internal roles */}
        <Route
          path="/fulfillment"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <FulfillmentList />
            </RequireRole>
          }
        />
        <Route
          path="/fulfillment/:id"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <FulfillmentDetail />
            </RequireRole>
          }
        />
        
        {/* Protected: Subscriptions - All internal roles */}
        <Route
          path="/subscriptions"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <SubscriptionsList />
            </RequireRole>
          }
        />
        <Route
          path="/subscriptions/:id"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <BillingDetail />
            </RequireRole>
          }
        />
        
        {/* Protected: Invoices - All internal roles */}
        <Route
          path="/invoices"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <InvoicesList />
            </RequireRole>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <InvoiceDetail />
            </RequireRole>
          }
        />
        
        {/* Protected: Admin Configuration - Manager, Admin */}
        <Route
          path="/admin/discount-config"
          element={
            <RequireRole allowedRoles={['MANAGER', 'ADMIN']}>
              <DiscountConfig />
            </RequireRole>
          }
        />
        
        {/* Protected: Admin Panel - Admin only */}
        <Route
          path="/admin/panel"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminPanel />
            </RequireRole>
          }
        />
        
        {/* Protected: Product Catalog - Admin only */}
        <Route
          path="/admin/products"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <ProductCatalog />
            </RequireRole>
          }
        />
        <Route
          path="/admin/products/:productId"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <ProductDetail />
            </RequireRole>
          }
        />
        
        {/* Protected: Deal Health - All internal roles */}
        <Route
          path="/deal-health"
          element={
            <RequireRole allowedRoles={['REP', 'MANAGER', 'FINANCE', 'ADMIN']}>
              <DealHealthDashboard />
            </RequireRole>
          }
        />
        
        {/* Protected: Reports - Manager, Finance, Admin */}
        <Route
          path="/reports"
          element={
            <RequireRole allowedRoles={['MANAGER', 'FINANCE', 'ADMIN']}>
              <Reports />
            </RequireRole>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
