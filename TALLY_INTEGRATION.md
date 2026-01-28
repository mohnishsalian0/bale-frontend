# TallyPrime Integration Research Report

## Executive Summary

TallyPrime offers **four primary integration methods**: TDL (native), JSON via HTTP, XML via HTTP, and ODBC. For your web-based accounting SaaS (Bale), **JSON over HTTP** is the recommended approach due to its modern REST-like architecture, ease of implementation in Node.js/TypeScript, and bidirectional data exchange capabilities.

---

## 1. Integration Techniques

### **A. TDL (Tally Definition Language) - Native Integration**

**Description:**
- Native, compiled language embedded within TallyPrime
- Enables UI customization and real-time data access
- Highest performance (no network latency)

**How it works:**
- Write TDL code that runs inside TallyPrime
- Direct access to masters, vouchers, and ledgers
- Can trigger HTTP calls to external APIs

**Pros:**
- ✅ Best performance (native execution)
- ✅ Real-time synchronization
- ✅ Can modify TallyPrime UI
- ✅ No network overhead

**Cons:**
- ❌ Requires learning TDL language
- ❌ Requires TallyPrime to be running
- ❌ Not suitable for cloud-based SaaS architecture
- ❌ Deployment complexity (TCP files)

**Use case:** Desktop applications with deep Tally customization needs

---

### **B. JSON over HTTP - Modern API Integration** ⭐ **RECOMMENDED**

**Description:**
- Lightweight, REST-like integration using JSON format
- TallyPrime acts as HTTP server (receives requests) or client (sends requests)
- Supported since TallyPrime 7.0 with native JSON format

**How it works:**

**Method 1: External App → TallyPrime (POST)**
```
Your App (Bale) → HTTP POST → TallyPrime (Server on port 9000)
```

**Method 2: TallyPrime → External App (GET/POST)**
```
TallyPrime (TDL) → HTTP GET/POST → Your App API
```

**Request Structure:**
```json
{
  "headers": {
    "content-type": "application/json",
    "version": "1",
    "tallyrequest": "Import",  // Import, Export, Execute
    "type": "Data",            // Object, Collection, Data
    "id": "Vouchers"           // Specific entity
  },
  "body": {
    "static_variables": {
      "svExportFormat": "$$SysName:JSONEx",
      "svCurrentCompany": "Your Company Name"
    },
    "tallymessage": [
      // Actual data (ledgers, vouchers, etc.)
    ]
  }
}
```

**Response Structure:**
```json
{
  "status": "1",  // 1=success, 0=failure
  "cmp_info": {},
  "tallymessage": [],
  "result": {
    "CREATED": 1,
    "ALTERED": 0,
    "ERRORS": 0
  }
}
```

**Pros:**
- ✅ Modern, lightweight format
- ✅ Easy to implement in Node.js/TypeScript
- ✅ Bidirectional (read & write)
- ✅ Native format support (no custom mapping)
- ✅ UTF-8/UTF-16 encoding for multilingual support
- ✅ Works well with cloud-based SaaS

**Cons:**
- ❌ Requires TallyPrime to be running as HTTP server
- ❌ Less mature than XML (introduced in TallyPrime 7.0)
- ❌ Limited documentation/examples
- ❌ Requires network access to client's TallyPrime instance

**Use case:** Modern web/mobile applications with JSON-based APIs

---

### **C. XML over HTTP - Mature API Integration**

**Description:**
- Structured, schema-based data exchange
- Most mature integration method (available since Tally.ERP 9)
- TallyPrime can act as HTTP server or client

**Request Example:**
```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DATA>
      <TALLYMESSAGE>
        <VOUCHER>
          <DATE>20080402</DATE>
          <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
          <VOUCHERNUMBER>INV/2024-25/0001</VOUCHERNUMBER>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Customer Name</LEDGERNAME>
            <AMOUNT>59000</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
```

**Pros:**
- ✅ Most mature and stable
- ✅ Extensive documentation and examples
- ✅ Full read/write capabilities
- ✅ Schema validation available
- ✅ Proven in production environments

**Cons:**
- ❌ Verbose (larger payloads)
- ❌ More complex to parse than JSON
- ❌ Requires XML library in your stack
- ❌ Requires TallyPrime to be running

**Use case:** Enterprise integrations requiring robust, proven technology

---

### **D. ODBC - Database Connectivity**

**Description:**
- Real-time database-like access to TallyPrime data
- TallyPrime acts as ODBC server exposing collections as tables
- Primarily for reporting and analytics

**How it works:**
```
Power BI/Excel/Your App → ODBC Driver → TallyPrime (port 9000)
```

**Configuration:**
- Enable ODBC in TallyPrime (Alt+F1 → Client/Server → ODBC)
- Requires matching bitness (32-bit or 64-bit) across OS, Tally, and client
- Default port: 9000

**Pros:**
- ✅ Excellent for reporting and analytics
- ✅ Direct integration with Excel, Power BI, Tableau
- ✅ SQL-like query syntax
- ✅ Real-time data access

**Cons:**
- ❌ **Read-heavy** (limited write capabilities)
- ❌ Requires ODBC driver installation
- ❌ Bitness compatibility issues
- ❌ Not suitable for transactional data import
- ❌ Requires TallyPrime to be running

**Use case:** BI dashboards, reporting, and analytics (not for data import)

---

### **E. Third-Party API Platforms**

**Description:**
- Services like **API2Books.com** (formerly TallyPrimeAPI.com)
- Provide REST API layer on top of TallyPrime
- Cloud-hosted with API key authentication

**How it works:**
```
Your App → REST API (API2Books) → TallyPrime (via plugin)
```

**Features:**
- **GET API**: Extract masters, vouchers, reports in JSON
- **POST API**: Import data via JSON with API keys
- Plugin/TCP file loaded in TallyPrime
- AWS-hosted for security

**Pros:**
- ✅ Simplified integration (no direct TallyPrime communication)
- ✅ API key authentication
- ✅ Managed service (handles complexity)
- ✅ Scheduled sync capabilities

**Cons:**
- ❌ **Third-party dependency**
- ❌ **Recurring costs** (subscription-based)
- ❌ Data passes through external servers
- ❌ Less control over integration
- ❌ Still requires plugin installation in TallyPrime

**Use case:** Quick integration without deep technical expertise

---

## 2. Specifications & Requirements

### **A. License Requirements**

| Requirement | Details |
|-------------|---------|
| **TallyPrime License** | Active Gold/Silver license required |
| **Server Mode** | TallyPrime must run as HTTP server (port 9000 default) |
| **Network Access** | Your app needs network access to client's TallyPrime instance |
| **Concurrent Users** | Gold license supports multi-user; Silver is single-user |

### **B. Technical Prerequisites**

**For HTTP Integration (JSON/XML):**
- TallyPrime version 7.0+ (for native JSON support)
- HTTP server enabled in TallyPrime
- Port 9000 open (configurable)
- Company must be loaded in TallyPrime

**For ODBC Integration:**
- ODBC enabled in TallyPrime (Alt+F1 → ODBC)
- Matching bitness (32-bit or 64-bit) across:
  - Operating System
  - TallyPrime installation
  - Your application/reporting tool
- ODBC driver installed on client machine

### **C. Data Formats Supported**

**Native JSON Format:**
- Tally-understandable structure (object schema-based)
- No TDL mapping required
- Direct import/export capability

**Custom JSON Format:**
- Requires TDL capabilities for mapping
- More flexibility but added complexity

**JSON Versions:**
- **JSON** (v1): Original format, UTF-8 only
- **JSONEX** (v2): TallyPrime 7.0+, enhanced with UTF-16 support

### **D. Authentication & Security**

⚠️ **Key Finding:** TallyPrime does **NOT** have built-in authentication for HTTP integration.

**Security considerations:**
- No API keys or bearer tokens at Tally level
- Relies on network-level security (VPN, firewall)
- Third-party platforms (API2Books) add API key authentication
- TDL can add custom headers for external API calls

**Recommendations:**
- Use VPN/SSH tunneling for secure access
- Implement authentication in your middleware layer
- Consider third-party platform if security is critical

### **E. Port & Network Configuration**

| Component | Port | Protocol |
|-----------|------|----------|
| TallyPrime HTTP Server | 9000 (default) | HTTP |
| TallyPrime ODBC Server | 9000 (default) | ODBC |
| Tally Gateway Server | 9090 | HTTP |

---

## 3. Best Integration Method for Your Project

### **Project Context Analysis**

Based on your `ACCOUNTING_REQUIREMENTS.md`:

✅ **Your Tech Stack:**
- Next.js 14+ (App Router), TypeScript
- Supabase (PostgreSQL)
- Cloud-hosted SaaS application
- Multi-tenant (company-based isolation)

✅ **Your Requirements:**
- Export ledgers, invoices, vouchers to TallyPrime
- Bidirectional sync (potential future reads from Tally)
- Financial year-aware numbering
- GST compliance data
- Bill-wise payment tracking

---

### **Recommended Approach: Hybrid Strategy**

### **🎯 Strategy 1: Direct HTTP JSON Integration (Recommended for MVP)**

**Architecture:**
```
Bale SaaS App (Next.js)
    ↓
Middleware API (Next.js API Route)
    ↓
HTTP POST (JSON)
    ↓
Client's TallyPrime (Local/Cloud Instance)
```

**Implementation Steps:**

1. **Export Module in Your App:**
   ```typescript
   // src/lib/tally/exporter.ts
   export async function exportToTally(config: TallyExportConfig) {
     const endpoint = `http://${config.tallyHost}:${config.tallyPort}`;

     const payload = {
       headers: {
         "content-type": "application/json",
         "version": "1",
         "tallyrequest": "Import",
         "type": "Data",
         "id": "Vouchers"
       },
       body: buildTallyMessage(invoices, ledgers)
     };

     const response = await fetch(endpoint, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload)
     });

     return response.json();
   }
   ```

2. **Data Mapping Layer:**
   ```typescript
   // src/lib/tally/mappers.ts
   export function mapInvoiceToTallyVoucher(invoice: Invoice): TallyVoucher {
     return {
       DATE: formatTallyDate(invoice.invoice_date),
       VOUCHERNUMBER: invoice.invoice_number,
       VOUCHERTYPENAME: invoice.invoice_type === 'sales' ? 'Sales' : 'Purchase',
       NARRATION: invoice.notes,
       ALLLEDGERENTRIES: buildLedgerEntries(invoice),
       ALLINVENTORYENTRIES: buildInventoryEntries(invoice.items)
     };
   }
   ```

3. **Company-Specific Configuration:**
   ```typescript
   // Store per-company Tally configuration
   type TallyConfig = {
     company_id: string;
     tally_host: string;      // Client's Tally IP/hostname
     tally_port: number;      // Default 9000
     tally_company_name: string;
     is_enabled: boolean;
     last_synced_at: string;
   };
   ```

**Pros:**
- ✅ No third-party dependencies
- ✅ Full control over integration
- ✅ Modern JSON format (fits your stack)
- ✅ Can be built incrementally
- ✅ No recurring costs

**Cons:**
- ❌ Requires client's TallyPrime to be accessible
- ❌ Network/firewall complexities
- ❌ No built-in authentication
- ❌ Each client needs Tally instance running

---

### **🔄 Strategy 2: Third-Party Platform (API2Books) - Simpler but Costly**

**Architecture:**
```
Bale SaaS App
    ↓
API2Books REST API (Cloud)
    ↓
