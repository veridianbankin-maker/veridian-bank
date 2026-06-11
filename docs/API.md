# 📡 Veridian Bank — API & Entity Reference

## Base URL
```
https://veridian-bank.base44.app/api
```

---

## Entities

### 👤 Customer
**Endpoint:** `/api/entities/Customer`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/Customer` | List all customers |
| GET | `/Customer/:id` | Get customer by ID |
| POST | `/Customer` | Create new customer |
| PUT | `/Customer/:id` | Update customer |
| DELETE | `/Customer/:id` | Delete customer |

**Key Fields:**
```json
{
  "customer_id": "CUST001",
  "full_name": "Rajesh Kumar",
  "phone_number": "9876543210",
  "email": "rajesh@example.com",
  "aadhaar_number": "XXXX-XXXX-1234",
  "account_number": "VB1234567890",
  "account_type": "Savings",
  "balance": 25000.00,
  "branch_code": "VB001",
  "kyc_status": "Verified",
  "account_status": "Active"
}
```

---

### 💸 Transaction
**Endpoint:** `/api/entities/Transaction`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/Transaction` | List all transactions |
| GET | `/Transaction/:id` | Get transaction by ID |
| POST | `/Transaction` | Create transaction |
| PUT | `/Transaction/:id` | Update transaction |

**Key Fields:**
```json
{
  "transaction_id": "TXN20260611001",
  "customer_id": "CUST001",
  "account_number": "VB1234567890",
  "transaction_type": "Transfer",
  "amount": 5000.00,
  "balance_after": 20000.00,
  "recipient_account": "VB9876543210",
  "transfer_mode": "IMPS",
  "status": "Success",
  "initiated_from": "Mobile"
}
```

---

### 🏦 Loan
**Endpoint:** `/api/entities/Loan`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/Loan` | List all loans |
| GET | `/Loan/:id` | Get loan by ID |
| POST | `/Loan` | Apply for loan |
| PUT | `/Loan/:id` | Update loan status |

**Key Fields:**
```json
{
  "loan_id": "LN20260001",
  "customer_id": "CUST001",
  "loan_type": "Home Loan",
  "loan_amount": 2500000.00,
  "approved_amount": 2000000.00,
  "interest_rate": 8.5,
  "tenure_months": 240,
  "emi_amount": 17356.00,
  "status": "Active"
}
```

---

### 🏢 Branch
**Endpoint:** `/api/entities/Branch`

**Key Fields:**
```json
{
  "branch_code": "VB001",
  "branch_name": "Veridian Bank - Connaught Place",
  "city": "New Delhi",
  "state": "Delhi",
  "manager_name": "Priya Sharma",
  "status": "Active"
}
```

---

### 🏪 CSP
**Endpoint:** `/api/entities/CSP`

**Key Fields:**
```json
{
  "csp_id": "CSP001",
  "csp_name": "Sharma Kirana & Banking",
  "village": "Rampur",
  "district": "Bareilly",
  "state": "Uttar Pradesh",
  "parent_branch": "VB001",
  "daily_transaction_limit": 50000,
  "status": "Active"
}
```

---

## Filtering Examples

```js
// Get active customers
Customer.filter({ account_status: "Active" })

// Get pending KYC
Customer.filter({ kyc_status: "Pending" })

// Get transactions by customer
Transaction.filter({ customer_id: "CUST001" })

// Get active loans
Loan.filter({ status: "Active" })

// Get branches by state
Branch.filter({ state: "Delhi" })
```

---

## Authentication

All API requests require a valid Base44 session token in the header:
```
Authorization: Bearer <session_token>
X-App-ID: <veridian_bank_app_id>
```
