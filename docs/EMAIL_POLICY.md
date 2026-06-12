# 📧 Veridian Bank — Email Policy

## ✅ Rule: Customer Emails ONLY

Emails are sent **ONLY to customers** for these actions:

| Action | Email Sent | To |
|--------|-----------|-----|
| Account Opening | ✅ Yes | Customer |
| Withdrawal | ✅ Yes | Customer |
| Deposit | ✅ Yes | Customer |
| OTP / 2FA | ✅ Yes | Customer |
| Fund Transfer | ✅ Yes | Customer |

## ❌ NEVER Email Admin or Super Admin

| Alert Type | Action |
|-----------|--------|
| Biometric enrollment status | Portal dashboard ONLY |
| High-value transaction alert | Portal dashboard ONLY |
| KYC status changes | Portal dashboard ONLY |
| Fraud/Threat alerts | Portal dashboard ONLY |
| System events | Portal dashboard ONLY |
| Any internal operation | Portal dashboard ONLY |

## 🖥️ Super Admin Portal

All internal alerts, system events, and monitoring data are displayed
**exclusively on the Super Admin dashboard** — no emails sent.

The `system_mail` table has:
- `portal_only = true` → shown on dashboard, no email
- `email_sent = true` → only for customer service emails

## 🔧 Implementation

- `system_mail.portal_only = TRUE` for all admin/super-admin alerts
- `system_mail.email_sent = FALSE` for internal alerts
- Email trigger only fires when `recipient_type = 'CUSTOMER'`
  AND action is in: `[withdrawal, deposit, account_opening, otp]`