Client's TallyPrime (with plugin)
```

**Implementation:**
```typescript
// Simpler - just call REST API
const response = await fetch('https://api2books.com/v1/vouchers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${client.apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ vouchers: mappedData })
});
```

**Pros:**
- ✅ Simplified integration
- ✅ Managed authentication
- ✅ Scheduled syncs
- ✅ Less infrastructure complexity

**Cons:**
- ❌ **Recurring costs per client**
- ❌ Third-party dependency
- ❌ Data privacy concerns (passes through external servers)
- ❌ Less control over integration

---

### **📊 Strategy 3: ODBC (For Future Reporting Only)**

**Use case:** Dashboard showing real-time Tally data in your app

```typescript
// Not for data export, but for reading Tally data
import { createConnection } from 'odbc';

const connection = await createConnection(
  `DSN=TallyODBC64_9000;ServerName=${config.tallyHost}`
);

// Read ledger balances
const ledgers = await connection.query(
  'SELECT _Name, _ClosingBalance FROM Ledger WHERE _Parent = "Sundry Debtors"'
);
```

**Recommendation:** Implement later for analytics/dashboards

---

## 4. Recommended Implementation Roadmap

### **Phase 1: MVP (Direct HTTP JSON)**

**Week 1-2: Foundation**
- [ ] Create Tally configuration table in Supabase
- [ ] Build JSON export functions for:
  - Ledgers (Chart of Accounts)
  - Stock Items (Products)
- [ ] Implement TallyPrime native JSON format mapper
- [ ] Add test environment setup guide

**Week 3-4: Core Entities**
- [ ] Sales invoice → Sales voucher mapping
- [ ] Purchase invoice → Purchase voucher mapping
- [ ] Credit/Debit notes → Credit/Debit note vouchers
- [ ] Payment/Receipt vouchers with bill-wise allocations

**Week 5-6: Validation & Error Handling**
- [ ] Pre-export validation (GST numbers, amounts)
- [ ] Error handling and retry logic
- [ ] Export status tracking (pending/success/failed)
- [ ] User-friendly error messages

**Week 7-8: Testing & Documentation**
- [ ] Test with actual TallyPrime instance
- [ ] Roundtrip validation (export → verify in Tally)
- [ ] Edge cases (zero amounts, negative roundoff, GST scenarios)
- [ ] User documentation and setup guide

### **Phase 2: Enhancements**

- [ ] Batch export (multiple invoices at once)
- [ ] Incremental sync (only new/modified records)
- [ ] Export scheduler (daily/weekly automation)
- [ ] ODBC read integration for dashboards
- [ ] Multi-company Tally support

---

## 5. Key Technical Considerations

### **A. Native JSON Format Structure**

You'll need to map your Supabase schema to Tally's native format:

**Your Invoice → Tally Sales Voucher:**
```json
{
  "VOUCHER": {
    "DATE": "20240401",
    "VOUCHERNUMBER": "INV/2024-25/0001",
    "VOUCHERTYPENAME": "Sales",
    "NARRATION": "Invoice for sales order",
    "PARTYLEDGERNAME": "Acme Textiles",

    "ALLINVENTORYENTRIES.LIST": [
      {
        "STOCKITEMNAME": "Cotton Fabric 100 GSM",
        "ISDEEMEDPOSITIVE": "Yes",
        "RATE": "500/Metre",
        "AMOUNT": "-50000",
        "BILLEDQTY": "100 Mtr",

        "ACCOUNTINGALLOCATIONS.LIST": [
          {
            "LEDGERNAME": "CGST @ 9%",
            "AMOUNT": "-4500"
          },
          {
            "LEDGERNAME": "SGST @ 9%",
            "AMOUNT": "-4500"
          }
        ]
      }
    ],

    "ALLLEDGERENTRIES.LIST": [
      {
        "LEDGERNAME": "Acme Textiles",
        "ISDEEMEDPOSITIVE": "Yes",
        "AMOUNT": "59000",
        "BILLALLOCATIONS.LIST": {
          "NAME": "INV/2024-25/0001",
          "BILLTYPE": "New Ref",
          "AMOUNT": "59000"
        }
      },
      {
        "LEDGERNAME": "Sales",
        "AMOUNT": "-50000"
      },
      {
        "LEDGERNAME": "CGST @ 9%",
        "AMOUNT": "-4500"
      },
      {
        "LEDGERNAME": "SGST @ 9%",
        "AMOUNT": "-4500"
      }
    ]
  }
}
```

### **B. Critical Mapping Requirements**

| Your Field | Tally Field | Notes |
|------------|-------------|-------|
| `invoice_date` | `DATE` | Format: YYYYMMDD |
| `invoice_number` | `VOUCHERNUMBER` | Must be unique |
| `invoice_type` | `VOUCHERTYPENAME` | "Sales" or "Purchase" |
| `gst_type` | GST ledger structure | "CGST+SGST" vs "IGST" |
| `party_ledger_snapshot.name` | `PARTYLEDGERNAME` | Must exist in Tally |
| `total_amount` | Sum of `AMOUNT` fields | Must balance (Dr = Cr) |
| `outstanding_amount` | `BILLALLOCATIONS.LIST` | For bill-wise tracking |

### **C. Data Integrity Checklist**

Before export, validate:

✅ **Accounting Equation:** Sum of debits = Sum of credits
✅ **GST Numbers:** Valid 15-char format
✅ **Date Format:** YYYYMMDD
✅ **Ledger Existence:** All ledgers exist in Tally (export masters first)
✅ **Amounts:** No NULL values, proper signs (positive/negative)
✅ **Bill References:** Unique invoice numbers
✅ **Stock Items:** Exist in Tally with matching units

---

## 6. Comparison Matrix

| Factor | Direct HTTP JSON | API2Books | XML | ODBC |
|--------|-----------------|-----------|-----|------|
| **Ease of Implementation** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Easy | ⭐⭐⭐ Medium | ⭐⭐ Hard |
| **Cost** | ⭐⭐⭐⭐⭐ Free | ⭐⭐ Subscription | ⭐⭐⭐⭐⭐ Free | ⭐⭐⭐⭐⭐ Free |
| **Control** | ⭐⭐⭐⭐⭐ Full | ⭐⭐⭐ Limited | ⭐⭐⭐⭐⭐ Full | ⭐⭐⭐ Medium |
| **Bidirectional** | ⭐⭐⭐⭐⭐ Yes | ⭐⭐⭐⭐⭐ Yes | ⭐⭐⭐⭐⭐ Yes | ⭐⭐ Read-heavy |
| **Maturity** | ⭐⭐⭐ New (v7.0) | ⭐⭐⭐⭐ Established | ⭐⭐⭐⭐⭐ Mature | ⭐⭐⭐⭐ Mature |
| **Documentation** | ⭐⭐⭐ Good | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Good |
| **SaaS-Friendly** | ⭐⭐⭐ Requires setup | ⭐⭐⭐⭐⭐ Yes | ⭐⭐⭐ Requires setup | ⭐⭐ Desktop-focused |
| **Security** | ⭐⭐ No auth | ⭐⭐⭐⭐ API keys | ⭐⭐ No auth | ⭐⭐⭐ ODBC auth |

---

## 7. Final Recommendation

### **For Bale SaaS Application:**

**🎯 Primary Method: Direct HTTP JSON Integration**

**Why:**
1. ✅ **Modern & Lightweight:** Fits your TypeScript/Next.js stack perfectly
2. ✅ **Full Control:** No vendor lock-in, complete customization
3. ✅ **Cost-Effective:** No recurring fees per client
4. ✅ **Scalable:** Can handle multi-tenant architecture
5. ✅ **Future-Proof:** JSON is TallyPrime's forward direction

**Implementation Strategy:**
- Start with **one-way export** (Bale → Tally)
- Build robust data mapping layer
- Add comprehensive validation
- Provide clear setup guide for clients
- Track export status per invoice/payment
- Consider API2Books as **fallback option** for non-technical clients

**Client Setup Required:**
1. TallyPrime Gold/Silver license
2. Enable HTTP server (port 9000)
3. VPN/SSH tunnel if cloud-hosted Bale (security)
4. Company loaded in TallyPrime

**Technical Architecture:**
```
┌─────────────────────┐
│  Bale SaaS (Cloud)  │
│   Next.js + TS      │
└──────────┬──────────┘
           │
           │ HTTPS API Call
           ↓
┌─────────────────────┐
│   Middleware API    │
│  (Next.js Route)    │
│  - Validation       │
│  - Mapping          │
│  - Error Handling   │
└──────────┬──────────┘
           │
           │ HTTP POST (JSON)
           ↓
┌─────────────────────┐
│ Client's TallyPrime │
│  (Local/Cloud VM)   │
│  Port 9000 (HTTP)   │
└─────────────────────┘
```

---

## 8. Implementation Details

### **A. Database Schema for Tally Configuration**

```sql
-- Tally configuration per company
CREATE TABLE tally_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Connection details
  tally_host TEXT NOT NULL,           -- IP or hostname
  tally_port INTEGER NOT NULL DEFAULT 9000,
  tally_company_name TEXT NOT NULL,   -- Company name in TallyPrime

  -- Status
  is_enabled BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,              -- 'success', 'failed', 'pending'
  last_sync_error TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(company_id)
);

-- Export tracking per entity
CREATE TABLE tally_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Entity reference
  entity_type TEXT NOT NULL,          -- 'invoice', 'payment', 'ledger', etc.
  entity_id UUID NOT NULL,

  -- Export details
  export_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'success', 'failed'
  export_error TEXT,
  exported_at TIMESTAMPTZ,
  tally_response JSONB,               -- Store Tally's response

  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, entity_type, entity_id)
);
```

### **B. TypeScript Type Definitions**

```typescript
// src/types/tally.types.ts

/**
 * TallyPrime HTTP Request Structure
 */
export interface TallyRequest {
  headers: TallyHeaders;
  body: TallyRequestBody;
}

export interface TallyHeaders {
  "content-type": "application/json";
  version: "1";
  tallyrequest: "Import" | "Export" | "Execute";
  type: "Data" | "Object" | "Collection" | "Function";
  id: string; // "Vouchers", "All Masters", "Ledger", etc.
}

export interface TallyRequestBody {
  static_variables: {
    svExportFormat?: "$$SysName:JSONEx";
    svCurrentCompany: string;
    svMstImportFormat?: "$$SysName:JSONEx";
    svVchImportFormat?: "$$SysName:JSONEx";
  };
  tallymessage: TallyVoucher[] | TallyLedger[] | TallyStockItem[];
}

/**
 * TallyPrime Response Structure
 */
export interface TallyResponse {
  status: "1" | "0"; // 1 = success, 0 = failure
  cmp_info?: {
    name: string;
    guid: string;
  };
  result?: {
    CREATED: number;
    ALTERED: number;
    DELETED?: number;
    COMBINED?: number;
    ERRORS: number;
    LASTVCHID?: string;
  };
  tallymessage?: any[];
  error?: string;
}

/**
 * Tally Voucher (Sales/Purchase/Payment/Receipt)
 */
export interface TallyVoucher {
  VOUCHER: {
    DATE: string; // YYYYMMDD format
    VOUCHERNUMBER: string;
    VOUCHERTYPENAME: "Sales" | "Purchase" | "Payment" | "Receipt" | "Credit Note" | "Debit Note";
    NARRATION?: string;
    PARTYLEDGERNAME?: string;
    PERSISTEDVIEW?: string;

    // Inventory entries (for sales/purchase invoices)
    "ALLINVENTORYENTRIES.LIST"?: TallyInventoryEntry[];

    // Ledger entries (for all vouchers)
    "ALLLEDGERENTRIES.LIST": TallyLedgerEntry[];
  };
}

