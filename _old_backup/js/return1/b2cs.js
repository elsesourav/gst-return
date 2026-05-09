const STATES = {
   "jammu & kashmir": { id: "01", name: "Jammu & Kashmir" },
   "jammu and kashmir": { id: "01", name: "Jammu & Kashmir" },
   "himachal pradesh": { id: "02", name: "Himachal Pradesh" },
   punjab: { id: "03", name: "Punjab" },
   chandigarh: { id: "04", name: "Chandigarh" },
   uttarakhand: { id: "05", name: "Uttarakhand" },
   haryana: { id: "06", name: "Haryana" },
   delhi: { id: "07", name: "Delhi" },
   rajasthan: { id: "08", name: "Rajasthan" },
   "uttar pradesh": { id: "09", name: "Uttar Pradesh" },
   bihar: { id: "10", name: "Bihar" },
   sikkim: { id: "11", name: "Sikkim" },
   "arunachal pradesh": { id: "12", name: "Arunachal Pradesh" },
   nagaland: { id: "13", name: "Nagaland" },
   manipur: { id: "14", name: "Manipur" },
   mizoram: { id: "15", name: "Mizoram" },
   tripura: { id: "16", name: "Tripura" },
   meghalaya: { id: "17", name: "Meghalaya" },
   assam: { id: "18", name: "Assam" },
   "west bengal": { id: "19", name: "West Bengal" },
   jharkhand: { id: "20", name: "Jharkhand" },
   odisha: { id: "21", name: "Odisha" },
   chhattisgarh: { id: "22", name: "Chhattisgarh" },
   "madhya pradesh": { id: "23", name: "Madhya Pradesh" },
   gujarat: { id: "24", name: "Gujarat" },
   "daman & diu": { id: "25", name: "Daman & Diu" },
   "daman and diu": { id: "25", name: "Daman & Diu" },
   "dadra & nagar haveli & daman & diu": {
      id: "26",
      name: "Dadra & Nagar Haveli & Daman & Diu",
   },
   "dadra and nagar haveli and daman and diu": {
      id: "26",
      name: "Dadra & Nagar Haveli & Daman & Diu",
   },
   "dadra and nagar haveli": {
      id: "26",
      name: "Dadra & Nagar Haveli & Daman & Diu",
   },
   "dadra & nagar haveli": {
      id: "26",
      name: "Dadra & Nagar Haveli & Daman & Diu",
   },
   maharashtra: { id: "27", name: "Maharashtra" },
   karnataka: { id: "29", name: "Karnataka" },
   goa: { id: "30", name: "Goa" },
   lakshdweep: { id: "31", name: "Lakshdweep" },
   kerala: { id: "32", name: "Kerala" },
   "tamil nadu": { id: "33", name: "Tamil Nadu" },
   puducherry: { id: "34", name: "Puducherry" },
   pondicherry: { id: "34", name: "Puducherry" },
   "andaman & nicobar islands": { id: "35", name: "Andaman & Nicobar Islands" },
   "andaman and nicobar islands": {
      id: "35",
      name: "Andaman & Nicobar Islands",
   },
   telangana: { id: "36", name: "Telangana" },
   "andhra pradesh": { id: "37", name: "Andhra Pradesh" },
   ladakh: { id: "38", name: "Ladakh" },
};

function getTableSheets(sheets) {
   const tableSheets = {};
   for (const name in sheets) {
      const sheet = sheets[name];
      tableSheets[name] = getSheetDataToTable(sheet);
   }
   return tableSheets;
}
function findBestMatching(input, OBJECT = STATES) {
   input = input.toLowerCase().trim();

   if (OBJECT[input]) {
      return OBJECT[input];
   }

   const inputWords = input.split(/\s+/);
   let bestMatch = null;
   let maxMatchCount = 0;

   for (const key of Object.keys(OBJECT)) {
      const keyWords = key.split(/\s+/);
      let matchCount = 0;

      // Count matching words
      for (const word of inputWords) {
         if (keyWords.includes(word)) {
            matchCount++;
         }
      }

      if (matchCount > maxMatchCount) {
         maxMatchCount = matchCount;
         bestMatch = key;
      }
   }

   return bestMatch ? OBJECT[bestMatch] : null;
}

function ifFindThenGetKey(obj, value) {
   for (const key in obj) {
      if (obj[key].includes(value)) {
         return key;
      }
   }
   return null;
}

