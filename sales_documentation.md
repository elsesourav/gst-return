# Flipkart Sales Report & GSTR-1 Generator Documentation

This document provides an in-depth explanation of how the Flipkart Sales Report and Cash Back Report are parsed, processed, and transformed into the standard GSTR-1 output format.

## Overview

The Sales Report pipeline serves two primary purposes:
1. **Analytics & Comparison:** Parsing the "Sales Report" and "Cash Back Report" Excel sheets from Flipkart to extract taxable values, tax amounts, and grouping them by delivery state.
2. **GSTR-1 Generation:** Constructing a JSON structure that adheres to the official GST offline tool format for GSTR-1 filings, specifically the **B2CS** (Business to Consumer Small) section.

## 1. Input Files and Data Extraction

The system accepts an Excel file from Flipkart. It expects the file to contain specific sheet names.

### Expected Sheets:
*   **"Sales Report"**: The primary source of sales data.
*   **"Cash Back Report"** (Optional): A supplementary sheet that contains cashback data which must be added to the overall taxable value.

### Data Cleaning: The `fixSheetRange` Utility
A common issue with Flipkart Excel reports is that their internal metadata (the `!ref` property) is often broken or hardcoded to a single cell (e.g., `A1:A1`), even if the sheet contains thousands of rows. 
To bypass this, the system uses a custom utility `fixSheetRange` which manually scans all decoded cells in the sheet and recalculates the true bounding box (minimum and maximum rows and columns).

### Column Mapping
The parser flexibly matches column headers. Instead of relying on strict exact matches, it uses `findColumnFlexible` which handles case insensitivity and partial string matches.
*   **Sales Report Columns:** "Customer's Delivery State", "HSN Code", "Taxable Value...", "IGST Rate/Amount", "CGST Rate/Amount", "SGST Rate/Amount".
*   **Cash Back Report Columns:** Similar to the Sales Report, but crucially, it lacks an HSN code column.

## 2. Processing and Grouping Logic (`processSheet`)

The core processing is handled by the `processSheet` function, which iterates through every row of the parsed Excel data.

### Step-by-Step Row Processing:
1.  **State Normalization:** The "Customer's Delivery State" is extracted. Since Flipkart's state names can have typos or formatting variations (e.g., "Jammu & Kashmir" vs "Jammu and Kashmir"), the state string is mapped against a standardized `STATES` dictionary.
2.  **Value Extraction:** Taxable value, IGST, CGST, and SGST rates and amounts are parsed. `safeNum` ensures that empty strings, nulls, or currency symbols (₹, commas) are safely converted to floating-point numbers.
3.  **Rate Calculation:** The overall `gstRate` is calculated by summing IGST + CGST + SGST rates for that specific row.
4.  **HSN Handling:** HSN codes are tracked. Since the Cash Back report lacks HSNs, the parser remembers the *first valid HSN* encountered in the Sales Report and applies it as a fallback (`globalHSN`) for any missing HSNs.
5.  **Grouping Strategy (`StateRateKey`):**
    *   Data must be grouped by **both State and GST Rate** (e.g., `West Bengal||5` and `West Bengal||12` are separate buckets). This separation is strictly required by the GST portal for the GSTR-1 format.
    *   The parser aggregates `taxableValue` and `gstAmount` into these state+rate buckets.

## 3. Data Merging and Refinement

Once both sheets are processed independently, the system performs two types of merges:

### A. Strict Merge (For GSTR-1)
The buckets from the Sales Report and the Cash Back report are combined. If a cashback row belongs to "Maharashtra" at "18%", its taxable value is added to the "Maharashtra||18" bucket from the Sales Report. The distinct rates are preserved.

### B. State-Only Merge (For UI Analytics)
For visualization and comparison against the GSTR Return Report, the rates are dropped, and everything is summed purely by state. This produces `stateData`, an array containing total taxable value and total GST per state regardless of the tax slabs.

## 4. GSTR-1 Output Generation (`generateGSTR1FromSales`)

Once the data is structured, it is passed to `generateGSTR1FromSales`. This transforms the raw buckets into the official `GST3.2.2` JSON schema.

### JSON Structure:
*   **Header Information:** Includes the user's GSTIN, the financial period (`fp` derived from the session string, e.g., "052026"), and standard hash/version fields.
*   **B2CS Array:** The aggregated state+rate buckets are mapped to the `b2cs` array.
    *   `pos` (Place of Supply): Transformed from state names to official two-digit state codes (e.g., "19" for West Bengal).
    *   `sply_ty` (Supply Type): Evaluated dynamically. If the Place of Supply (`pos`) matches the seller's home state (`myStateCode`), it is flagged as `"INTRA"` (Intra-state). Otherwise, it is `"INTER"`.
    *   `rt` (Rate): The preserved GST rate percentage.
    *   `txval`: The aggregated taxable value.
    *   `iamt`, `camt`, `samt`, `csamt`: Tax amounts are split logically. If `INTER` state, the entire tax goes to `iamt` (Integrated Tax). If `INTRA` state, the tax is split equally (50/50) into `camt` (Central) and `samt` (State). Cess (`csamt`) defaults to 0.

### File Output
The resulting JSON payload is saved internally and can be downloaded as `[GSTIN]_[MMYY]_GSTR1.json` for direct upload to the GST Portal.