export interface TallyInventoryEntry {
  STOCKITEMNAME: string;
  ISDEEMEDPOSITIVE: "Yes" | "No";
  RATE: string; // "500/Metre"
  AMOUNT: string; // Negative for sales
  BILLEDQTY: string; // "100 Mtr"

  // GST allocations per item
  "ACCOUNTINGALLOCATIONS.LIST"?: TallyAccountingAllocation[];

  // Batch details
  "BATCHALLOCATIONS.LIST"?: TallyBatchAllocation[];
}

export interface TallyAccountingAllocation {
  LEDGERNAME: string;
  ISDEEMEDPOSITIVE?: "Yes" | "No";
  AMOUNT: string;
}

export interface TallyBatchAllocation {
  GODOWNNAME?: string;
  BATCHNAME?: string;
  AMOUNT: string;
}

export interface TallyLedgerEntry {
  LEDGERNAME: string;
  ISDEEMEDPOSITIVE: "Yes" | "No";
  AMOUNT: string;

  // Bill-wise details (for party ledgers)
  "BILLALLOCATIONS.LIST"?: TallyBillAllocation[];

  // Bank details (for payment/receipt)
  "BANKALLOCATIONS.LIST"?: TallyBankAllocation[];
}

export interface TallyBillAllocation {
  NAME: string; // Invoice number
  BILLTYPE: "New Ref" | "Agst Ref" | "On Account";
  AMOUNT: string;
}

export interface TallyBankAllocation {
  DATE: string; // YYYYMMDD
  INSTRUMENTNUMBER?: string; // Cheque number
  TRANSACTIONTYPE?: "Cheque" | "NEFT" | "RTGS" | "UPI" | "Cash";
  PAYMENTMODE?: "Transacted" | "Cleared";
}

/**
 * Tally Ledger Master
 */
export interface TallyLedger {
  LEDGER: {
    NAME: string;
    PARENT: string; // "Sundry Debtors", "Bank Accounts", etc.
    ISBILLWISEACTIVE?: "Yes" | "No";
    OPENINGBALANCE?: string;
    MAILINGNAME?: string;
    "ADDRESS.LIST"?: { ADDRESS: string }[];
    LEDSTATENAME?: string; // State name
    PARTYGSTIN?: string; // GST number
    EMAIL?: string;
    PHONE?: string;
  };
}

/**
 * Tally Stock Item Master
 */
export interface TallyStockItem {
  STOCKITEM: {
    NAME: string;
    PARENT?: string; // Stock group
    CATEGORY?: string;
    BASEUNITS: string; // "Mtr", "Nos", etc.
    OPENINGBALANCE?: string;
    OPENINGVALUE?: string;
    OPENINGRATE?: string;
    GSTAPPLICABLE?: "Applicable" | "Not Applicable";
    HSNCODE?: string;
    TAXABILITY?: "Taxable" | "Exempt";
    GSTRATE?: string; // "18.00"
  };
}

/**
 * Configuration for connecting to TallyPrime
 */
export interface TallyConfig {
  company_id: string;
  tally_host: string;
  tally_port: number;
  tally_company_name: string;
  is_enabled: boolean;
  last_synced_at: string | null;
}

/**
 * Export tracking
 */
export interface TallyExport {
  id: string;
  company_id: string;
  entity_type: "invoice" | "payment" | "ledger" | "stock_item" | "credit_note" | "debit_note";
  entity_id: string;
  export_status: "pending" | "success" | "failed";
  export_error: string | null;
  exported_at: string | null;
  tally_response: TallyResponse | null;
  retry_count: number;
}
```

### **C. Helper Functions**

```typescript
// src/lib/tally/helpers.ts

/**
 * Format date to TallyPrime format (YYYYMMDD)
 */
export function formatTallyDate(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format amount for TallyPrime (with proper sign)
 */
export function formatTallyAmount(amount: number, isDeemedPositive: boolean = false): string {
  // Tally uses negative for credits, positive for debits in vouchers
  // But it's context-dependent
  return amount.toFixed(2);
}

/**
 * Determine if amount is deemed positive based on ledger type and voucher type
 */
export function isDeemedPositive(
  ledgerType: string,
  voucherType: string,
  isDebit: boolean
): "Yes" | "No" {
  // Complex logic based on Tally's accounting rules
  // Simplification: debits are deemed positive in most cases
  return isDebit ? "Yes" : "No";
}

/**
 * Build TallyPrime HTTP endpoint URL
 */
export function buildTallyEndpoint(config: TallyConfig): string {
  return `http://${config.tally_host}:${config.tally_port}`;
}

/**
 * Validate GST number format
 */
export function isValidGSTNumber(gstin: string | null): boolean {
  if (!gstin) return false;
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstin);
}

/**
 * Get Tally voucher type from invoice type
 */
export function getTallyVoucherType(
  invoiceType: "sales" | "purchase",
  adjustmentType?: "credit" | "debit"
): string {
  if (adjustmentType === "credit") return "Credit Note";
  if (adjustmentType === "debit") return "Debit Note";
  return invoiceType === "sales" ? "Sales" : "Purchase";
}

/**
 * Calculate accounting equation balance
 * Returns 0 if balanced, otherwise the difference
 */
export function calculateBalance(ledgerEntries: TallyLedgerEntry[]): number {
  const total = ledgerEntries.reduce((sum, entry) => {
    const amount = parseFloat(entry.AMOUNT);
    return sum + amount;
  }, 0);
  return Math.abs(total); // Should be 0 for balanced voucher
}

/**
 * Validate voucher before export
 */
export function validateVoucher(voucher: TallyVoucher): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check date format
  if (!/^\d{8}$/.test(voucher.VOUCHER.DATE)) {
    errors.push("Invalid date format. Use YYYYMMDD.");
  }

  // Check voucher number
  if (!voucher.VOUCHER.VOUCHERNUMBER) {
    errors.push("Voucher number is required.");
  }

  // Check accounting equation
  const balance = calculateBalance(voucher.VOUCHER["ALLLEDGERENTRIES.LIST"]);
  if (balance > 0.01) { // Allow 1 paisa tolerance
    errors.push(`Voucher is not balanced. Difference: ${balance}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## 9. Frequently Asked Questions (FAQ)

### **Q1: Can TallyPrime HTTP POST requests be done over the Internet or is it a local server over local network?**

**Answer:** Both options are possible, but each has different requirements:

#### **Option 1: Local Network (Simplest)**
- ✅ **Best for:** Office setups where Bale users and TallyPrime are on the same LAN
- TallyPrime HTTP server runs on port 9000 (default)
- Your app sends requests to `http://192.168.x.x:9000` (local IP)
- **Pros:** Simple, fast, no security concerns
- **Cons:** Limited to same network

#### **Option 2: Internet Access (Remote)**

TallyPrime can be accessed over the Internet using several methods:

**a) VPN (Recommended)**
- ✅ **Most Secure**
- Set up VPN connection between your cloud app and client's office network
- **Critical:** Ensure remote users are configured in the **same subnet** as office LAN (common mistake by IT vendors)
- Your app connects via VPN tunnel to local Tally instance
- **Pros:** Secure, full control
- **Cons:** VPN setup required per client

**b) Tally.NET Remote Access**
- ✅ **Official Solution**
- Built-in TallyPrime feature for remote access
- Requires active Tally.NET subscription
- **Pros:** Official, supported by Tally
- **Cons:** Additional subscription cost

**c) Port Forwarding**
- ⚠️ **Not Recommended**
- Configure router to forward port 9000 to Tally machine
- **Pros:** Simple setup
- **Cons:**
  - **Security risk** (no authentication on Tally HTTP server)
  - Bandwidth limitations
  - Exposes Tally to internet

**d) Tally Browser Access**
- TallyPrime has built-in browser access for viewing reports
- Available since Tally ERP 9 Release 6.6
- Can view reports from mobile, iPad, Mac via web browser
- **Limitation:** Read-only for reports, not suitable for data import

#### **Recommended Architecture for Bale:**

```
┌──────────────────────┐
│   Bale (Cloud)       │
└──────────┬───────────┘
           │
           │ HTTPS
           ↓
┌──────────────────────┐
│   Middleware/Proxy   │  ← Your server in client's network
│   (Optional)         │     or VPN endpoint
└──────────┬───────────┘
           │
           │ HTTP (LAN)
           ↓
┌──────────────────────┐
│  Client's Tally      │
│  (Port 9000)         │
└──────────────────────┘
```

**Best Practice:** Use VPN for secure remote access, or deploy a lightweight middleware in client's network that communicates with Tally locally and exposes authenticated API to your cloud app.

---

### **Q2: When we pass ledgers and vouchers to Tally, do we have to create tally_guid or does it come from Tally and we store it?**

**Answer:** **Tally automatically generates GUIDs** - you do NOT create them.

#### **How It Works:**

**For New Records (Import):**
1. You send voucher/ledger data **without** GUID/MASTERID in your JSON/XML
2. TallyPrime creates the record and generates:
   - `GUID` - Globally Unique Identifier
   - `MASTERID` - Internal sequential ID
3. Tally's response includes these IDs
4. You **store these IDs in your database** for future reference

**Example Response After Import:**
```xml
<ENVELOPE>
  <HEADER>
    <STATUS>1</STATUS>
  </HEADER>
  <BODY>
    <DATA>
      <IMPORTRESULT>
        <CREATED>1</CREATED>
        <ALTERED>0</ALTERED>
        <LASTVCHID>119</LASTVCHID>  <!-- This is the MASTERID -->
      </IMPORTRESULT>
    </DATA>
  </BODY>
</ENVELOPE>
```

**For Updates (Alteration):**
- Include the stored GUID/MASTERID in your request
- Tally will update the existing record instead of creating new one
- Or use `ALTERID` attribute to specify which record to alter

#### **Identification Methods:**

Tally identifies records using:
1. **GUID** - Unique across all companies (best for sync)
2. **MASTERID** - Sequential number within company
3. **Natural Keys** - For vouchers: `VOUCHERNUMBER` + `VOUCHERTYPENAME` + `DATE`
4. **ALTERID** - Special tag to force alteration of existing record

#### **Recommended Approach for Bale:**

```typescript
// In your database
interface TallyExport {
  entity_id: string;           // Your invoice/payment ID
  tally_masterid: string | null;  // Store after first export
  tally_guid: string | null;      // Store after first export
  export_status: 'pending' | 'success' | 'failed';
}

// After successful export
async function handleTallyResponse(response: TallyResponse, entityId: string) {
  if (response.status === "1") {
    await db.tally_exports.update({
      where: { entity_id: entityId },
      data: {
        tally_masterid: response.result.LASTVCHID,
        tally_guid: response.result.GUID, // If returned
        export_status: 'success',
        exported_at: new Date()
      }
    });
  }
}
```

**Important Notes:**
- ⚠️ **Do NOT manually create GUIDs** - Tally owns this
- ✅ **Store returned IDs** for future updates/sync
- ✅ **Use REMOTEID** if you want to map your UUIDs to Tally records (advanced feature)

#### **REMOTEID (Advanced):**

From your ACCOUNTING_REQUIREMENTS.md:
- You can use **Bale UUIDs mapped to Tally REMOTEID**
- This allows idempotent exports using your own IDs
- Requires TDL customization to support REMOTEID field

---

### **Q3: Is there an npm package/library which makes it easy to form Tally-compatible JSON/XML?**

**Answer:** **No mature, production-ready npm package exists** for TallyPrime integration as of 2025.

#### **What's Available:**