function b2csGetByMyState(table, sellerState = "West Bengal") {
   const tableTitle = table[1];
   const atvName = ifFindThenGetKey(tableTitle, "Aggregate Taxable Value");
   const cmName = ifFindThenGetKey(tableTitle, "CESS Amount");
   const cgstName = ifFindThenGetKey(tableTitle, "CGST");
   const sgstName = ifFindThenGetKey(tableTitle, "SGST/UT");
   if (atvName === null || cgstName === null) {
      return null;
   }

   delete table[1];
   const data = {};

   for (const n in table) {
      const row = table[n];
      const tax = +parseFloat(row[atvName] || 0).toFixed(2);
      const csamt = +parseFloat(row[cmName] || 0).toFixed(2);
      const igst = row[cgstName] || 0;
      const sgst = row[sgstName] || 0;

      const stateIDName = findBestMatching(sellerState);
      if (!stateIDName) {
         console.log("Not Found", sellerState);
         continue;
      }
      const { id, name } = stateIDName;

      const gstTotal = +parseFloat(parseFloat(igst) + parseFloat(sgst)).toFixed(
         2
      );

      if (!data[id]) {
         data[id] = {};
         data[id][gstTotal] = { tax, name, csamt };
         continue;
      }

      if (!data[id][gstTotal]) data[id][gstTotal] = { tax, name, csamt };
      else {
         data[id][gstTotal].tax += tax;
         data[id][gstTotal].csamt += csamt;
      }
   }

   return data;
}

function b2csGetByOthersState(table) {
   const tableTitle = table[1];
   const atvName = ifFindThenGetKey(tableTitle, "Aggregate Taxable Value");
   const dsName = ifFindThenGetKey(tableTitle, "Delivered State");
   const cmName = ifFindThenGetKey(tableTitle, "CESS Amount");
   const igstName = ifFindThenGetKey(tableTitle, "IGST");
   if (atvName === null || dsName === null || igstName === null) {
      return null;
   }

   delete table[1];
   const data = {};

   for (const n in table) {
      const row = table[n];
      const tax = +parseFloat(row[atvName] || 0).toFixed(2);
      const igst = +parseFloat(row[igstName] || 0).toFixed(2);
      const csamt = +parseFloat(row[cmName] || 0).toFixed(2);

      const stateIDName = findBestMatching(row[dsName]);
      if (!stateIDName) {
         console.log("Not Found", sellerState);
         continue;
      }
      const { id, name } = stateIDName;

      if (!data[id]) {
         data[id] = {};
         data[id][igst] = { tax, name, csamt };
         continue;
      }

      if (!data[id][igst]) data[id][igst] = { tax, name, csamt };
      else {
         data[id][igst].tax += tax;
         data[id][igst].csamt += csamt;
      }
   }

   return data;
}

function ifFindThenGetGstID(tSheets) {
   let names = [];
   let gstId = null;

   for (const name in tSheets) {
      if (
         name.includes("Section 7(A)(2)") ||
         name.includes("Section 7(B)(2)")
      ) {
         names.push(name);
      }
   }

   names.forEach((name) => {
      const tSheet = tSheets[name];
      const tableTitle = tSheet[1];
      const GSTIN = ifFindThenGetKey(tableTitle, "GSTIN");

      if (tSheet[2]?.[GSTIN] && !gstId) {
         gstId = tSheet[2]?.[GSTIN];
      }
   });

   return gstId;
}

function margeWithMainData(GST_ID, SESSION, rows = {}) {
   return {
      gstin: GST_ID,
      fp: SESSION,
      version: "GST3.2.2",
      hash: "hash",
      ...rows,
   };
}

function margeDataWithOthersDetails(data, GST_ID, myStateCode = "19") {
   const rows = [];
   let totalTaxableValue = 0;
   let integratedTax = 0;
   let centralTax = 0;
   let stateUTTax = 0;

   for (const sCode in data) {
      const row = data[sCode];

      for (const per in row) {
         const { tax, csamt } = row[per];
         const iamt = +((tax * per) / 100).toFixed(2);
         totalTaxableValue += tax;

         // for others state
         if (sCode !== myStateCode) {
            rows.push({
               sply_ty: "INTER",
               rt: +per,
               typ: "OE",
               pos: sCode,
               txval: tax,
               iamt: iamt,
               csamt: csamt,
            });
            integratedTax += iamt;

            // for my state
         } else {
            const halfGst = +(iamt / 2).toFixed(2);
            rows.push({
               sply_ty: "INTRA",
               rt: +per,
               typ: "OE",
               pos: sCode,
               txval: tax,
               camt: halfGst,
               samt: halfGst,
               csamt: csamt,
            });
            centralTax += halfGst;
            stateUTTax += halfGst;
         }
      }
   }

   _total_taxable_value_.innerText = totalTaxableValue.toFixed(2);
   _integrated_tax_.innerText = integratedTax.toFixed(2);
   _central_tax_.innerText = centralTax.toFixed(2);
   _state_ut_tax_.innerText = stateUTTax.toFixed(2);
   taxOutputSection.classList.remove("hidden");
   _seller_gst_no_.innerText = GST_ID;

   return { b2cs: rows };
}

function findStateNameById(id) {
   const state = Object.values(STATES).find((state) => state.id === id);
   return state ? state.name : null;
}

function getB2CsData(tSheets, GST_ID, myStateCode = "19") {
   let b2csData = {};
   const myStateName = findStateNameById(myStateCode);

   for (const name in tSheets) {
      const tSheet = tSheets[name];

      if (name.includes("Section 7(A)(2)")) {
         const localStateData = b2csGetByMyState(tSheet, myStateName);
         if (localStateData) b2csData = localStateData;
      } else if (name.includes("Section 7(B)(2)")) {
         const othersStateData = b2csGetByOthersState(tSheet);
         if (othersStateData) b2csData = { ...b2csData, ...othersStateData };
      }
   }
   return margeDataWithOthersDetails(b2csData, GST_ID, myStateCode);
}

