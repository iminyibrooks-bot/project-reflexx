# Reflex – Rider & Scanning Module

## 1. Purpose

The Rider & Scanning module verifies the physical handoff of an order from the retailer to the rider and from the rider to the customer.

**Core flow:**

`Order Created → QR Generated → Rider Assigned → Pickup Scan → Delivery Scan`

The **same unique QR code** is used at both the shop and the customer's door.


## 2. Rider Workflow

### Step 1: Order Creation
- Retailer enters customer name, phone, delivery address and item description.
- Reflex creates a unique `order_id`.
- A unique verification token is generated.
- The token is hashed and stored in the database.
- The token is encoded in the order's QR code.

### Step 2: Rider Assignment
- Dispatcher assigns the order to a rider.
- The rider sees the assigned order on the rider dashboard.

### Step 3: Pickup at Shop
- Rider arrives at the retailer/shop.
- Rider scans the order QR code.
- System validates the QR, rider and order status.
- If valid: `ASSIGNED → PICKED_UP`
- Pickup time and scan event are recorded.

### Step 4: Delivery at Customer
- Rider delivers the order to the customer's address.
- Rider scans the **same QR code**.
- System validates the QR, rider and order status.
- If valid: `PICKED_UP → DELIVERED`
- Delivery time and scan event are recorded.

### Valid Status Flow

`ASSIGNED → PICKED_UP → DELIVERED`

Invalid, duplicate or out-of-sequence scans are rejected.

---

## 3. QR Verification

When an order is created, Reflex generates a unique random verification token.

The QR contains the token, while the database stores its hash.

### Scan Process

`QR Scan → Hash Token → Find Order → Validate Rider → Validate Status → Accept/Reject`

A scan is accepted only if:
- The QR/token is valid.
- The QR belongs to the order.
- The rider is assigned to the order.
- The current order status allows the action.
- The action has not already been completed.

The QR identifies the order. The current order status determines whether the scan represents pickup or delivery.

---

## 4. Database Tables

### `orders`

Stores the delivery request and its current state.

```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    item_description TEXT NOT NULL,
    assigned_rider_id INT,
    qr_token_hash VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ASSIGNED',
    pickup_time DATETIME NULL,
    delivery_time DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
``` 

### `delivery_events`

Stores every pickup and delivery scan as an audit trail.

```sql
CREATE TABLE delivery_events (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    rider_id INT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(255),

    FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
);
```

### Database Principle

`orders` = **current state**

`delivery_events` = **history/audit trail**

This allows Reflex to determine who performed a scan, what happened, when it happened and where it happened.

---

## 5. Frontend Features

### Rider Dashboard

The rider dashboard displays:

- Assigned deliveries
- Customer name
- Delivery address
- Item description
- Current delivery status
-Scan QR  button

### QR Scanner

The QR scanner supports both handoff points:

- **Pickup at shop:** Rider scans the order QR code to verify collection.
- **Delivery at customer's door:** Rider scans the **same QR code** to verify final delivery.

### Scan Results

**Successful pickup:**

`Pickup verified successfully.`

**Successful delivery:**

`Delivery verified successfully.`

**Possible errors:**

- `Scan rejected: QR code is invalid.`
- `Scan rejected: You are not assigned to this order.`
- `Scan rejected: Order is not ready for this action.`


## 6. Client State

The frontend maintains:

- Current rider
- Assigned orders
- Selected order
- Current order status
- QR scan result
- Loading state
- Error/success message

Successful scans update the displayed order status immediately.

```text
ASSIGNED → scan → PICKED_UP
PICKED_UP → scan → DELIVERED
```

---

## 7. API Integration

### Get Assigned Deliveries

```text
GET /api/rider/orders
```

Returns orders assigned to the logged-in rider.

### Scan QR

```text
POST /api/orders/{order_id}/scan
```

Sends the scanned QR token and rider information to the backend.

Backend validates:

```text
QR + Order + Rider + Current Status
```

### Update Status

```text
PATCH /api/orders/{order_id}/status
```

Updates the order after a valid scan.

Allowed transitions:

```text
ASSIGNED → PICKED_UP
PICKED_UP → DELIVERED
```

---

## 8. End-to-End Flow

```text
RETAILER
   ↓
Create Order
   ↓
Generate Unique QR
   ↓
DISPATCHER
   ↓
Assign Rider
   ↓
RIDER DASHBOARD
   ↓
Scan QR at SHOP
   ↓
Validate QR + Rider + Status
   ↓
PICKED_UP
   ↓
Transport Order
   ↓
Scan SAME QR at CUSTOMER
   ↓
Validate QR + Rider + Status
   ↓
DELIVERED
```

---

## 9. Edge Cases

### Wrong Rider

A rider scans an order assigned to another rider.

**Result:** Scan rejected.

### Duplicate Pickup

Order is already `PICKED_UP`.

**Result:** Another pickup scan is rejected.

### Delivery Before Pickup

Order is still `ASSIGNED`.

**Result:** Delivery scan is rejected.

### Duplicate Delivery

Order is already `DELIVERED`.

**Result:** Scan rejected.

### Invalid QR

QR token does not match a stored order.

**Result:** Scan rejected.

---

## 10. Key Design Decision

### One QR, Two Handoffs

Reflex uses **one unique QR code per order** instead of separate pickup and delivery QR codes.

The QR identifies the order, while the order status determines what the scan means.

**Same QR → Pickup Verified → Delivery Verified**

This creates a continuous digital record of the physical order.

---

## 11. Trade-off

QR scanning confirms that the correct order credential was scanned, but QR alone does not prove the rider was physically at the exact shop or customer's door.

This is acceptable for the MVP because it keeps verification simple and fast.

With more time, GPS coordinates and geofencing could be added to scan events for stronger location verification.

---

## Key Takeaway

**The same unique QR code connects the physical order to its digital record at both the shop and the customer's door, while rider, status and scan-event checks prevent invalid handoffs.**