**1. @pipedream/tally (v0.0.7)**
- Last published 2 years ago
- For Pipedream workflow automation
- **Not for direct Tally accounting software integration**
- This is for Tally.so (form builder), not TallyPrime

**2. tally (v0.0.1-53)**
- Published 13 years ago
- Template engine for Node.js (unrelated to accounting)

**3. Third-Party Services (Not NPM):**
- API2Books - Provides REST API wrapper (paid service)
- Not an npm package, requires subscription

#### **Why No Library?**

1. **Niche Market:** TallyPrime is India-specific
2. **Diverse Requirements:** Each business has unique chart of accounts
3. **Complex Mapping:** Ledger structures vary by company
4. **XML/JSON Complexity:** Tally's format is proprietary and verbose

#### **Recommended Approach: Build Your Own (TypeScript)**

**Advantages:**
- ✅ Full control over mapping logic
- ✅ Type-safe with TypeScript
- ✅ Tailored to your Bale schema
- ✅ Easy to maintain and debug
- ✅ No external dependencies to break

**Implementation Pattern:**

```typescript
// src/lib/tally/builders/voucher-builder.ts
export class TallyVoucherBuilder {
  private voucher: TallyVoucher;

  constructor(voucherType: string) {
    this.voucher = {
      VOUCHER: {
        DATE: "",
        VOUCHERNUMBER: "",
        VOUCHERTYPENAME: voucherType,
        "ALLLEDGERENTRIES.LIST": []
      }
    };
  }

  setDate(date: Date): this {
    this.voucher.VOUCHER.DATE = formatTallyDate(date);
    return this;
  }

  setVoucherNumber(num: string): this {
    this.voucher.VOUCHER.VOUCHERNUMBER = num;
    return this;
  }

  addLedgerEntry(
    ledgerName: string,
    amount: number,
    isDeemedPositive: boolean
  ): this {
    this.voucher.VOUCHER["ALLLEDGERENTRIES.LIST"].push({
      LEDGERNAME: ledgerName,
      ISDEEMEDPOSITIVE: isDeemedPositive ? "Yes" : "No",
      AMOUNT: amount.toFixed(2)
    });
    return this;
  }

  addBillAllocation(
    ledgerName: string,
    billName: string,
    amount: number
  ): this {
    const entry: TallyLedgerEntry = {
      LEDGERNAME: ledgerName,
      ISDEEMEDPOSITIVE: "Yes",
      AMOUNT: amount.toFixed(2),
      "BILLALLOCATIONS.LIST": {
        NAME: billName,
        BILLTYPE: "New Ref",
        AMOUNT: amount.toFixed(2)
      }
    };
    this.voucher.VOUCHER["ALLLEDGERENTRIES.LIST"].push(entry);
    return this;
  }

  build(): TallyVoucher {
    return this.voucher;
  }
}

// Usage
const voucher = new TallyVoucherBuilder("Sales")
  .setDate(new Date("2024-04-01"))
  .setVoucherNumber("INV/2024-25/0001")
  .addLedgerEntry("Sales", -50000, false)
  .addBillAllocation("Acme Textiles", "INV/2024-25/0001", 59000)
  .build();
```

**Or Use Template Functions:**

```typescript
// src/lib/tally/templates/invoice-template.ts
export function buildSalesVoucher(invoice: Invoice): TallyVoucher {
  const ledgerEntries: TallyLedgerEntry[] = [];

  // Party ledger with bill allocation
  ledgerEntries.push({
    LEDGERNAME: invoice.party_ledger_snapshot.name,
    ISDEEMEDPOSITIVE: "Yes",
    AMOUNT: invoice.total_amount.toFixed(2),
    "BILLALLOCATIONS.LIST": {
      NAME: invoice.invoice_number,
      BILLTYPE: "New Ref",
      AMOUNT: invoice.total_amount.toFixed(2)
    }
  });

  // Sales ledger
  ledgerEntries.push({
    LEDGERNAME: "Sales",
    ISDEEMEDPOSITIVE: "No",
    AMOUNT: (-invoice.taxable_amount).toFixed(2)
  });

  // GST ledgers
  if (invoice.gst_type === "GST") {
    ledgerEntries.push({
      LEDGERNAME: "CGST @ 9%",
      ISDEEMEDPOSITIVE: "No",
      AMOUNT: (-invoice.cgst_amount).toFixed(2)
    });
    ledgerEntries.push({
      LEDGERNAME: "SGST @ 9%",
      ISDEEMEDPOSITIVE: "No",
      AMOUNT: (-invoice.sgst_amount).toFixed(2)
    });
  }

  return {
    VOUCHER: {
      DATE: formatTallyDate(invoice.invoice_date),
      VOUCHERNUMBER: invoice.invoice_number,
      VOUCHERTYPENAME: "Sales",
      NARRATION: invoice.notes || "",
      PARTYLEDGERNAME: invoice.party_ledger_snapshot.name,
      "ALLLEDGERENTRIES.LIST": ledgerEntries
    }
  };
}
```

#### **Consider Creating a Package Later:**

Once your integration is stable, you could:
1. Extract generic Tally utilities
2. Publish as `@bale/tally-integration` or `tally-prime-ts`
3. Help the community
4. Benefit from community contributions

**For Now:** Build it in your codebase using TypeScript. The types in TALLY_INTEGRATION.md give you a solid foundation.

---

### **Q4: How can I test my export functionality? Does Tally provide a developer version? Or can I use the free version?**

**Answer:** Yes! TallyPrime offers **multiple testing options** without purchasing a full license.

#### **Option 1: Educational Version (Best for Learning)** ⭐

**What:** Free version with minimal restrictions
**Access:** Download from TallyPrime website
**Duration:** Unlimited
**Features:**
- ✅ All features available
- ✅ Can create masters, vouchers
- ✅ **HTTP server enabled**
- ✅ **Import/Export functionality**
- ⚠️ **Restriction:** Can only enter transactions for **selected dates**
- ⚠️ Date limitation means you can't use continuously for production

**How to Use:**
1. Download TallyPrime from official website
2. Install without activation
3. After 7-day trial expires, automatically switches to Educational mode
4. Use for testing your integration

**Perfect for:**
- ✅ Testing JSON/XML export functionality
- ✅ Validating voucher structure
- ✅ Learning Tally's behavior
- ✅ Development and debugging

---

#### **Option 2: 7-Day Free Trial (Full Features)**

**What:** Full TallyPrime with all features
**Duration:** 7 days from activation
**Features:**
- ✅ **All features unlocked**
- ✅ No restrictions
- ✅ Production-grade testing

**How to Use:**
1. Download TallyPrime
2. Activate with email
3. Test for 7 days
4. After expiry, converts to Educational mode

**Perfect for:**
- ✅ Final testing before production
- ✅ Client demos
- ✅ Performance testing with large datasets

---

#### **Option 3: TallyPrime Developer (For Advanced Users)**

**What:** Special developer version for TDL development
**Duration:** 90-day evaluation
**Features:**
- ✅ All TallyPrime features
- ✅ TDL development capabilities
- ✅ Can test custom integrations
- ⚠️ **Cannot check version compatibility**

**Perfect for:**
- ✅ If you plan to write custom TDL code
- ✅ Advanced plugin development
- ❌ Overkill for simple HTTP JSON integration

