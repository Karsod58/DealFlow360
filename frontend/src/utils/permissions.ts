import { UserRole } from '../types';

/**
 * Central Role-Based Access Control (RBAC) Configuration
 * Single source of truth for all permissions across the application
 * 
 * Roles:
 * - REP: Sales Representative - Creates quotations, applies discounts, monitors deals
 * - MANAGER: Sales Manager - Approves quotations, configures discount rules, monitors deal health
 * - FINANCE: Finance/Operations - Second-level approval, fulfillment, billing operations
 * - ADMIN: Administrator - Product, warehouse, platform configuration
 * - CUSTOMER: Customer Portal User - Views quotations, negotiates, confirms
 */

export const PERMISSIONS = {
  // ============= SCREEN-LEVEL VISIBILITY =============
  
  // Internal Workspace Screens (REP, MANAGER, FINANCE, ADMIN)
  canViewDashboard: ['REP', 'MANAGER', 'FINANCE', 'ADMIN'] as UserRole[],
  canViewQuotations: ['REP', 'MANAGER', 'FINANCE', 'ADMIN'] as UserRole[],
  canViewApprovals: ['MANAGER', 'FINANCE', 'ADMIN'] as UserRole[], // Only those who can approve
  canViewFulfillment: ['FINANCE', 'ADMIN'] as UserRole[], // Only Finance manages fulfillment
  canViewSubscriptions: ['FINANCE', 'ADMIN'] as UserRole[], // Only Finance manages subscriptions
  canViewInvoices: ['FINANCE', 'ADMIN'] as UserRole[], // Only Finance manages invoices
  canViewDealHealth: ['REP', 'MANAGER', 'FINANCE', 'ADMIN'] as UserRole[],
  canViewProductCatalog: ['ADMIN'] as UserRole[],
  canViewDiscountConfig: ['MANAGER', 'ADMIN'] as UserRole[],
  canViewReports: ['MANAGER', 'FINANCE', 'ADMIN'] as UserRole[], // Not REP
  
  // Customer Portal Screens (CUSTOMER only)
  canViewPortal: ['CUSTOMER'] as UserRole[],
  canViewOwnQuotations: ['CUSTOMER'] as UserRole[],

  // ============= QUOTATION ACTIONS =============
  canCreateQuotation: ['REP', 'ADMIN'] as UserRole[], // Only REP and ADMIN
  canEditQuotation: ['REP', 'ADMIN'] as UserRole[], // Only REP and ADMIN
  canDeleteQuotation: ['ADMIN'] as UserRole[], // Only ADMIN
  canSubmitQuotation: ['REP'] as UserRole[], // Only REP
  canApplyDiscounts: ['REP'] as UserRole[], // Only REP
  canAddProducts: ['REP'] as UserRole[], // Only REP
  canViewMargin: ['REP', 'MANAGER', 'FINANCE', 'ADMIN'] as UserRole[],
  canViewUpsellSuggestions: ['REP'] as UserRole[],
  canAddUpsell: ['REP'] as UserRole[],

  // ============= APPROVAL ACTIONS =============
  canApproveQuotation: ['MANAGER', 'FINANCE'] as UserRole[],
  canRejectQuotation: ['MANAGER', 'FINANCE'] as UserRole[],
  canReturnForRevision: ['MANAGER', 'FINANCE'] as UserRole[],
  canActOnApproval: (stage: string, role: UserRole): boolean => {
    if (stage === 'Sales Manager' && role === 'MANAGER') return true;
    if (stage === 'Finance' && role === 'FINANCE') return true;
    return false;
  },

  // ============= FULFILLMENT ACTIONS =============
  canViewWarehouseStock: ['FINANCE', 'ADMIN'] as UserRole[], // Only Finance and Admin
  canAcceptFulfillmentSplit: ['FINANCE', 'ADMIN'] as UserRole[], // Only Finance and Admin
  canManualOverrideFulfillment: ['FINANCE', 'ADMIN'] as UserRole[],
  canManageBackorders: ['FINANCE', 'ADMIN'] as UserRole[],
  canManageFulfillment: ['FINANCE', 'ADMIN'] as UserRole[],

  // ============= SUBSCRIPTION & BILLING ACTIONS =============
  canModifySubscription: ['FINANCE', 'ADMIN'] as UserRole[], // Only Finance and Admin
  canCancelSubscription: ['FINANCE', 'ADMIN'] as UserRole[],
  canRecordPayment: ['FINANCE', 'ADMIN'] as UserRole[],
  canGenerateInvoice: ['FINANCE', 'ADMIN'] as UserRole[],
  canManageBilling: ['FINANCE', 'ADMIN'] as UserRole[],
  canReconcileBilling: ['FINANCE', 'ADMIN'] as UserRole[],

  // ============= CUSTOMER PORTAL ACTIONS =============
  canViewQuotationInPortal: ['CUSTOMER'] as UserRole[],
  canCommentOnQuotation: ['CUSTOMER'] as UserRole[],
  canNegotiateDiscount: ['CUSTOMER'] as UserRole[],
  canCounterOffer: ['CUSTOMER'] as UserRole[],
  canConfirmQuotation: ['CUSTOMER'] as UserRole[],
  canRequestChanges: ['CUSTOMER'] as UserRole[],

  // ============= NEGOTIATION ACTIONS =============
  canRespondToNegotiation: ['REP'] as UserRole[], // Only REP responds to customers
  canViewCustomerCounterOffers: ['REP', 'MANAGER', 'FINANCE'] as UserRole[],

  // ============= DEAL HEALTH ACTIONS =============
  canEscalateDeal: ['MANAGER', 'ADMIN'] as UserRole[],
  canNudgeRep: ['MANAGER', 'ADMIN'] as UserRole[],
  canViewAllDeals: ['MANAGER', 'FINANCE', 'ADMIN'] as UserRole[],
  canViewOwnDealsOnly: ['REP'] as UserRole[],
  canViewDealHealthAlerts: ['REP', 'MANAGER', 'FINANCE', 'ADMIN'] as UserRole[],

  // ============= CONFIGURATION ACTIONS =============
  canConfigureDiscountTiers: ['MANAGER', 'ADMIN'] as UserRole[],
  canConfigureApprovalChains: ['MANAGER', 'ADMIN'] as UserRole[],
  canConfigureProducts: ['ADMIN'] as UserRole[],
  canCreateProduct: ['ADMIN'] as UserRole[],
  canEditProduct: ['ADMIN'] as UserRole[],
  canConfigurePriceLists: ['ADMIN'] as UserRole[],
  canConfigureWarehouses: ['FINANCE', 'ADMIN'] as UserRole[],
  canConfigureSubscriptions: ['ADMIN'] as UserRole[],
  canConfigureUpsellRules: ['ADMIN'] as UserRole[],
  canViewSystemStats: ['ADMIN'] as UserRole[],
  canViewPlatformReports: ['MANAGER', 'FINANCE', 'ADMIN'] as UserRole[],
  canExportReports: ['MANAGER', 'FINANCE', 'ADMIN'] as UserRole[],
} as const;

