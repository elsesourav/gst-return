# Summary & Visualization Documentation

This document explains the unified architecture that connects the parsed Sales Report and the GSTR Return Report, powering the application's comparison analytics, file storage mechanisms, and visual UI components.

## 1. Unified State Data Architecture

The application is built around the concept of a standardized **State Code** mapping. Both the Sales parser and the GSTR Return parser resolve their data into a consistent internal dictionary keyed by official 2-digit GST state codes (e.g., "19" for West Bengal, "27" for Maharashtra).

This uniformity allows the `ReportComparisonView` component to cross-reference two completely different Excel structures.

### The Comparison Engine (`ReportComparisonView.tsx`)
1.  **Normalization:** The engine maps the Sales Report data (`salesData.stateData`) against the GSTR Return Data (`gstrData.b2csTableData`).
2.  **Matching:** It iterates through the standard 38 Indian state codes. For each state, it pulls the `totalTaxableValue` calculated manually from the raw Sales Excel and pairs it with the pre-calculated `txval` extracted from the Flipkart Return Excel.
3.  **Delta Calculation:** The system calculates the absolute difference between the Sales value and the GSTR Return value.
4.  **Threshold Flagging:** A visual status badge is generated based on the variance. If the difference is `0` (or extremely close due to floating-point rounding), it is flagged as **Match**. If there is a variance, it is flagged as **Mismatch**, highlighting discrepancies for the accountant.

## 2. Visualization Components (`StateDataTableView.tsx`)

Data visualization is modularized into dedicated table views, utilizing modern React hooks and Tailwind CSS for styling. 

### A. Modular Data Tables
The system breaks down complex JSON arrays into specific, readable tables:
*   `SalesDataTableView`: Renders the grouped state+rate data. Includes a sticky footer row calculating the aggregate sum of all Taxable Values and GST Amounts across the entire country.
*   `GSTRDataTableView`: Visualizes the B2CS array from the return file. It maps `pos` codes to human-readable state names and also features a dynamic sticky footer for total cross-verification.
*   `DocIssueTableView`, `HSNTableView`, `SupecoTableView`: Purpose-built tables that parse and render sections 13, 12, and 3 from the GST schemas respectively.

### B. Raw Excel Preview (`ExcelSheetViewer`)
To allow users to audit the original data without leaving the application, the `ExcelSheetViewer` component renders raw Excel binaries directly in the browser.
*   **Tabbed Navigation:** It dynamically generates clickable tabs for every sheet found within the `.xlsx` workbook (e.g., "Sales Report", "Cash Back Report").
*   **Client-Side Search:** An integrated search bar allows instantaneous filtering across all columns within the actively selected sheet.
*   **Virtual Limits:** Renders inside a container constrained to `70vh` height with vertical scrolling to prevent the UI from locking up while rendering thousands of DOM nodes.

## 3. Data Storage & Persistence (`firestore.ts`)

To ensure historical tracking and rapid recovery of past processing, the application utilizes Firebase Firestore.

### Session File Saving
When a user uploads and processes reports, the parsed artifacts are saved as `SessionFile` documents under the `users/{userId}/clients/{clientId}/sessionFiles/` collection.

There are 4 main file types stored:
1.  **`sales_input`**: The original Flipkart Sales Report Excel.
2.  **`gstr_input`**: The original Flipkart GSTR Return Report Excel.
3.  **`sales_gstr1_output`**: The generated JSON artifact ready for GST portal upload.
4.  **`gstr_return_output`**: The extracted JSON representation of the Return Report.

### Intelligent Data Trimming (`trimExcelForStorage`)
Firestore imposes a strict 1MB size limit per document. Raw Excel data converted to JSON can easily exceed this limit. The system employs an intelligent optimization algorithm:
1.  **Scrubbing:** It iterates through all parsed rows and strips out empty strings, nulls, and undefined values.
2.  **Verification:** It serializes the object. If the size is comfortably under 800KB, it stops and saves.
3.  **Truncation:** If the payload remains too large, the algorithm progressively drops trailing columns (right to left) across all sheets until the payload fits under the threshold, ensuring that the primary identifier columns (usually on the left) are always retained for auditing.

### File Recovery & Download
The user interface features a History Sidebar. 
*   Clicking the "View" (Eye) icon fetches the document from Firestore. If it's raw Excel data, it mounts the `ExcelSheetViewer`. If it's processed data, it mounts the `JsonViewer`.
*   Clicking the "Download" icon dynamically recompiles the `rawExcelData` object back into a binary `.xlsx` file using `XLSX.utils.book_append_sheet`, guaranteeing that users can recover their original spreadsheet formats at any time.