**How to Get:**
- Visit [TallyPrime Developer Download](https://help.tallysolutions.com/developer-reference/installation-and-licensing-tally-prime-developer/how-to-start-tallyprime-developer-download-install-and-activate/)

---

#### **Recommended Testing Strategy:**

```
Phase 1: Initial Development (Weeks 1-4)
├─ Use Educational Version
├─ Test basic ledger/voucher creation
├─ Validate JSON structure
└─ Debug integration logic

Phase 2: Integration Testing (Weeks 5-6)
├─ Activate 7-Day Trial
├─ Test with realistic data volumes
├─ Test all voucher types
└─ Performance testing

Phase 3: Pre-Production (Week 7)
├─ Test with actual client data (anonymized)
├─ Validate accounting equation
└─ Error handling scenarios

Phase 4: Production
├─ Client uses their own TallyPrime license
└─ Monitor and support
```

#### **Testing Checklist:**

**Setup:**
- [ ] Install TallyPrime Educational version
- [ ] Enable HTTP server (Gateway → F12 → HTTP)
- [ ] Create test company
- [ ] Verify port 9000 is accessible

**Basic Tests:**
- [ ] Import single ledger via JSON POST
- [ ] Import sales voucher
- [ ] Verify voucher in Tally Day Book
- [ ] Check accounting entries are correct
- [ ] Test GUID retrieval from response

**Edge Cases:**
- [ ] Zero-amount vouchers
- [ ] Multi-line invoices (10+ items)
- [ ] GST calculations (CGST+SGST vs IGST)
- [ ] Negative roundoff amounts
- [ ] Special characters in names
- [ ] Unicode/multilingual data

**Error Scenarios:**
- [ ] Missing required fields
- [ ] Invalid date format
- [ ] Non-existent ledger reference
- [ ] Unbalanced voucher (Dr ≠ Cr)
- [ ] Duplicate voucher number

**Performance:**
- [ ] Batch import (50+ vouchers)
- [ ] Large inventory entries (100+ items)
- [ ] Response time measurement

---

### **Q5: Is it possible to export vouchers in a certain format like XML/JSON/CSV and upload it to Tally for import? What are the specifications?**

**Answer:** **Yes!** TallyPrime supports **file-based offline import** for JSON and XML (not CSV for vouchers).

#### **Supported Formats:**

| Format | Masters | Vouchers | Notes |
|--------|---------|----------|-------|
| **JSON** | ✅ Yes | ✅ Yes | Since TallyPrime 7.0 |
| **XML** | ✅ Yes | ✅ Yes | Since Tally ERP 9 4.0 |
| **Excel** | ✅ Yes | ⚠️ Limited | Not for complex vouchers |
| **CSV** | ❌ No | ❌ No | Not officially supported |

---

#### **File-Based Import Process:**

**Step 1: Generate File**

Your Bale app generates JSON/XML files:

```typescript
// src/lib/tally/file-export.ts
export async function generateTallyImportFile(
  invoices: Invoice[],
  format: 'json' | 'xml' = 'json'
): Promise<string> {
  const vouchers = invoices.map(inv => buildSalesVoucher(inv));

  const tallyMessage = {
    ENVELOPE: {
      HEADER: {
        VERSION: "1",
        TALLYREQUEST: "Import",
        TYPE: "Data",
        ID: "Vouchers"
      },
      BODY: {
        DATA: {
          TALLYMESSAGE: vouchers
        }
      }
    }
  };

  if (format === 'json') {
    return JSON.stringify(tallyMessage, null, 2);
  } else {
    return convertToXML(tallyMessage); // Use xml2js or similar
  }
}
```

**Step 2: Save File**

```typescript
// Generate file for download
const fileContent = await generateTallyImportFile(invoices, 'json');
const blob = new Blob([fileContent], { type: 'application/json' });
const fileName = `tally-import-${Date.now()}.json`;

// Trigger download
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = fileName;
link.click();
```

**Step 3: User Imports in TallyPrime**

Client manually imports the file:
1. Open TallyPrime
2. Press **Alt+O** (Import)
3. Select **Transactions** (or **Masters**)
4. Browse and select your JSON/XML file
5. Press **Enter** to import
6. Review import results

---

#### **File Structure Specifications:**

**JSON Format (Recommended):**

```json
{
  "ENVELOPE": {
    "HEADER": {
      "VERSION": "1",
      "TALLYREQUEST": "Import",
      "TYPE": "Data",
      "ID": "Vouchers"
    },
    "BODY": {
      "DESC": {
        "STATICVARIABLES": {
          "SVCURRENTCOMPANY": "Your Company Name"
        }
      },
      "DATA": {
        "TALLYMESSAGE": [
          {
            "VOUCHER": {
              "DATE": "20240401",
              "VOUCHERNUMBER": "INV/2024-25/0001",
              "VOUCHERTYPENAME": "Sales",
              "NARRATION": "Sales invoice",
              "ALLLEDGERENTRIES.LIST": [
                {
                  "LEDGERNAME": "Customer Name",
                  "ISDEEMEDPOSITIVE": "Yes",
                  "AMOUNT": "59000"
                },
                {
                  "LEDGERNAME": "Sales",
                  "ISDEEMEDPOSITIVE": "No",
                  "AMOUNT": "-59000"
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```

**XML Format (Alternative):**

```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DATA>
      <TALLYMESSAGE>
        <VOUCHER>
          <DATE>20240401</DATE>
          <VOUCHERNUMBER>INV/2024-25/0001</VOUCHERNUMBER>
          <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>Customer Name</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>59000</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
```

---

#### **Key Specifications:**

**1. File Encoding:**
- **JSON:** UTF-8 (default) or UTF-16
- **XML:** UTF-8 (default) or UTF-16
- For multilingual data, specify encoding in header

**2. Currency Symbols:**
| Currency | XML Entity | JSON Entity |
|----------|-----------|-------------|
| ₹ (INR) | `&#8377;` | `\u20b9` |
| $ (USD) | `&#36;` | `\u0024` |
| AED | `&#8387;` | `\u20c3` |

**3. Date Format:**
- **Always:** YYYYMMDD (e.g., `20240401` for April 1, 2024)
- No separators, no other formats accepted

**4. Amount Format:**
- Decimal with 2 places: `"50000.00"`
- Negative for credits: `"-50000.00"`
- Positive for debits: `"50000.00"`

**5. Duplicate Handling:**
```json
{
  "DESC": {
    "STATICVARIABLES": {
      "IMPORTDUPS": "@@DUPCOMBINE"  // Or @@DUPIGNORE, @@DUPSKIP
    }
  }
}
```

---

#### **Advantages of File-Based Import:**

**Pros:**
- ✅ **No network required** (offline mode)
- ✅ **Batch processing** (import 1000s of vouchers at once)
- ✅ **Audit trail** (files can be archived)
- ✅ **User control** (client reviews before import)
- ✅ **No port forwarding/VPN needed**
- ✅ **Works with Educational version**

**Cons:**
- ❌ **Manual step** (user must import file)
- ❌ **No immediate feedback** to your app
- ❌ **No real-time sync**
- ❌ **User error potential** (wrong file, wrong company)

---

#### **Hybrid Approach (Best of Both Worlds):**

```typescript
// Offer both methods in your app

interface ExportOptions {
  method: 'http' | 'file';
  format?: 'json' | 'xml';
}

export async function exportToTally(
  invoices: Invoice[],
  options: ExportOptions
) {
  if (options.method === 'http') {
    // Direct HTTP integration
    return await sendHTTPToTally(invoices);
  } else {
    // Generate file for download
    const file = await generateTallyImportFile(
      invoices,
      options.format || 'json'
    );
    downloadFile(file, `tally-import-${Date.now()}.json`);
  }
}
```

**UI in Bale:**
```
[ Export to Tally ]
  ○ Direct sync (requires Tally connection)
  ○ Download file for manual import

  Format: [JSON ▼] [XML]

  [Export Now]
```

---

#### **Best Practice for Your SaaS:**

**Phase 1 (MVP):**
- Start with **file-based export** (simpler, no network setup)
- Users download JSON file from Bale
- Users import manually in TallyPrime
- Works for monthly/weekly exports

**Phase 2 (Advanced):**
- Add **HTTP direct integration** option
- For users who want automation
- Requires VPN/network setup
- Real-time sync capability

**Long-term:**
- Offer both methods
- File-based for occasional users
- HTTP for power users wanting automation

---

## 10. Ensuring Idempotency in File-Based Imports

### **The Problem:**

When users export from Bale and import into Tally multiple times:

```
User exports invoices → Gets JSON file → Imports to Tally
                                       ↓
                          Tally generates GUID/MASTERID
                                       ↓
User re-imports same file → Creates DUPLICATES ❌
```

**Challenge:** Tally generates GUIDs, but asking users to manually copy them back to Bale is not user-friendly.

---

### **Solution 1: Use Bale Invoice Number as Tally Voucher Number** ⭐ **RECOMMENDED**

**How it works:**
- Tally identifies vouchers by **natural key**: `VOUCHERNUMBER + VOUCHERTYPENAME + DATE`
- Use your Bale invoice number (e.g., `INV/2024-25/0001`) as Tally's voucher number
- Enable "Prevent Duplicates" in Tally voucher type settings
- On re-import, Tally detects duplicate and skips/combines

**Implementation:**

```typescript
// src/lib/tally/mappers/invoice-mapper.ts

export function mapInvoiceToTallyVoucher(invoice: Invoice): TallyVoucher {
  return {
    VOUCHER: {
      // Use Bale's invoice number - this is your idempotency key!
      VOUCHERNUMBER: invoice.invoice_number, // "INV/2024-25/0001"

      VOUCHERTYPENAME: invoice.invoice_type === 'sales' ? 'Sales' : 'Purchase',

      // Date is part of natural key
      DATE: formatTallyDate(invoice.invoice_date),

      NARRATION: invoice.notes || "",

      "ALLLEDGERENTRIES.LIST": buildLedgerEntries(invoice)
    }
  };
}
```

**In JSON file, add duplicate handling:**

```json
{
  "ENVELOPE": {
    "HEADER": {
      "VERSION": "1",
      "TALLYREQUEST": "Import",
      "TYPE": "Data",
      "ID": "Vouchers"
    },
    "BODY": {
      "DESC": {
        "STATICVARIABLES": {
          "SVCURRENTCOMPANY": "Company Name",
          "IMPORTDUPS": "@@DUPIGNORE"  // Skip duplicates on re-import
        }
      },
      "DATA": {
        "TALLYMESSAGE": [ /* vouchers */ ]
      }
    }
  }
}
```

**IMPORTDUPS Options:**

| Option | Behavior | Use Case |
|--------|----------|----------|
| `@@DUPIGNORE` | Skip duplicates | Safe for re-imports |
| `@@DUPCOMBINE` | Merge/update existing | Update amounts if changed |
| `@@DUPSKIP` | Skip and log error | Strict duplicate prevention |

**Tally Setup (One-time):**

User must configure voucher type in Tally:
1. Gateway → F11 (Features) → F3 (Company Features)
2. Accounting Features → Voucher Types → Alter "Sales"
3. Set "Use Manual Voucher Numbering" to **Yes**
4. Set "Prevent Duplicates" to **Yes**

**Pros:**
- ✅ **Simple and reliable**
- ✅ **No GUID tracking needed**
- ✅ **User-friendly** (re-import is safe)
- ✅ **Works with file-based import**
- ✅ **Natural key approach**

**Cons:**
- ⚠️ Requires one-time Tally setup
- ⚠️ Voucher number must be unique per type

---

### **Solution 2: Store Bale UUID in Tally UDF (User Defined Field)**

**How it works:**
- Create a UDF (User Defined Field) in Tally vouchers called "Bale_Invoice_ID"
- Store your Bale invoice UUID in this field
- On import, Tally can use UDF to detect duplicates (requires TDL customization)

**Implementation:**

**Step 1: Create UDF in Tally (One-time setup via TDL)**

```tdl
[#Company: ##SVCurrentCompany]
    Use: UDF
    Add: UDF : Bale_Invoice_ID: String: Voucher
```

Or via XML:

```xml
<COMPANY NAME="Your Company">
  <UDF>
    <NAME>Bale_Invoice_ID</NAME>
    <TYPE>String</TYPE>
    <ISLIST>No</ISLIST>
    <UNIQUE>Yes</UNIQUE>  <!-- Enforce uniqueness -->
  </UDF>
</COMPANY>
```

**Step 2: Include UDF in voucher export:**

```typescript
export function mapInvoiceToTallyVoucher(invoice: Invoice): TallyVoucher {
  return {
    VOUCHER: {
      VOUCHERNUMBER: invoice.invoice_number,
      VOUCHERTYPENAME: "Sales",
      DATE: formatTallyDate(invoice.invoice_date),

      // Add UDF with Bale's UUID
      "UDF:Bale_Invoice_ID": invoice.id, // Your UUID

      "ALLLEDGERENTRIES.LIST": buildLedgerEntries(invoice)
    }
  };
}
```

**JSON structure:**

```json
{
  "VOUCHER": {
    "DATE": "20240401",
    "VOUCHERNUMBER": "INV/2024-25/0001",
    "VOUCHERTYPENAME": "Sales",
    "UDF:Bale_Invoice_ID": "550e8400-e29b-41d4-a716-446655440000",
    "ALLLEDGERENTRIES.LIST": [ /* ... */ ]
  }
}
```

**Pros:**
- ✅ **Stores your UUID in Tally**
- ✅ **Can enforce uniqueness** (UDF Unique attribute)
- ✅ **Bidirectional reference** (Tally → Bale)
- ✅ **No dependency on voucher number**

**Cons:**
- ⚠️ Requires TDL customization for UDF creation
- ⚠️ Requires UDF setup in every client's Tally
- ⚠️ More complex than natural key approach

---

### **Solution 3: Track Export State in Bale (Status-Based)**

**How it works:**
- Track export status in Bale database
- Only export invoices that are not yet exported
- Provide "Re-export" option only for failed exports

**Implementation:**

```typescript
// src/lib/tally/export-service.ts

export async function exportInvoicesToTally(
  companyId: string,
  invoiceIds: string[]
): Promise<TallyExportResult> {

  // Only fetch invoices that are NOT already exported
  const invoices = await db.invoices.findMany({
    where: {
      id: { in: invoiceIds },
      company_id: companyId,
      OR: [
        { tally_export_status: null },
        { tally_export_status: 'pending' },
        { tally_export_status: 'failed' }
      ]
    }
  });

  // Generate JSON file
  const fileContent = generateTallyJSON(invoices);

  // Mark as exported (pending)
  await db.invoices.updateMany({
    where: { id: { in: invoiceIds } },
    data: {
      tally_export_status: 'exported',
      tally_exported_at: new Date(),
      tally_export_file: fileName
    }
  });

  return {
    fileName,
    fileContent,
    invoiceCount: invoices.length
  };
}
```

**Database tracking:**

```sql
-- Add to invoices table
ALTER TABLE invoices ADD COLUMN tally_export_status TEXT;
ALTER TABLE invoices ADD COLUMN tally_exported_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN tally_export_file TEXT;

-- Possible statuses: 'pending', 'exported', 'failed'
```

**UI in Bale:**

```tsx
// Invoice list page
{invoice.tally_export_status === 'exported' ? (
  <Badge variant="success">
    Exported to Tally ✓
  </Badge>
) : (
  <Button onClick={() => exportToTally(invoice.id)}>
    Export to Tally
  </Button>
)}

// Bulk export
<Button onClick={exportSelected}>
  Export {selectedCount} new invoices to Tally
</Button>
```

**Pros:**
- ✅ **Prevents accidental re-exports**
- ✅ **Clear audit trail**
- ✅ **User-friendly UI**
- ✅ **No Tally configuration needed**

**Cons:**
- ⚠️ Doesn't prevent manual re-import of downloaded file
- ⚠️ Requires user to track which file was imported

---

### **Solution 4: Combination Approach (Best of All Worlds)** 🎯

**Recommended for production:**

```typescript
// src/lib/tally/export-service.ts

export async function exportInvoicesToTally(
  companyId: string,
  options: ExportOptions
): Promise<TallyExportResult> {

  // 1. Filter: Only not-yet-exported invoices
  const invoices = await getExportableInvoices(companyId);

  // 2. Map: Use Bale invoice number as Tally voucher number
  const vouchers = invoices.map(inv => ({
    VOUCHER: {
      VOUCHERNUMBER: inv.invoice_number, // Natural key
      DATE: formatTallyDate(inv.invoice_date),
      VOUCHERTYPENAME: getTallyVoucherType(inv.invoice_type),

      // 3. Optional: Add UDF with Bale UUID (if client has UDF setup)
      ...(options.includeUDF && {
        "UDF:Bale_Invoice_ID": inv.id
      }),

      "ALLLEDGERENTRIES.LIST": buildLedgerEntries(inv)
    }
  }));

  // 4. Generate file with duplicate handling
  const fileContent = {
    ENVELOPE: {
      HEADER: {
        VERSION: "1",
        TALLYREQUEST: "Import",
        TYPE: "Data",
        ID: "Vouchers"
      },
      BODY: {
        DESC: {
          STATICVARIABLES: {
            SVCURRENTCOMPANY: options.tallyCompanyName,
            IMPORTDUPS: "@@DUPIGNORE" // Skip duplicates
          }
        },
        DATA: {
          TALLYMESSAGE: vouchers
        }
      }
    }
  };

  // 5. Track export in database
  await trackExport(invoices, fileContent);

  return {
    fileName: `tally-export-${Date.now()}.json`,
    fileContent: JSON.stringify(fileContent, null, 2),
    invoiceCount: invoices.length
  };
}
```

**Implementation Layers:**

```
Layer 1: Database Status Tracking
├─ Only export new/failed invoices
├─ Track export timestamp
└─ Prevent accidental bulk re-exports

Layer 2: Natural Key (Voucher Number)
├─ Use Bale invoice number as Tally voucher number
├─ Tally's built-in duplicate detection
└─ IMPORTDUPS: @@DUPIGNORE

Layer 3: Optional UDF (Advanced)
├─ Store Bale UUID in Tally
├─ Bidirectional reference
└─ Advanced sync scenarios

Layer 4: User Communication
├─ Clear UI showing export status
├─ Warning on re-export attempt
└─ Export log/history
```

---

### **Solution 5: HTTP Integration with Response Tracking** (Future)

For HTTP-based integration (not file-based), you can track Tally's response:

```typescript
export async function exportViaHTTP(invoice: Invoice, config: TallyConfig) {
  const voucher = mapInvoiceToTallyVoucher(invoice);

  const response = await fetch(`http://${config.tally_host}:9000`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildTallyRequest(voucher))
  });

  const result: TallyResponse = await response.json();

  if (result.status === "1") {
    // Store Tally's IDs for future updates
    await db.invoices.update({
      where: { id: invoice.id },
      data: {
        tally_masterid: result.result.LASTVCHID,
        tally_guid: result.result.GUID,
        tally_export_status: 'success'
      }
    });
  }

  return result;
}

