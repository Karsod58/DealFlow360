from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    REP = "REP"
    MANAGER = "MANAGER"
    FINANCE = "FINANCE"
    ADMIN = "ADMIN"
    CUSTOMER = "CUSTOMER"


class QuotationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    NEGOTIATION = "NEGOTIATION"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


class LineItemStatus(str, enum.Enum):
    OK = "OK"
    OVER = "OVER"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RETURNED = "RETURNED"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class FulfillmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    SPLIT_CALCULATED = "SPLIT_CALCULATED"
    ACCEPTED = "ACCEPTED"
    SHIPPED = "SHIPPED"
    BACKORDER = "BACKORDER"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"


class BillingCycle(str, enum.Enum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"
    WEEKLY = "WEEKLY"


class InvoiceStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PAID = "PAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    OVERDUE = "OVERDUE"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class NegotiationStatus(str, enum.Enum):
    SENT = "SENT"
    UNDER_NEGOTIATION = "UNDER_NEGOTIATION"
    CONFIRMED = "CONFIRMED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    quotations = relationship("Quotation", back_populates="creator")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    tier = Column(String, nullable=True)  # Bronze, Silver, Gold
    credit_limit = Column(Float, nullable=True)
    portal_magic_token = Column(String, unique=True, index=True, nullable=True)
    portal_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    quotations = relationship("Quotation", back_populates="customer")
    subscriptions = relationship("Subscription", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    quotation_number = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    price_list_id = Column(String, nullable=False, default="default")
    status = Column(SQLEnum(QuotationStatus), nullable=False, default=QuotationStatus.DRAFT)
    total_value = Column(Float, nullable=False, default=0.0)
    blended_score = Column(Float, nullable=False, default=0.0)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="quotations")
    creator = relationship("User", back_populates="quotations")
    line_items = relationship("LineItem", back_populates="quotation", cascade="all, delete-orphan")
    approval_steps = relationship("ApprovalStep", back_populates="quotation", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="quotation", cascade="all, delete-orphan")
    fulfillment_splits = relationship("FulfillmentSplit", back_populates="quotation", cascade="all, delete-orphan")


class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    product_id = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    discount = Column(Float, nullable=False, default=0.0)  # percentage
    discount_limit = Column(Float, nullable=False, default=15.0)  # percentage
    line_total = Column(Float, nullable=False)
    status = Column(SQLEnum(LineItemStatus), nullable=False, default=LineItemStatus.OK)
    overage = Column(Float, nullable=False, default=0.0)  # points over limit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    quotation = relationship("Quotation", back_populates="line_items")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    margin = Column(Float, nullable=True)
    promo_discount = Column(Float, nullable=True)
    discount_limit = Column(Float, nullable=False, default=15.0)
    category = Column(String, nullable=True)
    description = Column(String, nullable=True)
    tax_rate = Column(Float, nullable=False, default=0.0)
    unit = Column(String, nullable=False, default="Each")
    is_subscription = Column(Integer, nullable=False, default=0)  # 0=no, 1=yes
    recurring_cycle = Column(SQLEnum(BillingCycle), nullable=True)
    quantity_on_hand = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="Active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # Submitted, Approved, Rejected, Returned, Resubmitted
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    quotation = relationship("Quotation", back_populates="audit_logs")
    user = relationship("User")


class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    approver_role = Column(SQLEnum(UserRole), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SQLEnum(ApprovalStatus), nullable=False, default=ApprovalStatus.PENDING)
    step_order = Column(Integer, nullable=False)  # 1 = Manager, 2 = Finance
    risk_level = Column(SQLEnum(RiskLevel), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    quotation = relationship("Quotation", back_populates="approval_steps")


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    shipping_cost_base = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    stock_levels = relationship("StockLevel", back_populates="warehouse")
    fulfillment_splits = relationship("FulfillmentSplit", back_populates="warehouse")


class StockLevel(Base):
    __tablename__ = "stock_levels"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    product_id = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    in_stock = Column(Integer, nullable=False, default=0)
    reserved = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    warehouse = relationship("Warehouse", back_populates="stock_levels")

    @property
    def available(self):
        return self.in_stock - self.reserved


class FulfillmentSplit(Base):
    __tablename__ = "fulfillment_splits"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    line_item_id = Column(Integer, ForeignKey("line_items.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity_fulfilled = Column(Integer, nullable=False)
    estimated_shipments = Column(Integer, nullable=False, default=1)
    shipping_cost = Column(Float, nullable=False)
    status = Column(SQLEnum(FulfillmentStatus), nullable=False, default=FulfillmentStatus.PENDING)
    is_backorder = Column(Integer, nullable=False, default=0)  # SQLite doesn't have boolean
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    quotation = relationship("Quotation", back_populates="fulfillment_splits")
    line_item = relationship("LineItem")
    warehouse = relationship("Warehouse", back_populates="fulfillment_splits")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=True)
    plan_name = Column(String, nullable=False)
    billing_cycle = Column(SQLEnum(BillingCycle), nullable=False)
    status = Column(SQLEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    amount = Column(Float, nullable=False)
    next_bill_date = Column(DateTime(timezone=True), nullable=True)
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="subscriptions")
    quotation = relationship("Quotation")
    invoices = relationship("Invoice", back_populates="subscription")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    amount = Column(Float, nullable=False)
    status = Column(SQLEnum(InvoiceStatus), nullable=False, default=InvoiceStatus.UNPAID)
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_recurring = Column(Integer, nullable=False, default=0)  # 0=one-time, 1=recurring
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="invoices")
    quotation = relationship("Quotation")
    subscription = relationship("Subscription", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    invoice = relationship("Invoice", back_populates="line_items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=True)
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    payment_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")


class CustomerNegotiation(Base):
    __tablename__ = "customer_negotiations"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    line_item_id = Column(Integer, ForeignKey("line_items.id"), nullable=False)
    customer_comment = Column(String, nullable=True)
    counter_discount = Column(Float, nullable=True)
    requested_delivery_date = Column(DateTime(timezone=True), nullable=True)
    rep_response = Column(String, nullable=True)  # REP's response to customer request
    status = Column(SQLEnum(NegotiationStatus), nullable=False, default=NegotiationStatus.SENT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    quotation = relationship("Quotation")
    line_item = relationship("LineItem")


class DiscountCeiling(Base):
    __tablename__ = "discount_ceilings"

    id = Column(Integer, primary_key=True, index=True)
    tier = Column(String, nullable=True)  # Bronze, Silver, Gold (if tier-based)
    category = Column(String, nullable=True)  # Hardware, Services (if category-based)
    max_discount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
