# 🏗️ Veridian Bank — System Architecture

## Overview

Veridian Bank is a multi-tier digital banking platform with role-based access for customers, branch staff, CSP operators, and executives.

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│                FRONTEND (React)                  │
│         https://veridian-bank.base44.app         │
│  100+ Pages: Customer Portal, Admin, Branch,     │
│  CSP Dashboard, Analytics, KYC, Loans, Cards    │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│              BASE44 PLATFORM                     │
│  - Entity ORM (CRUD + RLS)                       │
│  - Auth & Role Management                        │
│  - Backend Functions (Deno)                      │
│  - Automations (CRON + Entity triggers)          │
│  - File Storage (CDN)                            │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│              SUPABASE (PostgreSQL)               │
│  Project: ap-southeast-1                         │
│  - Extended data storage                         │
│  - Complex queries                               │
│  - Real-time subscriptions                       │
└─────────────────────────────────────────────────┘
```

## User Roles

| Role | Access |
|------|--------|
| Customer | Self-service portal, transactions, loans, cards |
| Branch Officer | Customer management, KYC, account ops |
| Branch Manager | Branch dashboard, approvals, team management |
| CSP Operator | Cash ops, account opening, remittance |
| Field Officer | On-ground customer onboarding |
| HQ Executive | Full analytics, compliance, audit trail |
| Admin | Full system access |

## Key Modules

### 1. Customer Lifecycle
Account Opening → KYC → Activation → Transactions → Loans → Closure

### 2. Branch Operations
Branch Registry → Staff Management → Performance Tracking → Audit

### 3. CSP Network
CSP Onboarding → Cash Management → Commission → Reconciliation

### 4. Compliance & Security
Biometric KYC → E-Signature → Fraud Detection → Audit Trail → Risk Scoring

### 5. Analytics Stack
Branch-wise Analytics → Executive Dashboard → Automated Reports → AI Insights