// For re-export (update existing voucher)
export async function updateVoucherInTally(invoice: Invoice) {
  const voucher = mapInvoiceToTallyVoucher(invoice);

  // Use ACTION="Alter" with stored MASTERID
  const alterVoucher = {
    VOUCHER: {
      ...voucher.VOUCHER,
      ACTION: "Alter",
      TAGNAME: "MASTER ID",
      TAGVALUE: invoice.tally_masterid // Previously stored
    }
  };

  // Send update request
  return await sendToTally(alterVoucher);
}
```

---

### **Comparison Matrix:**

| Solution | Complexity | User Setup Required | Idempotency | Best For |
|----------|------------|-------------------|-------------|----------|
| **Natural Key (Invoice #)** | ⭐ Low | Voucher numbering config | ✅✅✅ Strong | **File-based import** |
| **UDF (Store UUID)** | ⭐⭐⭐ High | TDL customization | ✅✅✅ Strong | Advanced users |
| **Status Tracking** | ⭐⭐ Medium | None | ✅✅ Moderate | All scenarios |
| **Combination** | ⭐⭐ Medium | Voucher numbering config | ✅✅✅ Strongest | **Production** |
| **HTTP with Response** | ⭐⭐⭐ High | Network/VPN setup | ✅✅✅ Perfect | HTTP integration |

---

### **Recommended Implementation Plan:**

**Phase 1 (MVP):**
1. ✅ Use Bale invoice number as Tally voucher number
2. ✅ Add `IMPORTDUPS: "@@DUPIGNORE"` to JSON export
3. ✅ Track export status in Bale database
4. ✅ Provide clear UI showing exported vs. pending invoices

**Phase 2 (Enhancement):**
1. ✅ Add export history/log (when, which file, how many invoices)
2. ✅ Warning dialog if user tries to export already-exported invoices
3. ✅ "Force re-export" option for failed/modified invoices

**Phase 3 (Advanced):**
1. ✅ Optional UDF support for clients who want bidirectional sync
2. ✅ HTTP integration for automatic sync
3. ✅ Incremental updates using stored MASTERID

---

### **Code Example: Complete Idempotent Export**

```typescript
// src/lib/tally/idempotent-export.ts

interface ExportConfig {
  companyId: string;
  invoiceIds: string[];
  forceReExport?: boolean;
}

export async function exportInvoicesIdempotent(
  config: ExportConfig
): Promise<ExportResult> {

  // Step 1: Fetch invoices with export status check
  const invoices = await db.invoices.findMany({
    where: {
      id: { in: config.invoiceIds },
      company_id: config.companyId,
      ...(config.forceReExport ? {} : {
        OR: [
          { tally_export_status: null },
          { tally_export_status: 'failed' }
        ]
      })
    }
  });

  if (invoices.length === 0) {
    return {
      success: false,
      message: "All selected invoices are already exported. Use 'Force Re-export' to export again.",
      skippedCount: config.invoiceIds.length
    };
  }

  // Step 2: Generate idempotent JSON
  const tallyData = {
    ENVELOPE: {
      HEADER: {
        VERSION: "1",
        TALLYREQUEST: "Import",
        TYPE: "Data",
        ID: "Vouchers"
      },
      BODY: {
        DESC: {
          STATICVARIABLES: {
            IMPORTDUPS: "@@DUPIGNORE" // Idempotency key!
          }
        },
        DATA: {
          TALLYMESSAGE: invoices.map(inv => ({
            VOUCHER: {
              // Natural key for idempotency
              VOUCHERNUMBER: inv.invoice_number,
              VOUCHERTYPENAME: inv.invoice_type === 'sales' ? 'Sales' : 'Purchase',
              DATE: formatTallyDate(inv.invoice_date),

              NARRATION: inv.notes || `Exported from Bale on ${new Date().toLocaleDateString()}`,

              "ALLLEDGERENTRIES.LIST": buildLedgerEntries(inv)
            }
          }))
        }
      }
    }
  };

  // Step 3: Create export record
  const exportRecord = await db.tallyExports.create({
    data: {
      company_id: config.companyId,
      export_type: 'invoices',
      file_name: `tally-export-${Date.now()}.json`,
      invoice_count: invoices.length,
      export_status: 'pending',
      exported_at: new Date()
    }
  });

  // Step 4: Update invoice statuses
  await db.invoices.updateMany({
    where: { id: { in: invoices.map(i => i.id) } },
    data: {
      tally_export_status: 'exported',
      tally_exported_at: new Date(),
      tally_export_id: exportRecord.id
    }
  });

  return {
    success: true,
    fileName: exportRecord.file_name,
    fileContent: JSON.stringify(tallyData, null, 2),
    exportedCount: invoices.length,
    exportId: exportRecord.id
  };
}
```

---

### **Summary:**

**For file-based import (your current approach):**
1. ✅ **Use Bale invoice number as Tally voucher number** (natural key)
2. ✅ **Set `IMPORTDUPS: "@@DUPIGNORE"`** in JSON
3. ✅ **Track export status in Bale** (prevent accidental re-exports)
4. ✅ **Instruct users to enable "Prevent Duplicates"** in Tally (one-time setup)

**Result:** Users can safely re-import the same file without creating duplicates, and no manual GUID tracking is needed! 🎉

---

## 11. HTTP JSON Integration - Detailed Architecture & Flow

### **Overview:**

HTTP JSON integration enables **real-time, automated synchronization** between Bale (cloud) and client's TallyPrime (on-premise) without manual file downloads/uploads.

---

### **A. Basic HTTP Flow (Local Network)**

**Simplest scenario: Bale user and TallyPrime on same network**

```
┌─────────────────────────────────┐
│   User's Browser                │
│   (Bale Web App)                │
│   192.168.1.100                 │
└────────────┬────────────────────┘
             │
             │ 1. User clicks "Export to Tally"
             │
             ↓
┌─────────────────────────────────┐
│   Bale Backend API              │
│   (Next.js API Route)           │
│   Same LAN                      │
└────────────┬────────────────────┘
             │
             │ 2. HTTP POST (JSON)
             │    http://192.168.1.50:9000
             │    Content-Type: application/json
             │
             ↓
┌─────────────────────────────────┐
│   TallyPrime HTTP Server        │
│   192.168.1.50:9000             │
│   (Running on office PC)        │
└────────────┬────────────────────┘
             │
             │ 3. Processes voucher
             │
             ↓
┌─────────────────────────────────┐
│   Tally Response (JSON)         │
│   { status: "1",                │
│     result: { CREATED: 1 } }    │
└────────────┬────────────────────┘
             │
             │ 4. Returns result
             │
             ↓
┌─────────────────────────────────┐
│   Bale Updates Database         │
│   - tally_export_status: success│
│   - tally_masterid: 12345       │
└─────────────────────────────────┘
```

**Request Example:**

```http
POST http://192.168.1.50:9000 HTTP/1.1
Content-Type: application/json
Host: 192.168.1.50:9000

{
  "headers": {
    "content-type": "application/json",
    "version": "1",
    "tallyrequest": "Import",
    "type": "Data",
    "id": "Vouchers"
  },
  "body": {
    "static_variables": {
      "svExportFormat": "$$SysName:JSONEx",
      "svCurrentCompany": "Acme Textiles Pvt Ltd"
    },
    "tallymessage": [
      {
        "VOUCHER": {
          "DATE": "20240401",
          "VOUCHERNUMBER": "INV/2024-25/0001",
          "VOUCHERTYPENAME": "Sales",
          "ALLLEDGERENTRIES.LIST": [
            {
              "LEDGERNAME": "Customer ABC",
              "ISDEEMEDPOSITIVE": "Yes",
              "AMOUNT": "59000"
            },
            {
              "LEDGERNAME": "Sales",
              "ISDEEMEDPOSITIVE": "No",
              "AMOUNT": "-59000"
            }
          ]
        }
      }
    ]
  }
}
```

**Response Example:**

```json
{
  "status": "1",
  "cmp_info": {
    "name": "Acme Textiles Pvt Ltd",
    "guid": "{550E8400-E29B-41D4-A716-446655440000}"
  },
  "result": {
    "CREATED": 1,
    "ALTERED": 0,
    "ERRORS": 0,
    "LASTVCHID": "12345"
  }
}
```

---

### **B. Cloud-to-On-Premise Architecture (Production)**

**Challenge:** Bale is cloud-hosted, TallyPrime is on client's office network

```
┌─────────────────────────────────────────┐
│         Internet / Cloud                │
│                                         │
│  ┌───────────────────────────────┐     │
│  │   Bale SaaS (Vercel/AWS)      │     │
│  │   bale.app                    │     │
│  │   Next.js + API Routes        │     │
│  └───────────┬───────────────────┘     │
│              │                          │
└──────────────┼──────────────────────────┘
               │
               │ HTTPS (Encrypted)
               │
               ↓