function getDocIssue(tSheets) {
   let docIssueTable;

   for (const name in tSheets) {
      if (name.includes("Section 13 in GSTR-1")) {
         docIssueTable = tSheets[name];
      }
   }

   const tableTitle = docIssueTable[1];
   const isfName = ifFindThenGetKey(tableTitle, "Invoice Series From");
   const istName = ifFindThenGetKey(tableTitle, "To");
   const tniName = ifFindThenGetKey(tableTitle, "Total Number of Invoices");
   const ciaName = ifFindThenGetKey(tableTitle, "Cancelled if any");

   if (OR(null, isfName, istName, tniName, ciaName)) return null;

   delete docIssueTable[1];
   const data = [];

   let i = 1;
   for (const n in docIssueTable) {
      const row = docIssueTable[n];
      const isf = row[isfName];
      const ist = row[istName];
      const tni = parseInt(row[tniName]);
      const cia = parseInt(row[ciaName]);

      if (NOR(0, isf, ist, tni, cia)) continue;

      data.push({
         num: i++,
         to: ist,
         from: isf,
         totnum: tni,
         cancel: cia,
         net_issue: tni - cia,
      });
   }

   return {
      doc_issue: {
         doc_det: [
            {
               doc_num: 1,
               doc_typ: "Invoices for outward supply",
               docs: [...data],
            },
         ],
      },
   };
}

function getHSNData(tSheets) {
   let hsnData;

   for (const name in tSheets) {
      if (name.includes("Section 12 in GSTR-1")) {
         hsnData = tSheets[name];
      }
   }

   const tableTitle = hsnData[1];
   const hnName = ifFindThenGetKey(tableTitle, "HSN Number");
   const tqnName = ifFindThenGetKey(tableTitle, "Total Quantity in Nos");
   const ttvrName = ifFindThenGetKey(tableTitle, "Total Taxable Value Rs");
   const iarName = ifFindThenGetKey(tableTitle, "IGST Amount Rs");
   const carName = ifFindThenGetKey(tableTitle, "CGST Amount Rs");
   const sarName = ifFindThenGetKey(tableTitle, "SGST Amount Rs");
   const crName = ifFindThenGetKey(tableTitle, "Cess Rs");

   if (OR(null, hnName, tqnName, ttvrName, iarName, carName, sarName, crName)) {
      return null;
   }

   delete hsnData[1];
   const data = [];

   let i = 1;
   for (const n in hsnData) {
      const row = hsnData[n];
      const hn = row[hnName];
      const tqn = parseInt(row[tqnName]);
      const ttvr = +parseFloat(row[ttvrName]).toFixed(2);
      const iar = +parseFloat(row[iarName]).toFixed(2);
      const car = +parseFloat(row[carName]).toFixed(2);
      const sar = +parseFloat(row[sarName]).toFixed(2);
      const cr = +parseFloat(row[crName]).toFixed(2);
      if (NOR(0, hn, tqn, ttvr, iar, car, sar, cr)) continue;

      const totalTax = ((iar + car + sar) / ttvr) * 100;
      const tt = +totalTax.toFixed(2);

      data.push({
         num: i++,
         hsn_sc: hn,
         desc: HSN_INFO[hn] || "",
         uqc: "GMS",
         qty: tqn,
         rt: tt,
         txval: ttvr,
         iamt: iar,
         camt: car,
         samt: sar,
         csamt: cr,
      });
   }

   return {
      hsn: {
         hsn_b2c: [...data],
      },
   };
}

function getSupecoData(tSheets, flipkartGSTNoValue) {
   let supecoData;

   for (const name in tSheets) {
      if (name.includes("Section 3 in GSTR-8")) {
         supecoData = tSheets[name];
      }
   }

   const tableTitle = supecoData[1];
   const ntvName = ifFindThenGetKey(tableTitle, "Net Taxable Value");
   const iarName = ifFindThenGetKey(tableTitle, "IGST Amount Rs");
   const carName = ifFindThenGetKey(tableTitle, "CGST Amount Rs");
   const sarName = ifFindThenGetKey(tableTitle, "SGST Amount Rs");

   if (OR(null, ntvName, iarName, carName, sarName)) return null;

   delete supecoData[1];
   const data = [];

   for (const n in supecoData) {
      const row = supecoData[n];
      const ntv = +parseFloat(row[ntvName]).toFixed(2);
      const iar = +parseFloat(row[iarName]).toFixed(2);
      const car = +parseFloat(row[carName]).toFixed(2);
      const sar = +parseFloat(row[sarName]).toFixed(2);
      if (NOR(0, ntv, iar, car, sar)) continue;

      data.push({
         etin: flipkartGSTNoValue,
         suppval: ntv,
         igst: iar,
         cgst: car,
         sgst: sar,
         cess: 0,
      });
   }

   return {
      supeco: {
         clttx: [...data],
      },
   };
}
