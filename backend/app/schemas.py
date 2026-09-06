from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models import (
    UserRole, QuotationStatus, LineItemStatus, ApprovalStatus, 
    RiskLevel, FulfillmentStatus, SubscriptionStatus, BillingCycle,
    InvoiceStatus, PaymentStatus, NegotiationStatus
)

# Customer schemas
class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    tier: Optional[str] = None
    credit_limit: Optional[float] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    tier: Optional[str] = None
    credit_limit: Optional[float] = None

class Customer(CustomerBase):
    id: int
    customer_code: str
    portal_magic_token: Optional[str] = None
    portal_token_expires: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str = "New User"
    role: UserRole = UserRole.REP  # Default to REP for internal users

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """Schema for updating user information (ADMIN only)"""
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None  # If provided, will be hashed and updated

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: User

# Line Item schemas
class LineItemBase(BaseModel):
    product_id: str
    product_name: str
    quantity: int = 1
    unit_price: float
    discount: float = 0.0
    discount_limit: float = 15.0

class LineItemCreate(LineItemBase):
    pass

class LineItemUpdate(BaseModel):
    quantity: Optional[int] = None
    discount: Optional[float] = None

class LineItem(LineItemBase):
    id: int
    quotation_id: int
    line_total: float
    status: LineItemStatus
    overage: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Quotation schemas
class QuotationBase(BaseModel):
    customer_id: int
    price_list_id: str = "default"

class QuotationCreate(QuotationBase):
    pass

class QuotationUpdate(BaseModel):
    customer_id: Optional[int] = None
    price_list_id: Optional[str] = None
    status: Optional[QuotationStatus] = None

class Quotation(QuotationBase):
    id: int
    quotation_number: str
    status: QuotationStatus
    total_value: float
    blended_score: float
    line_items: List[LineItem] = []
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class QuotationList(BaseModel):
    id: int
    quotation_number: str
    customer_id: int
    customer_name: Optional[str] = None
    price_list_id: str
    status: QuotationStatus
    total_value: float
    blended_score: float
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class QuotationWithCustomer(BaseModel):
    id: int
    quotation_number: str
    customer: Customer
    price_list_id: str
    status: QuotationStatus
    total_value: float
    blended_score: float
    line_items: List[LineItem] = []
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Product schemas
class ProductBase(BaseModel):
    product_id: str
    name: str
    price: float
    margin: Optional[float] = None
    promo_discount: Optional[float] = None
    discount_limit: float = 15.0
    category: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard schemas
class DashboardStats(BaseModel):
    pending_approvals: int
    open_quotations: int
    at_risk_deals: int

class AuditLogBase(BaseModel):
    action: str
    note: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLog(AuditLogBase):
    id: int
    quotation_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ApprovalAction(BaseModel):
    action: str  # "approve", "reject", "return"
    note: Optional[str] = None

# Approval schemas
class ApprovalStepBase(BaseModel):
    approver_role: UserRole
    status: ApprovalStatus
    step_order: int
    risk_level: RiskLevel

class ApprovalStep(ApprovalStepBase):
    id: int
    quotation_id: int
    assigned_to_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    reviewed_by_id: Optional[int]

    class Config:
        from_attributes = True

# Warehouse and Stock schemas
class WarehouseBase(BaseModel):
    warehouse_code: str
    name: str
    location: Optional[str] = None
    shipping_cost_base: float = 0.0