┌──────────────────────────────────────────┐
│      Client's Office Network             │
│                                          │
│  ┌────────────────────────────────┐     │
│  │   VPN Gateway / Tunnel         │     │
│  │   - WireGuard / OpenVPN        │     │
│  │   - Or SSH Tunnel              │     │
│  │   - Or Cloudflare Tunnel       │     │
│  └───────────┬────────────────────┘     │
│              │                           │
│              │ Routes to internal IP     │
│              ↓                           │
│  ┌────────────────────────────────┐     │
│  │   Optional: Middleware/Proxy   │     │
│  │   192.168.1.200:3000           │     │
│  │   - Authentication layer       │     │
│  │   - Request logging            │     │
│  │   - Rate limiting              │     │
│  └───────────┬────────────────────┘     │
│              │                           │
│              │ HTTP (Local)              │
│              ↓                           │
│  ┌────────────────────────────────┐     │
│  │   TallyPrime HTTP Server       │     │
│  │   192.168.1.50:9000            │     │
│  │   (Office Desktop/Server)      │     │
│  └────────────────────────────────┘     │
│                                          │
└──────────────────────────────────────────┘
```

---

### **C. VPN Integration Methods**

#### **Option 1: Site-to-Site VPN** ⭐ **RECOMMENDED FOR ENTERPRISE**

**What it is:**
- Creates a secure tunnel between Bale's cloud infrastructure and client's office network
- Bale cloud servers can directly access client's internal network as if on same LAN

**Architecture:**

```
┌─────────────────────────────────┐
│   Bale Cloud VPC (AWS/GCP)      │
│   10.0.0.0/16                   │
│                                 │
│   ┌─────────────────────┐       │
│   │  Bale API Server    │       │
│   │  10.0.1.10          │       │
│   └──────────┬──────────┘       │
│              │                  │
│   ┌──────────▼──────────┐       │
│   │  VPN Client         │       │
│   │  (WireGuard)        │       │
│   └──────────┬──────────┘       │
└──────────────┼──────────────────┘
               │
               │ Encrypted Tunnel
               │ (Internet)
               ↓
┌──────────────────────────────────┐
│   Client's Office Network        │
│   192.168.1.0/24                 │
│                                  │
│   ┌──────────────────────┐       │
│   │  VPN Gateway/Router  │       │
│   │  192.168.1.1         │       │
│   └──────────┬───────────┘       │
│              │                   │
│   ┌──────────▼───────────┐       │
│   │  TallyPrime          │       │
│   │  192.168.1.50:9000   │       │
│   └──────────────────────┘       │
└──────────────────────────────────┘
```

**How it works:**

1. **Client sets up VPN gateway** (router/server) in their office
2. **Bale provisions VPN endpoint** in cloud (one per client)
3. **VPN tunnel established** between Bale cloud and client office
4. **Bale can directly call** `http://192.168.1.50:9000` through tunnel

**Configuration Example (WireGuard):**

**Client-Side (Office Router):**
```ini
# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <client-private-key>
Address = 10.100.0.2/32

[Peer]
PublicKey = <bale-server-public-key>
Endpoint = vpn.bale.app:51820
AllowedIPs = 10.0.0.0/16  # Bale's cloud network
PersistentKeepalive = 25
```

**Bale-Side (Cloud Server):**
```ini
# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <bale-private-key>
Address = 10.100.0.1/32
ListenPort = 51820

[Peer]
# Client: Acme Textiles
PublicKey = <client-public-key>
AllowedIPs = 192.168.1.0/24  # Client's office network
```

**Routing:**
```bash
# On Bale server: Route client's network through VPN
ip route add 192.168.1.0/24 via 10.100.0.2

# On client router: Route Bale requests to TallyPrime
iptables -t nat -A PREROUTING -s 10.100.0.0/16 -p tcp --dport 9000 -j DNAT --to-destination 192.168.1.50:9000
```

**Pros:**
- ✅ Seamless integration (direct IP access)
- ✅ Highly secure (encrypted tunnel)
- ✅ Low latency
- ✅ No port forwarding needed

**Cons:**
- ⚠️ Requires IT expertise on client side
- ⚠️ Infrastructure cost (VPN endpoints per client)
- ⚠️ Client firewall/network changes needed

---

#### **Option 2: Client-to-Site VPN (User VPN)** ⭐ **SIMPLE ALTERNATIVE**

**What it is:**
- Client installs VPN client software on the machine running TallyPrime
- That machine connects to Bale's VPN server
- Bale can access TallyPrime through VPN

**Architecture:**

```
┌─────────────────────────────────┐
│   Bale Cloud                    │
│                                 │
│   ┌─────────────────────┐       │
│   │  Bale API Server    │       │
│   │  10.0.1.10          │       │
│   └──────────┬──────────┘       │
│              │                  │
│   ┌──────────▼──────────┐       │
│   │  VPN Server         │       │
│   │  (Headscale/Tailscale)│     │
│   │  Assigns: 10.200.x.x │       │
│   └──────────┬──────────┘       │
└──────────────┼──────────────────┘
               │
               │ Internet
               │
               ↓
┌──────────────────────────────────┐
│   Client's Office                │
│                                  │
│   ┌──────────────────────┐       │
│   │  PC with TallyPrime  │       │
│   │  Local: 192.168.1.50 │       │
│   │  VPN: 10.200.5.10    │       │
│   │                      │       │
│   │  VPN Client running  │       │
│   └──────────────────────┘       │
└──────────────────────────────────┘
```

**Setup:**

1. **Client downloads VPN client** (Tailscale/WireGuard/OpenVPN)
2. **Client connects to Bale VPN server**
3. **TallyPrime machine gets VPN IP** (e.g., 10.200.5.10)
4. **Bale accesses TallyPrime** via VPN IP: `http://10.200.5.10:9000`

**Using Tailscale (Simplest):**

**Client Setup:**
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Login and connect
tailscale up

# Check assigned IP
tailscale ip -4
# Output: 100.64.5.10
```

**Bale Server:**
```typescript
// Store VPN IP in database
const tallyConfig = {
  company_id: "abc123",
  tally_vpn_ip: "100.64.5.10",  // Tailscale IP
  tally_port: 9000
};

// Connect via VPN
const response = await fetch(`http://100.64.5.10:9000`, {
  method: 'POST',
  body: JSON.stringify(tallyRequest)
});
```

**Pros:**
- ✅ Very simple setup (install client, click connect)
- ✅ No router/firewall configuration needed
- ✅ Secure (encrypted)
- ✅ Works from anywhere (even home office)

**Cons:**
- ⚠️ VPN client must always be running
- ⚠️ TallyPrime machine must be online
- ⚠️ Requires software installation

---

#### **Option 3: Cloudflare Tunnel (Zero Trust)** 🌟 **MODERN APPROACH**

**What it is:**
- Client runs Cloudflare `cloudflared` agent on TallyPrime machine
- Creates outbound tunnel to Cloudflare (no inbound ports needed)
- Bale accesses TallyPrime via Cloudflare's network

**Architecture:**

```
┌──────────────────────────────────┐
│   Bale Cloud                     │
│                                  │
│   ┌──────────────────────┐       │
│   │  Bale API Server     │       │
│   └──────────┬───────────┘       │
└──────────────┼──────────────────┘
               │
               │ HTTPS
               ↓
┌──────────────────────────────────┐
│   Cloudflare Network             │
│                                  │
│   tally-acme.your-domain.com     │
│   (Managed Tunnel)               │
└──────────────┬───────────────────┘
               │
               │ Encrypted Tunnel
               │ (Outbound only)
               ↓
┌──────────────────────────────────┐
│   Client's Office                │
│                                  │
│   ┌──────────────────────┐       │
│   │  cloudflared daemon  │       │
│   │  (Tunnel Agent)      │       │
│   └──────────┬───────────┘       │
│              │                   │
│              │ Local              │
│              ↓                   │
│   ┌──────────────────────┐       │
│   │  TallyPrime          │       │
│   │  localhost:9000      │       │
│   └──────────────────────┘       │
└──────────────────────────────────┘
```

**Setup:**

**Step 1: Client installs cloudflared**
```bash
# Linux/Mac
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Windows: Download from Cloudflare
```

**Step 2: Authenticate & Create Tunnel**
```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create acme-tally-tunnel

# Note the Tunnel ID: e.g., 550e8400-e29b-41d4-a716-446655440000
```

**Step 3: Configure Tunnel**
```yaml
# ~/.cloudflared/config.yml
tunnel: 550e8400-e29b-41d4-a716-446655440000
credentials-file: /home/user/.cloudflared/550e8400-e29b-41d4-a716-446655440000.json

ingress:
  - hostname: tally-acme.yourdomain.com
    service: http://localhost:9000
  - service: http_status:404
```

**Step 4: Route DNS**
```bash
cloudflared tunnel route dns acme-tally-tunnel tally-acme.yourdomain.com
```

**Step 5: Run Tunnel**
```bash
cloudflared tunnel run acme-tally-tunnel
```

**Step 6: Bale Accesses via HTTPS**
```typescript
// In Bale
const tallyConfig = {
  company_id: "abc123",
  tally_tunnel_url: "https://tally-acme.yourdomain.com"
};

// Make request
const response = await fetch(tallyConfig.tally_tunnel_url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'CF-Access-Client-Id': clientId,      // Optional auth
    'CF-Access-Client-Secret': clientSecret
  },
  body: JSON.stringify(tallyRequest)
});
```

**Pros:**
- ✅ No firewall changes needed
- ✅ No inbound ports (outbound only)
- ✅ Built-in DDoS protection
- ✅ HTTPS automatically (via Cloudflare)
- ✅ Can add authentication layer
- ✅ Works behind corporate firewalls

**Cons:**
- ⚠️ Requires Cloudflare account
- ⚠️ Additional service dependency
- ⚠️ Slightly higher latency (via Cloudflare network)

---

#### **Option 4: SSH Tunnel (Quick & Dirty)** 🔧 **TESTING/POC**

**What it is:**
- Client creates SSH tunnel from TallyPrime machine to Bale server
- Bale accesses TallyPrime via localhost forwarded port

**Setup:**

```bash
# On client's TallyPrime machine
ssh -R 9000:localhost:9000 user@bale-server.com

# This forwards:
# bale-server.com:9000 → client's localhost:9000
```

**Bale accesses:**
```typescript
// On Bale server
const response = await fetch('http://localhost:9000', {
  method: 'POST',
  body: JSON.stringify(tallyRequest)
});
```

**Pros:**
- ✅ Super quick to set up
- ✅ No additional software
- ✅ Secure (SSH encryption)

**Cons:**
- ❌ Not production-ready
- ❌ Manual connection (not persistent)
- ❌ Requires SSH access to Bale server
- ❌ Port conflicts if multiple clients

---

### **D. Complete HTTP Flow (Step-by-Step)**

**Scenario:** User clicks "Export to Tally" in Bale web app

#### **Step 1: Frontend Initiates Export**

```typescript
// src/app/(protected)/warehouse/[slug]/invoices/page.tsx