/**
 * Check if a role has permission
 */
export function hasPermission(allowedRoles: readonly UserRole[], userRole: UserRole): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Get accessible routes for a role
 */
export function getAccessibleRoutes(role: UserRole): string[] {
  const routes: string[] = [];

  // Customer gets ONLY portal access
  if (role === 'CUSTOMER') {
    if (hasPermission(PERMISSIONS.canViewPortal, role)) {
      routes.push('/portal');
    }
    return routes;
  }

  // Internal users get workspace access
  if (hasPermission(PERMISSIONS.canViewDashboard, role)) {
    routes.push('/dashboard');
  }
  if (hasPermission(PERMISSIONS.canViewQuotations, role)) {
    routes.push('/quotations');
  }
  if (hasPermission(PERMISSIONS.canViewApprovals, role)) {
    routes.push('/approvals');
  }
  if (hasPermission(PERMISSIONS.canViewFulfillment, role)) {
    routes.push('/fulfillment');
  }
  if (hasPermission(PERMISSIONS.canViewSubscriptions, role)) {
    routes.push('/subscriptions');
  }
  if (hasPermission(PERMISSIONS.canViewInvoices, role)) {
    routes.push('/invoices');
  }
  if (hasPermission(PERMISSIONS.canViewDealHealth, role)) {
    routes.push('/deal-health');
  }
  if (hasPermission(PERMISSIONS.canViewProductCatalog, role)) {
    routes.push('/admin/products');
  }
  if (hasPermission(PERMISSIONS.canViewDiscountConfig, role)) {
    routes.push('/admin/discount-config');
  }
  if (hasPermission(PERMISSIONS.canViewReports, role)) {
    routes.push('/reports');
  }

  return routes;
}

/**
 * Navigation items configuration based on role
 */
export function getNavItemsForRole(role: UserRole) {
  const items = [];

  // Customer portal users don't see internal navigation
  if (role === 'CUSTOMER') {
    return [
      { path: '/portal', label: 'My Quotations' }
    ];
  }

  // Internal workspace navigation
  if (hasPermission(PERMISSIONS.canViewDashboard, role)) {
    items.push({ path: '/dashboard', label: 'Dashboard' });
  }
  if (hasPermission(PERMISSIONS.canViewQuotations, role)) {
    items.push({ path: '/quotations', label: 'Quotations' });
  }
  if (hasPermission(PERMISSIONS.canViewApprovals, role)) {
    items.push({ path: '/approvals', label: 'Approvals' });
  }
  if (hasPermission(PERMISSIONS.canViewFulfillment, role)) {
    items.push({ path: '/fulfillment', label: 'Fulfillment' });
  }
  if (hasPermission(PERMISSIONS.canViewSubscriptions, role)) {
    items.push({ path: '/subscriptions', label: 'Subscriptions' });
  }
  if (hasPermission(PERMISSIONS.canViewInvoices, role)) {
    items.push({ path: '/invoices', label: 'Invoices' });
  }
  if (hasPermission(PERMISSIONS.canViewDealHealth, role)) {
    items.push({ path: '/deal-health', label: 'Deal Health' });
  }
  if (hasPermission(PERMISSIONS.canViewProductCatalog, role)) {
    items.push({ path: '/admin/products', label: 'Products' });
  }
  if (hasPermission(PERMISSIONS.canViewDiscountConfig, role)) {
    items.push({ path: '/admin/discount-config', label: 'Admin' });
  }
  if (hasPermission(PERMISSIONS.canViewReports, role)) {
    items.push({ path: '/reports', label: 'Reports' });
  }

  return items;
}