class Warehouse(WarehouseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class StockLevelBase(BaseModel):
    product_id: str
    product_name: str
    in_stock: int
    reserved: int

class StockLevel(StockLevelBase):
    id: int
    warehouse_id: int
    available: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StockWithWarehouse(BaseModel):
    warehouse: Warehouse
    stock: StockLevel

    class Config:
        from_attributes = True

# Fulfillment schemas
class FulfillmentSplitBase(BaseModel):
    warehouse_id: int
    quantity_fulfilled: int
    estimated_shipments: int = 1
    shipping_cost: float

class FulfillmentSplit(FulfillmentSplitBase):
    id: int
    quotation_id: int
    line_item_id: int
    status: FulfillmentStatus
    is_backorder: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FulfillmentSplitWithWarehouse(BaseModel):
    warehouse_name: str
    warehouse_code: str
    product_name: str
    quantity_fulfilled: int
    estimated_shipments: int
    shipping_cost: float
    is_backorder: bool

class FulfillmentCalculation(BaseModel):
    quotation_id: int
    line_item_id: int
    product_name: str
    total_quantity: int
    splits: List[FulfillmentSplitWithWarehouse]
    total_cost: float
    backorder_quantity: int

class ApprovalListItem(BaseModel):
    id: int
    quotation_number: str
    customer_id: int
    blended_score: float
    risk_level: str
    stage: str
    assigned_to: Optional[str] = None
    status: QuotationStatus
    created_at: datetime

    class Config:
        from_attributes = True

class ApprovalDetail(BaseModel):
    quotation: Quotation
    approval_steps: List[ApprovalStep]
    audit_logs: List[AuditLog]
    risk_level: str
    customer_tier: str = "Gold"

    class Config:
        from_attributes = True

# Subscription schemas
class SubscriptionBase(BaseModel):
    customer_id: int
    plan_name: str
    billing_cycle: BillingCycle
    amount: float
    next_bill_date: Optional[datetime] = None

class SubscriptionCreate(SubscriptionBase):
    quotation_id: Optional[int] = None

class Subscription(SubscriptionBase):
    id: int
    quotation_id: Optional[int]
    status: SubscriptionStatus
    start_date: datetime
    end_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class SubscriptionModify(BaseModel):
    plan_name: Optional[str] = None
    billing_cycle: Optional[BillingCycle] = None
    amount: Optional[float] = None
    quantity: Optional[int] = None

# Invoice schemas
class InvoiceLineItemBase(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    amount: float

class InvoiceLineItem(InvoiceLineItemBase):
    id: int
    invoice_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    customer_id: int
    amount: float
    due_date: Optional[datetime] = None
    is_recurring: int = 0

class InvoiceCreate(InvoiceBase):
    invoice_number: str
    quotation_id: Optional[int] = None
    subscription_id: Optional[int] = None

class Invoice(InvoiceBase):
    id: int
    invoice_number: str
    quotation_id: Optional[int]
    subscription_id: Optional[int]
    status: InvoiceStatus
    created_at: datetime
    line_items: List[InvoiceLineItem] = []

    class Config:
        from_attributes = True

# Payment schemas
class PaymentBase(BaseModel):
    amount: float
    payment_method: Optional[str] = None

class PaymentCreate(PaymentBase):
    invoice_id: int

class Payment(PaymentBase):
    id: int
    invoice_id: int
    status: PaymentStatus
    payment_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

# Customer Negotiation schemas
class CustomerNegotiationBase(BaseModel):
    line_item_id: int
    customer_comment: Optional[str] = None
    counter_discount: Optional[float] = None
    requested_delivery_date: Optional[datetime] = None
    rep_response: Optional[str] = None

class CustomerNegotiationCreate(CustomerNegotiationBase):
    quotation_id: int

class CustomerNegotiation(CustomerNegotiationBase):
    id: int
    quotation_id: int
    status: NegotiationStatus
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerPortalSubmit(BaseModel):
    negotiations: List[CustomerNegotiationBase]
    action: str  # "submit_request" or "confirm_quotation"

class RepNegotiationResponse(BaseModel):
    """Schema for REP responding to customer negotiation"""
    response: str  # REP's text response to customer
    action: str  # "accept", "counter", "reject"
    approved_discount: Optional[float] = None  # If action is accept/counter, what discount to apply

class PortalTokenResponse(BaseModel):
    magic_token: str
    expires_at: datetime
    portal_url: str

# Discount Ceiling schemas
class DiscountCeilingBase(BaseModel):
    tier: Optional[str] = None
    category: Optional[str] = None
    max_discount: float

class DiscountCeilingCreate(DiscountCeilingBase):
    pass

class DiscountCeiling(DiscountCeilingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Product Variant schemas (REMOVED - Not implemented in current version)
# class ProductExtended(ProductBase):
#     description: Optional[str] = None
#     tax_rate: float = 0.0
#     unit: str = "Each"
#     is_subscription: int = 0
#     recurring_cycle: Optional[BillingCycle] = None
#     quantity_on_hand: Optional[int] = None
#     status: str = "Active"
#     variants: List[ProductVariant] = []
#     pricelist_entries: List[PriceListEntry] = []

# Dashboard schemas
class DealHealthItem(BaseModel):
    deal_id: int
    quotation_number: str
    customer_id: int
    issue: str
    flagged_date: datetime
    action_taken: Optional[str] = None

class DealHealthStats(BaseModel):
    stalled_deals: int
    discount_anomalies: int
    delivery_slippage: int
    deals: List[DealHealthItem]