const handleExportToTally = async (invoiceIds: string[]) => {
  setExporting(true);

  try {
    const response = await fetch('/api/tally/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceIds })
    });

    const result = await response.json();

    if (result.success) {
      toast.success(`${result.exported} invoices exported to Tally`);
    } else {
      toast.error(result.error);
    }
  } catch (error) {
    toast.error('Failed to connect to Tally');
  } finally {
    setExporting(false);
  }
};
```

---

#### **Step 2: Next.js API Route Processes Request**

```typescript
// src/app/api/tally/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { exportInvoicesToTally } from '@/lib/tally/export-service';

export async function POST(request: NextRequest) {
  try {
    const { invoiceIds } = await request.json();

    // Get user's company and Tally config
    const session = await getServerSession();
    const companyId = session.user.companyId;

    const tallyConfig = await getTallyConfig(companyId);

    if (!tallyConfig.is_enabled) {
      return NextResponse.json(
        { error: 'Tally integration not configured' },
        { status: 400 }
      );
    }

    // Export invoices
    const result = await exportInvoicesToTally({
      companyId,
      invoiceIds,
      tallyConfig
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Tally export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
```

---

#### **Step 3: Export Service Builds & Sends Request**

```typescript
// src/lib/tally/export-service.ts

export async function exportInvoicesToTally(options: ExportOptions) {
  const { companyId, invoiceIds, tallyConfig } = options;

  // 1. Fetch invoices from database
  const invoices = await db.invoices.findMany({
    where: {
      id: { in: invoiceIds },
      company_id: companyId,
      tally_export_status: { not: 'exported' }
    },
    include: {
      items: true,
      party_ledger: true,
      warehouse: true
    }
  });

  // 2. Build Tally JSON request
  const tallyRequest = buildTallyImportRequest(invoices, tallyConfig);

  // 3. Determine endpoint (VPN IP or tunnel URL)
  const endpoint = tallyConfig.tally_tunnel_url
    || `http://${tallyConfig.tally_vpn_ip}:${tallyConfig.tally_port}`;

  // 4. Send to TallyPrime
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add auth if using Cloudflare Tunnel
      ...(tallyConfig.tunnel_auth && {
        'CF-Access-Client-Id': tallyConfig.tunnel_client_id,
        'CF-Access-Client-Secret': tallyConfig.tunnel_client_secret
      })
    },
    body: JSON.stringify(tallyRequest),
    signal: AbortSignal.timeout(30000) // 30s timeout
  });

  if (!response.ok) {
    throw new Error(`Tally HTTP error: ${response.status}`);
  }

  const tallyResponse: TallyResponse = await response.json();

  // 5. Process response
  if (tallyResponse.status === "1") {
    // Success - update database
    await db.invoices.updateMany({
      where: { id: { in: invoiceIds } },
      data: {
        tally_export_status: 'exported',
        tally_exported_at: new Date(),
        tally_masterid: tallyResponse.result.LASTVCHID
      }
    });

    return {
      success: true,
      exported: tallyResponse.result.CREATED,
      altered: tallyResponse.result.ALTERED,
      errors: tallyResponse.result.ERRORS
    };
  } else {
    // Failure
    return {
      success: false,
      error: tallyResponse.error || 'Unknown Tally error'
    };
  }
}
```

---

#### **Step 4: Build Tally JSON Request**

```typescript
// src/lib/tally/builders/request-builder.ts

function buildTallyImportRequest(
  invoices: Invoice[],
  config: TallyConfig
): TallyRequest {
  return {
    headers: {
      "content-type": "application/json",
      "version": "1",
      "tallyrequest": "Import",
      "type": "Data",
      "id": "Vouchers"
    },
    body: {
      static_variables: {
        svExportFormat: "$$SysName:JSONEx",
        svCurrentCompany: config.tally_company_name
      },
      tallymessage: invoices.map(invoice => ({
        VOUCHER: {
          DATE: formatTallyDate(invoice.invoice_date),
          VOUCHERNUMBER: invoice.invoice_number,
          VOUCHERTYPENAME: invoice.invoice_type === 'sales' ? 'Sales' : 'Purchase',
          NARRATION: invoice.notes || '',
          PARTYLEDGERNAME: invoice.party_ledger_snapshot.name,

          "ALLINVENTORYENTRIES.LIST": invoice.items.map(item => ({
            STOCKITEMNAME: item.product_snapshot.name,
            ISDEEMEDPOSITIVE: invoice.invoice_type === 'sales' ? 'Yes' : 'No',
            RATE: `${item.rate}/${item.product_snapshot.unit}`,
            AMOUNT: invoice.invoice_type === 'sales'
              ? `-${item.amount}`
              : `${item.amount}`,
            BILLEDQTY: `${item.quantity} ${item.product_snapshot.unit}`,

            "ACCOUNTINGALLOCATIONS.LIST": buildGSTAllocations(item, invoice)
          })),

          "ALLLEDGERENTRIES.LIST": buildLedgerEntries(invoice)
        }
      }))
    }
  };
}
```

---

#### **Step 5: TallyPrime Processes Request**

**Inside TallyPrime (automatic):**

1. ✅ Receives HTTP POST on port 9000
2. ✅ Validates JSON structure
3. ✅ Checks if company is loaded
4. ✅ Validates ledger names exist
5. ✅ Checks accounting equation (Dr = Cr)
6. ✅ Creates vouchers in database
7. ✅ Generates MASTERID/GUID
8. ✅ Returns JSON response

**Response:**
```json
{
  "status": "1",
  "cmp_info": {
    "name": "Acme Textiles Pvt Ltd",
    "guid": "{ABC-123}"
  },
  "result": {
    "CREATED": 3,
    "ALTERED": 0,
    "ERRORS": 0,
    "LASTVCHID": "12347"
  }
}
```

---

#### **Step 6: Bale Updates Database**

```typescript
// Back in export-service.ts

// Store export record
await db.tallyExports.create({
  data: {
    company_id: companyId,
    export_type: 'invoices',
    invoice_count: invoices.length,
    tally_response: tallyResponse,
    export_status: 'success',
    exported_at: new Date()
  }
});

// Update invoice statuses
await db.invoices.updateMany({
  where: { id: { in: invoiceIds } },
  data: {
    tally_export_status: 'exported',
    tally_masterid: tallyResponse.result.LASTVCHID,
    tally_exported_at: new Date()
  }
});
```

---

#### **Step 7: User Sees Success Message**

```typescript
// Frontend receives response
toast.success('3 invoices exported to Tally successfully! ✓');

// UI updates
<Badge variant="success">Exported to Tally</Badge>
```

---

### **E. Complete Setup Checklist**

#### **Bale (Cloud) Setup:**

**1. Database Schema:**
```sql
CREATE TABLE tally_configs (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),

  -- Connection method
  connection_type TEXT CHECK (connection_type IN ('vpn', 'tunnel', 'local')),

  -- VPN config
  tally_vpn_ip TEXT,
  tally_port INTEGER DEFAULT 9000,

  -- Cloudflare Tunnel config
  tally_tunnel_url TEXT,
  tunnel_client_id TEXT,
  tunnel_client_secret TEXT,

  -- Tally details
  tally_company_name TEXT NOT NULL,

  -- Status
  is_enabled BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. Environment Variables:**
```env
# .env.local
VPN_SERVER_URL=vpn.bale.app
VPN_SERVER_PORT=51820

CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

**3. API Routes:**
- ✅ `/api/tally/export` - Export invoices
- ✅ `/api/tally/config` - Save Tally configuration
- ✅ `/api/tally/test-connection` - Test connectivity
- ✅ `/api/tally/status` - Check export status

---

#### **Client (On-Premise) Setup:**

**1. TallyPrime Configuration:**
```
Gateway of Tally
  → F11 (Features)
    → Company Features
      → Enable "Allow integration via HTTP"
      → Port: 9000
```

**2. Choose Connection Method:**

**Option A: VPN (Tailscale - Simplest)**
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Connect
sudo tailscale up

# Get VPN IP
tailscale ip -4
# Copy this IP to Bale configuration
```

**Option B: Cloudflare Tunnel**
```bash
# Install cloudflared
# (See instructions above in Option 3)

# Create and run tunnel
cloudflared tunnel create acme-tally
cloudflared tunnel run acme-tally

# Copy tunnel URL to Bale configuration
```

**3. Test Connection:**
```bash
# From Bale server (or via VPN)
curl -X POST http://10.200.5.10:9000 \
  -H "Content-Type: application/json" \
  -d '{
    "headers": {
      "version": "1",
      "tallyrequest": "Export",
      "type": "Collection",
      "id": "Company"
    }
  }'

# Should return company info
```

---

### **F. Error Handling & Monitoring**

```typescript
// src/lib/tally/export-service.ts

export async function exportWithRetry(options: ExportOptions) {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await exportInvoicesToTally(options);
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
    }
  }

  // All retries failed
  throw new Error(`Tally export failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Connection testing
export async function testTallyConnection(config: TallyConfig): Promise<ConnectionTest> {
  try {
    const endpoint = getEndpoint(config);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headers: {
          version: "1",
          tallyrequest: "Export",
          type: "Object",
          id: "Company"
        }
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    const result = await response.json();

    return {
      success: true,
      companyName: result.cmp_info?.name,
      tallyVersion: result.version
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

### **G. Comparison: HTTP vs File-Based**

| Feature | HTTP JSON | File-Based |
|---------|-----------|------------|
| **Setup Complexity** | ⭐⭐⭐ High | ⭐ Low |
| **User Experience** | ⭐⭐⭐⭐⭐ Automatic | ⭐⭐ Manual steps |
| **Real-time** | ✅ Yes | ❌ No |
| **Network Required** | ✅ VPN/Tunnel | ❌ No |
| **Idempotency** | ✅✅✅ Perfect | ✅✅ Good |
| **Feedback** | ✅ Immediate | ❌ User reports |
| **Cost** | ⭐⭐ VPN infra | ⭐⭐⭐⭐⭐ Free |
| **Scalability** | ✅✅✅ High | ✅✅ Medium |
| **Security** | ✅✅✅ VPN encrypted | ✅✅ File handling |

---

### **H. Recommended Approach**

**Phase 1 (MVP): File-Based**
- Start with file export/download
- No network setup required
- Validates integration logic
- Get user feedback

**Phase 2 (Premium): HTTP + Cloudflare Tunnel**
- Offer as premium/pro feature
- Simplest HTTP setup (no VPN)
- Automatic sync
- Better UX

**Phase 3 (Enterprise): Site-to-Site VPN**
- For large customers with IT teams
- Fastest and most reliable
- Full integration capabilities

---

## 12. Next Steps

- [Official TallyPrime Integration Guide](https://help.tallysolutions.com/integrate-with-tallyprime/)
- [JSON Integration Documentation](https://help.tallysolutions.com/tally-prime-integration-using-json-1/)
- [Integration Methods & Technologies](https://help.tallysolutions.com/integration-methods-and-technologies/)
- [XML Request/Response Examples](https://help.tallysolutions.com/case-study-1/)
- [ODBC Integration Guide](https://help.tallysolutions.com/odbc-integrations/)
- [API2Books Platform](https://api2books.com/)

---

**Document Version:** 1.2
**Last Updated:** 2026-01-23
**Status:** Research Complete - Ready for Implementation
**Changelog:**
- v1.2: Added detailed HTTP JSON integration architecture with VPN/tunnel setup
- v1.1: Added comprehensive FAQ section addressing integration questions
- v1.0: Initial research and documentation
