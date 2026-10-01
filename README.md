# MedStock AI — Intelligent Medicine Inventory, Billing, Demand Forecasting and Expiry Risk Management System

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-emerald.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.2.8-blue.svg)](https://react.dev/)
[![Express Version](https://img.shields.io/badge/express-4.21.2-lightgrey.svg)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A modern, 100% software-based, full-stack pharmacy operations and decision-support system built for medical clinics and retail pharmacies. Integrates camera-based barcode/QR scanning, Tesseract.js optical character recognition (OCR), First-Expire, First-Out (FEFO) batch inventory controls, POS billing, and explainable AI (XAI) statistical demand forecasting.

---

## 1. Problem Statement & Objectives

Hospital pharmacies and retail chemists frequently suffer from two opposing operational failures:
1. **Stock-Outs of Critical Medicines**: Inability to anticipate replenishment leads to stock-outs of life-saving therapeutics when supplier delivery lead times are exceeded.
2. **Expiry Wastage & Financial Losses**: Traditional FIFO (First In, First Out) dispensing often issues newer batches while older batches silently expire on shelves, resulting in massive financial write-offs and bio-hazardous waste.
3. **Black-Box Confusion**: Non-technical pharmacy staff distrust opaque "AI predictions" that offer no formula, breakdown, or rationale.

**MedStock AI** resolves these issues through a 100% software-driven pipeline:
- **Strict FEFO (First-Expire, First-Out) Protocol**: Billing algorithms automatically deduct units from the earliest expiring active batches.
- **Explainable AI (XAI) Forecasting**: Multi-model demand estimation (Moving Average, Weighted MA, Exponential Smoothing, Trend Regression) paired with plain-language mathematical justifications, safety stock buffers, and supplier lead time comparisons.
- **100% Clean Production Fidelity**: The application starts completely empty upon installation without auto-inserting mock records. A dedicated development seed script is provided for academic demonstration.

---

## 2. System Workflow Architecture

```
SCAN MEDICINE (Webcam Barcode / QR / Tesseract OCR)
      ↓
IDENTIFY MEDICINE (Fast Index Match)
      ↓
REGISTER / FIND MEDICINE
  ├── Not Found  → New Medicine Form (Pre-filled via OCR)
  └── Found      → Existing Medicine (Scenario A: Update / Scenario B: New Batch)
      ↓
INVENTORY & BATCH MANAGEMENT
      ↓
POS BILLING (Starts with 100% EMPTY Cart)
      ↓
AUTOMATIC STOCK DEDUCTION (FEFO Enforced)
      ↓
CONSUMPTION HISTORY LOGGING
      ↓
AI FORECASTING ENGINE
      ↓
DEMAND PREDICTION & STOCK-OUT RISK
      ↓
EXPIRY & WASTAGE RISK MATRIX (Green / Yellow / Orange / Red)
      ↓
SMART REORDER RECOMMENDATIONS (With Admin Approval Gate)
      ↓
CENTRALIZED ALERTS & WHAT-IF SIMULATOR
```

---

## 3. Technology Stack

### Frontend (`client/`)
- **React 19** with **Vite**
- **Tailwind CSS** with healthcare-focused Emerald & Navy aesthetic
- **Lucide React** icons
- **Recharts** for sales trends, consumption activity, stock proportions, and expiry horizons
- **html5-qrcode** for native camera barcode and QR decoding
- **Tesseract.js** for client-side optical character recognition of package labels

### Backend (`server/`)
- **Node.js** & **Express.js** (REST API architecture)
- **MongoDB** & **Mongoose ODM** (Atlas compatible with automatic zero-configuration embedded in-memory fallback for local development)
- **JWT (JSON Web Tokens)** & **bcryptjs** for role-based authentication (`admin` and `staff`)

---

## 4. Database Models

The database models are located under [`server/models/`](file:///c:/Users/LENOVO/Documents/web%20projects/medstock%20ai/server/models):
1. **User**: Name, email, hashed password, role (`admin` vs `staff`), active status, branch reference.
2. **Medicine**: Name, genericName, brand, category, dosageForm, strength, manufacturer, barcode, qrCode, dataMatrix, unitsPerStrip, reorderLevel, maximumStock, supplier.
3. **Batch**: Batch number, medicine reference, manufacturing date, expiry date, current quantity, initial quantity, purchase price, selling price, supplier reference, status (`Active`, `Near Expiry`, `Expired`, `Depleted`).
4. **Transaction**: Sequential invoice ID (`MED-YYYYMMDD-XXXX`), customer name, customer phone, itemized batch breakdown, subtotal, discount, tax/GST, grand total, payment method (`Cash`, `UPI`, `Card`), cashier staff.
5. **ConsumptionRecord**: Fine-grained timestamped usage records generated per batch deduction, driving the AI demand forecasting engine.
6. **Alert**: Notification entity for low stock, critical stock, out of stock, near expiry, expired, stock-out risk, and statistical consumption anomalies.
7. **Prediction**: Computed demand forecast metrics, average daily consumption, confidence score, estimated days to stock-out, safety stock, and explainable text rationale.
8. **Supplier**: Vendor details, contact info, lead time days, reliability rating, order history.
9. **Branch**: Multi-location support with code, address, and inter-branch stock transfer recommendations.
10. **SystemSettings**: Pharmacy details, GST/tax percentage, currency symbol, low stock threshold, and near-expiry horizons.

---

## 5. Installation & Setup

### Prerequisites
- **Node.js**: v20 or v24+
- **npm**: v10+
- **MongoDB**: Local MongoDB daemon or MongoDB Atlas URI (optional; automatically falls back to an embedded in-memory database if no local MongoDB is detected).

### Clone and Install Dependencies
From the repository root (`medstock ai`):
```bash
# Install root orchestration tools
npm install

# Install backend dependencies
cd server
npm install
cd ..

# Install frontend dependencies
cd client
npm install
cd ..
```

---

## 6. Environment Configuration

### Backend (`server/.env` or `.env` in root)
Copy `.env.example` to `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/medstock_ai
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

### Frontend (`client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 7. Running the Application

### Option A: Run Both Frontend & Backend Concurrently
From the project root:
```bash
npm run dev
```

### Option B: Run Separately in Two Terminals

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Server will run at http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Client will run at http://localhost:5173
```

---

## 8. Database Initialization & Development Seed Data

### Fresh Production State (Default)
When the application starts for the first time:
- **0 medicines**
- **0 batches**
- **0 sales transactions**
- **0 alerts**
- The setup wizard prompts you to register the initial **System Administrator** account.

### Optional Manual Development Seed (Requirement 50)
For evaluation, viva presentations, or testing AI forecasting with pre-populated historical data, run:
```bash
cd server
npm run seed
```
This registers:
- **Admin**: `admin@medstock.ai` / `Admin@123456`
- **Staff**: `staff@medstock.ai` / `Staff@123456`
- **Supplier**: `Test Pharma Supplier`
- **Medicine**: `TestParacetamol 500` (Batch `TEST-B001`, 100 units, Barcode: `MEDTEST001`)
- **Medicine**: `Amoxicillin 500mg` (Two batches to demonstrate FEFO ordering)
- **7 Days of Historical Consumption Logs** for AI statistical demand analysis.

To reset back to a 100% empty database at any time:
```bash
cd server
node seed.js --clean
```

---

## 9. Key Implemented Features

| Feature | Description |
|---|---|
| **Camera Barcode & QR Reader** | Normal webcam or phone camera scanner powered by `html5-qrcode`. |
| **Tesseract.js OCR Package Scanning** | Optical character recognition extracts Name, Batch, Expiry, Dosage, and Strength from uploaded medicine photos. |
| **Strict FEFO Billing Engine** | POS sales greedily draw inventory from batches with the earliest expiry date first. |
| **Empty POS Cart Enforcement** | Cart strictly opens empty. Scanned or added items are cleared immediately upon successful billing. |
| **Explainable AI (XAI) Forecasting** | Computes Moving Average, Weighted MA, Exponential Smoothing, and Trend Regression, outputting human-readable rationale. |
| **Stock-Out Predictor** | Compares `Current Stock / Daily Consumption` against `Supplier Lead Time + Safety Stock` to flag High/Critical risks. |
| **Expiry & Wastage Risk Matrix** | Color-coded horizons (Green >6m, Yellow 3-6m, Orange 1-3m, Red <1m, Critical Expired) with calculated financial loss exposure. |
| **What-If Supply Chain Simulator** | Sandbox sliders for demand spikes (+/- %), vendor delivery delays, and stock damage without mutating real data. |
| **Grounded AI Inventory Assistant** | Conversational assistant that queries real database transactions and stock levels with medical safety guardrails (no diagnosis/treatment). |
| **Printable & Downloadable Receipts** | Clean invoice dialog displaying itemized FEFO batches, GSTIN tax breakdown, and print styles. |
| **Multi-Branch Redistribution** | Detects inventory imbalances across branch locations and suggests balancing stock transfers. |

---

## 10. Medical Safety & Guardrails
MedStock AI is an **inventory, operations, and decision-support tool**. In accordance with medical ethics and software safety protocols:
- It **does NOT** diagnose medical conditions or symptoms.
- It **does NOT** recommend treatment regimens or dosages to patients.
- The AI Inventory Assistant strictly enforces guardrails against medical queries, redirecting users to licensed medical practitioners.

---

## 11. Security & Compliance
- Passwords salted and hashed with **bcryptjs** (cost factor 10).
- Stateless **JWT** authentication with role-based access control (`admin` vs `staff`).
- Strict HTTP CORS filtering.
- Zero secrets committed to version control (`.env` and `node_modules` are git-ignored).

---

## 12. License
This project is developed as an academic Final-Year B.Tech Major Project and is distributed under the [MIT License](LICENSE).
