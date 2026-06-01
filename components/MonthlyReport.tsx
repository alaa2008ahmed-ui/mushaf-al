import React, { useMemo, useState, useEffect } from "react";
import { Invoice, Item, Branch } from "../types";
import Header from "./Header";
import CustomMonthPicker from "./ui/CustomMonthPicker";
import { downloadBlob } from "../downloadUtils";
import { captureAndExport, printOrDownloadPdf } from "../captureUtils";

interface MonthlyReportProps {
  invoices: Invoice[];
  items: Item[];
  branches: Branch[];
  selectedBranchId: string;
}

interface DailyData {
  date: string;
  cash: { [itemName: string]: { qty: number; price: number } };
  credit: { [itemName: string]: { qty: number; price: number } };
  dailyItemTotal: { [itemName: string]: { qty: number; price: number } };
  grandTotal: number;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({
  invoices,
  items,
  branches,
  selectedBranchId,
}) => {
  const [reportBranchId, setReportBranchId] = useState<string>(
    selectedBranchId || "all"
  );

  useEffect(() => {
    setReportBranchId(selectedBranchId || "all");
  }, [selectedBranchId]);

  const allItemNames = useMemo(() => items.map((item) => item.name), [items]);

  // Default to current month YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Helper to format date string from YYYY-MM-DD to DD/MM/YYYY
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper to format month string from YYYY-MM to MM/YYYY
  const formatMonthDisplay = (monthStr: string) => {
    if (!monthStr) return "";
    const parts = monthStr.split("-");
    if (parts.length === 2) {
      return `${parts[1]}/${parts[0]}`;
    }
    return monthStr;
  };

  const processedData: DailyData[] = useMemo(() => {
    const dailyMap = new Map<string, DailyData>();

    const getInitialData = (date: string): DailyData => {
      const data: any = {
        date,
        cash: {},
        credit: {},
        dailyItemTotal: {},
        grandTotal: 0,
      };
      allItemNames.forEach((name) => {
        data.cash[name] = { qty: 0, price: 0 };
        data.credit[name] = { qty: 0, price: 0 };
        data.dailyItemTotal[name] = { qty: 0, price: 0 };
      });
      return data;
    };

    // Security: Ensure invoice is from an allowed branch the user has access to
    const allowedBranchIds = branches.map((b) => b.id);

    // Filter invoices by selected month and branch
    const filteredInvoices = invoices.filter((invoice) => {
      const isAllowedBranch = !invoice.branchId || allowedBranchIds.includes(invoice.branchId);
      if (!isAllowedBranch) return false;

      // Filter by the selected report branch ID
      if (reportBranchId !== "all") {
        const isSameBranch = invoice.branchId === reportBranchId || !invoice.branchId;
        if (!isSameBranch) return false;
      }

      if (!selectedMonth) return true;
      const invoiceDate = new Date(invoice.date);
      const invoiceMonthStr = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`;
      return invoiceMonthStr === selectedMonth;
    });

    filteredInvoices.forEach((invoice) => {
      if (invoice.itemName === "Cancel") return;
      // FIXED: Manually construct YYYY-MM-DD to avoid locale issues (e.g. en-CA possibly not being supported or behaving differently)
      const d = invoice.date;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, getInitialData(dateStr));
      }

      const dayData = dailyMap.get(dateStr)!;

      if (invoice.type === "cash") {
        if (dayData.cash[invoice.itemName]) {
          dayData.cash[invoice.itemName].qty += Number(invoice.quantity) || 0;
          dayData.cash[invoice.itemName].price += Number(invoice.total) || 0;
        }
      } else {
        if (dayData.credit[invoice.itemName]) {
          dayData.credit[invoice.itemName].qty += Number(invoice.quantity) || 0;
          dayData.credit[invoice.itemName].price += Number(invoice.total) || 0;
        }
      }
    });

    const result = Array.from(dailyMap.values());
    result.forEach((dayData) => {
      let dailyGrandTotal = 0;
      allItemNames.forEach((name) => {
        dayData.dailyItemTotal[name].qty =
          dayData.cash[name].qty + dayData.credit[name].qty;
        dayData.dailyItemTotal[name].price =
          dayData.cash[name].price + dayData.credit[name].price;
        dailyGrandTotal += dayData.dailyItemTotal[name].price;
      });
      dayData.grandTotal = dailyGrandTotal;
    });

    return result.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [invoices, allItemNames, selectedMonth, reportBranchId, branches]);

  const monthlyTotal = useMemo(() => {
    const total: Omit<DailyData, "date"> = {
      cash: {},
      credit: {},
      dailyItemTotal: {},
      grandTotal: 0,
    };
    allItemNames.forEach((name) => {
      total.cash[name] = { qty: 0, price: 0 };
      total.credit[name] = { qty: 0, price: 0 };
      total.dailyItemTotal[name] = { qty: 0, price: 0 };
    });

    processedData.forEach((day) => {
      allItemNames.forEach((name) => {
        total.cash[name].qty += day.cash[name].qty;
        total.cash[name].price += day.cash[name].price;
        total.credit[name].qty += day.credit[name].qty;
        total.credit[name].price += day.credit[name].price;
        total.dailyItemTotal[name].qty += day.dailyItemTotal[name].qty;
        total.dailyItemTotal[name].price += day.dailyItemTotal[name].price;
      });
      total.grandTotal += day.grandTotal;
    });
    return total;
  }, [processedData, allItemNames]);

  const itemNames = useMemo(() => {
    return allItemNames.filter((name) => {
      const qtyStr = Number(
        monthlyTotal.dailyItemTotal[name]?.qty || 0,
      ).toFixed(2);
      const priceStr = Number(
        monthlyTotal.dailyItemTotal[name]?.price || 0,
      ).toFixed(2);
      return (
        (qtyStr !== "0.00" && qtyStr !== "-0.00") ||
        (priceStr !== "0.00" && priceStr !== "-0.00")
      );
    });
  }, [monthlyTotal, allItemNames]);

  const handlePrint = () => {
    captureAndExport("printable-area-monthly", (canvas) => {
      const filename = `monthly-sales-report-${selectedMonth}`;
      printOrDownloadPdf(canvas, filename, "l");
    });
  };

  const handleExportPdf = () => {
    captureAndExport("printable-area-monthly", async (canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("l", "mm", "a4"); // landscape
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;

      let width = pdfWidth;
      let height = width / ratio;
      if (height > pdfHeight) {
        height = pdfHeight;
        width = height * ratio;
      }
      const xOffset = (pdfWidth - width) / 2;

      pdf.addImage(imgData, "PNG", xOffset, 0, width, height);

      const filename = `monthly-sales-report-${selectedMonth || "all"}.pdf`;
      const blob = pdf.output("blob");

      await downloadBlob(blob, filename, {
        description: "PDF File",
        accept: { "application/pdf": [".pdf"] },
      });
    });
  };

  const handleExportExcel = async () => {
    const ExcelJS = window.ExcelJS;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Monthly Sales Report", {
      views: [{ rightToLeft: false }],
    });

    const headerStyle = {
      font: { bold: true, color: { argb: "FF000000" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    const cellStyle = {
      alignment: { horizontal: "center" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    const mainHeaderFill = (color: string) => ({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: color },
    });

    // --- STYLING ---
    const cashFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDBEAFE" },
    };
    const creditFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0F2FE" },
    };
    const itemTotalFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFECFEFF" },
    };
    const dateAndGrandTotalFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF7FAFC" },
    };
    const footerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEDF2F7" },
    };

    // --- App Header ---
    const totalCols = 2 + itemNames.length * 6;
    sheet.mergeCells(1, 1, 2, totalCols);
    const headerCell = sheet.getCell(1, 1);
    headerCell.value = "Monthly Sales Report\nSweet Water Company LTD";
    headerCell.font = { size: 20, bold: true, color: { argb: "FFFFFFFF" } };
    headerCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E40AF" },
    };
    headerCell.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: true,
    };
    sheet.getRow(1).height = 25;
    sheet.getRow(2).height = 25;

    // Add Month info
    sheet.mergeCells(3, 1, 3, totalCols);
    const monthCell = sheet.getCell(3, 1);
    const selectedBranch = branches.find((b) => b.id === reportBranchId);
    const branchName = reportBranchId === "all" ? "All Branches" : (selectedBranch ? selectedBranch.name : "Unknown Branch");
    monthCell.value = `Branch: ${branchName} | Month: ${formatMonthDisplay(selectedMonth)}`;
    monthCell.font = { size: 12, bold: true };
    monthCell.alignment = { vertical: "middle", horizontal: "left" };

    let tableStartRow = 5;

    // Merged Headers
    const cashCols = itemNames.length * 2;
    const creditColsStart = cashCols + 2;
    const creditColsEnd = creditColsStart + cashCols - 1;
    const totalColsStart = creditColsEnd + 1;
    const totalColsEnd = totalColsStart + cashCols - 1;

    sheet.mergeCells(tableStartRow, 2, tableStartRow, cashCols + 1);
    sheet.getCell(tableStartRow, 2).value = "Cash Sales";
    sheet.getCell(tableStartRow, 2).fill = mainHeaderFill("FFE6F4EA");
    sheet.getCell(tableStartRow, 2).font = { bold: true };
    sheet.getCell(tableStartRow, 2).alignment = { horizontal: "center" };

    sheet.mergeCells(
      tableStartRow,
      creditColsStart,
      tableStartRow,
      creditColsEnd,
    );
    sheet.getCell(tableStartRow, creditColsStart).value = "Credit Sales";
    sheet.getCell(tableStartRow, creditColsStart).fill =
      mainHeaderFill("FFEBF5FF");
    sheet.getCell(tableStartRow, creditColsStart).font = { bold: true };
    sheet.getCell(tableStartRow, creditColsStart).alignment = {
      horizontal: "center",
    };

    sheet.mergeCells(
      tableStartRow,
      totalColsStart,
      tableStartRow,
      totalColsEnd,
    );
    sheet.getCell(tableStartRow, totalColsStart).value = "Daily Item Total";
    sheet.getCell(tableStartRow, totalColsStart).fill =
      mainHeaderFill("FFFFF0F1");
    sheet.getCell(tableStartRow, totalColsStart).font = { bold: true };
    sheet.getCell(tableStartRow, totalColsStart).alignment = {
      horizontal: "center",
    };

    // Item Headers
    const itemHeaderRow = sheet.getRow(tableStartRow + 1);
    let col = 2;
    [...itemNames, ...itemNames, ...itemNames].forEach((name) => {
      sheet.mergeCells(tableStartRow + 1, col, tableStartRow + 1, col + 1);
      const cell = itemHeaderRow.getCell(col);
      cell.value = name;
      cell.style = { ...headerStyle, fill: mainHeaderFill("FFF2F2F2") };
      col += 2;
    });

    // Qty/Price Headers
    const subHeaderRow = sheet.getRow(tableStartRow + 2);
    sheet.getCell(tableStartRow + 2, 1).value = "Date";
    sheet.getCell(tableStartRow + 2, 1).style = headerStyle;
    for (let i = 0; i < itemNames.length * 3; i++) {
      sheet.getCell(tableStartRow + 2, 2 + i * 2).value = "Qty.";
      sheet.getCell(tableStartRow + 2, 3 + i * 2).value = "Total";
      sheet.getCell(tableStartRow + 2, 2 + i * 2).style = headerStyle;
      sheet.getCell(tableStartRow + 2, 3 + i * 2).style = headerStyle;
    }
    const grandTotalCol = 2 + itemNames.length * 6;
    sheet.getCell(tableStartRow + 2, grandTotalCol).value = "Grand Total";
    sheet.getCell(tableStartRow + 2, grandTotalCol).style = headerStyle;

    sheet.mergeCells(tableStartRow, 1, tableStartRow + 1, 1);

    // Data Rows
    processedData.forEach((day) => {
      const rowData: (string | number)[] = [formatDateDisplay(day.date)];
      itemNames.forEach((name) => {
        rowData.push(day.cash[name].qty || 0, day.cash[name].price || 0);
      });
      itemNames.forEach((name) => {
        rowData.push(day.credit[name].qty || 0, day.credit[name].price || 0);
      });
      itemNames.forEach((name) => {
        rowData.push(
          day.dailyItemTotal[name].qty || 0,
          day.dailyItemTotal[name].price || 0,
        );
      });
      rowData.push(day.grandTotal);
      const row = sheet.addRow(rowData);
      row.eachCell((cell, colNumber) => {
        cell.style = cellStyle;
        if (colNumber === 1 || colNumber === grandTotalCol) {
          cell.fill = dateAndGrandTotalFill;
        } else if (colNumber >= 2 && colNumber <= creditColsStart - 1) {
          cell.fill = cashFill;
        } else if (
          colNumber >= creditColsStart &&
          colNumber <= totalColsStart - 1
        ) {
          cell.fill = creditFill;
        } else if (colNumber >= totalColsStart && colNumber <= totalColsEnd) {
          cell.fill = itemTotalFill;
        }

        if (typeof cell.value === "number" && cell.value > 0 && colNumber > 1) {
          cell.numFmt = "#,##0.00";
        }
      });
      row.getCell(1).alignment = { horizontal: "left" };
    });

    // Footer Row
    const footerData: (string | number)[] = ["Monthly Total"];
    itemNames.forEach((name) => {
      footerData.push(
        monthlyTotal.cash[name].qty,
        monthlyTotal.cash[name].price,
      );
    });
    itemNames.forEach((name) => {
      footerData.push(
        monthlyTotal.credit[name].qty,
        monthlyTotal.credit[name].price,
      );
    });
    itemNames.forEach((name) => {
      footerData.push(
        monthlyTotal.dailyItemTotal[name].qty,
        monthlyTotal.dailyItemTotal[name].price,
      );
    });
    footerData.push(monthlyTotal.grandTotal);
    const footerRow = sheet.addRow(footerData);
    footerRow.eachCell((cell, colNumber) => {
      cell.style = { ...cellStyle, font: { bold: true }, fill: footerFill };
      if (typeof cell.value === "number" && cell.value > 0 && colNumber > 1) {
        cell.numFmt = "#,##0.00";
      }
    });

    // Set column widths
    sheet.getColumn(1).width = 12;
    for (let i = 2; i <= grandTotalCol; i++) sheet.getColumn(i).width = 9;

    // Generate file
    workbook.xlsx.writeBuffer().then(async (buffer) => {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const filename = `Monthly_Sales_Report_${selectedMonth}.xlsx`;

      await downloadBlob(blob, filename, {
        description: "Excel File",
        accept: {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
            ".xlsx",
          ],
        },
      });
    });
  };

  const selectedBranch = branches.find((b) => b.id === reportBranchId);
  const branchName = reportBranchId === "all" ? "All Branches" : (selectedBranch ? selectedBranch.name : "Unknown Branch");

  return (
    <div
      id="printable-area-monthly"
      className="print:min-w-fit print:overflow-visible flex flex-col h-[calc(100vh-20px)] print:h-auto print:block"
    >
      <div className="print-only w-full flex-none">
        {/* Header for PDF/Print - ReadOnly to look like App Header */}
        <Header
          branches={branches}
          selectedBranchId={reportBranchId}
          readOnly={true}
          reportTitle="Monthly Sales Report"
        />
        <div className="mt-8 px-6 border-b pb-6">
          <h2 className="text-3xl font-black text-gray-900 mb-4">
            Monthly Sales Report
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="text-xs uppercase font-bold text-gray-400 block mb-1">
                Target Month
              </span>
              <span className="text-lg font-bold text-gray-800">
                {formatMonthDisplay(selectedMonth)}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="text-xs uppercase font-bold text-gray-400 block mb-1">
                Branch
              </span>
              <span className="text-lg font-bold text-gray-800">
                {branchName}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-2 pt-2 pb-4 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0 print:block print:min-h-fit">
        <div className="bg-white rounded-lg shadow-md mb-2 flex flex-col items-center justify-between gap-1 no-print relative z-[60] py-1.5 px-4 flex-none print:hidden">
          <div className="flex flex-col md:flex-row items-center justify-between w-full no-print gap-2 md:gap-4">
            <div className="flex flex-col w-full md:flex-1 text-center md:text-left">
              <h2 className="text-base sm:text-lg font-black text-cyan-600 leading-tight">
                Monthly Sales
              </h2>
              <p className="text-[10px] sm:text-xs font-semibold text-cyan-400 leading-tight">
                Branch: {branchName}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full md:flex-1">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Branch:</span>
                <select
                  value={reportBranchId}
                  onChange={(e) => setReportBranchId(e.target.value)}
                  className="bg-white border border-gray-300 hover:border-blue-500 rounded px-2 py-1 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px] shadow-sm transition-colors cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32 sm:w-40">
                <CustomMonthPicker
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  themeColor="#2563eb"
                  align="center"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 w-full md:flex-1 no-print">
              <div
                id="monthly-report-actions"
                className="flex items-center gap-1.5 flex-wrap w-full md:w-auto justify-center md:justify-end"
              >
                <button
                  onClick={handlePrint}
                  disabled={processedData.length === 0}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 text-white font-semibold py-1.5 px-3 text-sm rounded-md transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed h-[40px] min-w-[70px]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-2 6H9v4h4v-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden xs:inline">Print</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={processedData.length === 0}
                  className="flex items-center justify-center gap-1.5 bg-green-700 text-white font-semibold py-1.5 px-3 text-sm rounded-md transition-colors hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed h-[40px] min-w-[70px]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3zM5 5v2h2V5H5zm4 0v2h2V5H9zm4 0v2h2V5h-2zM5 9v2h2V9H5zm4 0v2h2V9H9zm4 0v2h2V9h-2zM5 13v2h2v-2H5zm4 0v2h2v-2H9zm4 0v2h2v-2h-2z" />
                  </svg>
                  <span className="hidden xs:inline">Excel</span>
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={processedData.length === 0}
                  className="flex items-center justify-center gap-1.5 bg-red-600 text-white font-semibold py-1.5 px-3 text-sm rounded-md transition-colors hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed h-[40px] min-w-[70px]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm8 3a1 1 0 00-1-1H9a1 1 0 100 2h2a1 1 0 001-1zm-4 4a1 1 0 100 2h4a1 1 0 100-2H8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden xs:inline">PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {selectedMonth && (
          <div className="mb-4 text-center print-only flex-none">
            <h3 className="text-lg font-bold">
              Month: {formatMonthDisplay(selectedMonth)}
            </h3>
          </div>
        )}

        <div className="flex-1 overflow-auto w-full print:overflow-visible min-h-0 bg-white rounded-lg shadow-md custom-scrollbar">
          <table className="min-w-full text-[11px] border-collapse table-auto print:min-w-fit relative">
            <thead className="sticky top-0 z-20 shadow-sm">
              {isCollapsed ? (
                <>
                  {/* Collapsed Main Categories */}
                  <tr className="text-center font-bold">
                    <td
                      rowSpan={2}
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      className="border p-1.5 text-center align-middle sticky left-0 z-30 bg-orange-100/95 text-orange-950 font-black min-w-[70px] outline outline-1 outline-gray-200 cursor-pointer hover:bg-orange-200 hover:text-orange-900 select-none transition-all duration-150 group"
                      title="Click to show detailed view"
                    >
                      Date
                    </td>
                    <td
                      colSpan={2}
                      className="border p-1.5 bg-blue-100 text-blue-900 font-bold outline outline-1 outline-gray-200"
                    >
                      Total Cash Sales
                    </td>
                    <td
                      colSpan={2}
                      className="border p-1.5 bg-sky-100 text-sky-900 font-bold outline outline-1 outline-gray-200"
                    >
                      Total Credit Sales
                    </td>
                    <td
                      rowSpan={2}
                      className="border p-1.5 text-center align-middle bg-gray-100 font-bold outline outline-1 outline-gray-200 text-gray-800"
                    >
                      Grand Total
                    </td>
                  </tr>
                  {/* Collapsed Subheaders Qty / Price */}
                  <tr className="bg-gray-100 font-semibold text-center">
                    <td className="border p-1 text-center bg-blue-50/80 outline outline-1 outline-gray-200">Qty.</td>
                    <td className="border p-1 text-center bg-blue-50/80 outline outline-1 outline-gray-200">Total</td>
                    <td className="border p-1 text-center bg-sky-50/80 outline outline-1 outline-gray-200">Qty.</td>
                    <td className="border p-1 text-center bg-sky-50/80 outline outline-1 outline-gray-200">Total</td>
                  </tr>
                </>
              ) : (
                <>
                  {/* Main Categories */}
                  <tr className="text-center font-bold">
                    <td
                      rowSpan={3}
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      className="border p-1 text-center align-middle sticky left-0 z-30 bg-orange-50 font-black min-w-[70px] outline outline-1 outline-gray-200 cursor-pointer hover:bg-orange-200 hover:text-orange-900 select-none transition-all duration-150 group"
                      title="Click to collapse view"
                    >
                      Date
                    </td>
                    <td
                      colSpan={itemNames.length * 2}
                      className="border p-1 bg-blue-100 outline outline-1 outline-gray-200"
                    >
                      Cash Sales
                    </td>
                    <td
                      colSpan={itemNames.length * 2}
                      className="border p-1 bg-sky-100 outline outline-1 outline-gray-200"
                    >
                      Credit Sales
                    </td>
                    <td
                      colSpan={itemNames.length * 2}
                      className="border p-1 bg-cyan-100 outline outline-1 outline-gray-200"
                    >
                      Daily Item Total
                    </td>
                    <td
                      rowSpan={3}
                      className="border p-1 text-center align-middle bg-gray-100 outline outline-1 outline-gray-200"
                    >
                      Grand Total
                    </td>
                  </tr>
                  {/* Item Names */}
                  <tr className="bg-gray-50">
                    {/* Repeated for Cash, Credit, Daily Total */}
                    {[...Array(3)].map((_, i) =>
                      itemNames.map((name) => (
                        <td
                           key={`${name}-${i}`}
                           colSpan={2}
                           className="border p-1 text-center font-semibold outline outline-1 outline-gray-200 bg-gray-50"
                        >
                          {name}
                        </td>
                      )),
                    )}
                  </tr>
                  {/* Qty and Price */}
                  <tr className="bg-gray-100 font-semibold">
                    {/* Repeated for Cash, Credit, Daily Total */}
                    {[...Array(3)].map((_, i) =>
                      itemNames.map((name, index) => {
                        const colors = [
                          "bg-red-50",
                          "bg-blue-50",
                          "bg-green-50",
                          "bg-yellow-50",
                          "bg-purple-50",
                          "bg-pink-50",
                          "bg-orange-50",
                          "bg-teal-50",
                          "bg-indigo-50",
                        ];
                        const color = colors[index % colors.length];
                        return (
                          <React.Fragment key={`${name}-${i}-sub`}>
                            <td
                              className={`border p-1 text-center ${color} outline outline-1 outline-gray-200`}
                            >
                              Qty.
                            </td>
                            <td
                              className={`border p-1 text-center ${color} outline outline-1 outline-gray-200`}
                            >
                              Total
                            </td>
                          </React.Fragment>
                        );
                      }),
                    )}
                  </tr>
                </>
              )}
            </thead>
            <tbody>
              {processedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={isCollapsed ? 6 : (2 + itemNames.length * 6 + 1)}
                    className="text-center p-4 text-gray-500 sticky left-0"
                  >
                    No data recorded for{" "}
                    {selectedMonth
                      ? formatMonthDisplay(selectedMonth)
                      : "selected month"}
                    .
                  </td>
                </tr>
              ) : (
                processedData.map((day) => {
                  const isSelected = selectedRow === day.date;
                  
                  // Compute sums for collapsed view
                  const cashQtySum = itemNames.reduce((s, name) => s + (day.cash[name]?.qty || 0), 0);
                  const cashPriceSum = itemNames.reduce((s, name) => s + (day.cash[name]?.price || 0), 0);
                  const creditQtySum = itemNames.reduce((s, name) => s + (day.credit[name]?.qty || 0), 0);
                  const creditPriceSum = itemNames.reduce((s, name) => s + (day.credit[name]?.price || 0), 0);

                  return (
                  <tr
                    key={day.date}
                    onClick={() => setSelectedRow(isSelected ? null : day.date)}
                    className={`text-center hover:bg-gray-50 group cursor-pointer ${isSelected ? 'bg-blue-200' : ''}`}
                  >
                    <td className={`border p-1 text-center whitespace-nowrap sticky left-0 z-10 outline outline-1 outline-gray-200 ${isSelected ? 'bg-blue-200 group-hover:bg-blue-300' : 'bg-white group-hover:bg-gray-50'}`}>
                      {formatDateDisplay(day.date)}
                    </td>
                    
                    {isCollapsed ? (
                      <>
                        <td className={`border p-1 bg-blue-50/10 ${isSelected ? 'bg-blue-200 group-hover:bg-blue-300' : ''}`}>
                          {cashQtySum > 0 ? cashQtySum.toFixed(2) : ""}
                        </td>
                        <td className={`border p-1 bg-blue-50/20 font-semibold text-blue-900 ${isSelected ? 'bg-blue-200 group-hover:bg-blue-300' : ''}`}>
                          {cashPriceSum > 0 ? cashPriceSum.toFixed(2) : ""}
                        </td>
                        <td className={`border p-1 bg-sky-50/10 ${isSelected ? 'bg-blue-200 group-hover:bg-blue-300' : ''}`}>
                          {creditQtySum > 0 ? creditQtySum.toFixed(2) : ""}
                        </td>
                        <td className={`border p-1 bg-sky-50/20 font-semibold text-sky-900 ${isSelected ? 'bg-blue-200 group-hover:bg-blue-300' : ''}`}>
                          {creditPriceSum > 0 ? creditPriceSum.toFixed(2) : ""}
                        </td>
                      </>
                    ) : (
                      <>
                        {itemNames.map((name, index) => {
                          const colors = [
                            "bg-red-50",
                            "bg-blue-50",
                            "bg-green-50",
                            "bg-yellow-50",
                            "bg-purple-50",
                            "bg-pink-50",
                            "bg-orange-50",
                            "bg-teal-50",
                            "bg-indigo-50",
                          ];
                          const color = isSelected ? "bg-blue-200 transition-colors group-hover:bg-blue-300" : colors[index % colors.length];
                          return (
                            <React.Fragment key={`${day.date}-cash-${name}`}>
                              <td className={`border p-1 ${color}`}>
                                {day.cash[name].qty > 0
                                  ? day.cash[name].qty.toFixed(2)
                                  : ""}
                              </td>
                              <td className={`border p-1 ${color}`}>
                                {day.cash[name].price > 0
                                  ? day.cash[name].price.toFixed(2)
                                  : ""}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {itemNames.map((name, index) => {
                          const colors = [
                            "bg-red-50",
                            "bg-blue-50",
                            "bg-green-50",
                            "bg-yellow-50",
                            "bg-purple-50",
                            "bg-pink-50",
                            "bg-orange-50",
                            "bg-teal-50",
                            "bg-indigo-50",
                          ];
                          const color = isSelected ? "bg-blue-200 transition-colors group-hover:bg-blue-300" : colors[index % colors.length];
                          return (
                            <React.Fragment key={`${day.date}-credit-${name}`}>
                              <td className={`border p-1 ${color}`}>
                                {day.credit[name].qty > 0
                                  ? day.credit[name].qty.toFixed(2)
                                  : ""}
                              </td>
                              <td className={`border p-1 ${color}`}>
                                {day.credit[name].price > 0
                                  ? day.credit[name].price.toFixed(2)
                                  : ""}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {itemNames.map((name, index) => {
                          const colors = [
                            "bg-red-50",
                            "bg-blue-50",
                            "bg-green-50",
                            "bg-yellow-50",
                            "bg-purple-50",
                            "bg-pink-50",
                            "bg-orange-50",
                            "bg-teal-50",
                            "bg-indigo-50",
                          ];
                          const color = isSelected ? "bg-blue-200 transition-colors group-hover:bg-blue-300" : colors[index % colors.length];
                          return (
                            <React.Fragment key={`${day.date}-total-${name}`}>
                              <td className={`border p-1 font-semibold ${color}`}>
                                {day.dailyItemTotal[name].qty > 0
                                  ? day.dailyItemTotal[name].qty.toFixed(2)
                                  : ""}
                              </td>
                              <td className={`border p-1 font-semibold ${color}`}>
                                {day.dailyItemTotal[name].price > 0
                                  ? day.dailyItemTotal[name].price.toFixed(2)
                                  : ""}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}
                    
                    <td className={`border p-1 font-bold ${isSelected ? 'bg-blue-200 group-hover:bg-blue-300' : 'bg-gray-100'}`}>
                      {day.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
              {isCollapsed ? (
                (() => {
                  const totalCashQty = itemNames.reduce((s, name) => s + (monthlyTotal.cash[name]?.qty || 0), 0);
                  const totalCashPrice = itemNames.reduce((s, name) => s + (monthlyTotal.cash[name]?.price || 0), 0);
                  const totalCreditQty = itemNames.reduce((s, name) => s + (monthlyTotal.credit[name]?.qty || 0), 0);
                  const totalCreditPrice = itemNames.reduce((s, name) => s + (monthlyTotal.credit[name]?.price || 0), 0);
                  return (
                    <tr className="font-bold bg-gray-200 text-center">
                      <td className="border p-1.5 sticky left-0 z-30 bg-gray-200 outline outline-1 outline-gray-300">
                        Monthly Total
                      </td>
                      <td className="border p-1 bg-blue-100 outline outline-1 outline-gray-200">
                        {totalCashQty.toFixed(2)}
                      </td>
                      <td className="border p-1 bg-blue-200 text-blue-950 font-black outline outline-1 outline-gray-200">
                        {totalCashPrice.toFixed(2)}
                      </td>
                      <td className="border p-1 bg-sky-100 outline outline-1 outline-gray-200">
                        {totalCreditQty.toFixed(2)}
                      </td>
                      <td className="border p-1 bg-sky-200 text-sky-950 font-black outline outline-1 outline-gray-200">
                        {totalCreditPrice.toFixed(2)}
                      </td>
                      <td className="border p-1 text-sm font-black whitespace-nowrap bg-gray-300 outline outline-1 outline-gray-300">
                        {monthlyTotal.grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })()
              ) : (
                <tr className="font-bold bg-gray-200 text-center">
                  <td className="border p-1 sticky left-0 z-30 bg-gray-200 outline outline-1 outline-gray-300">
                    Monthly Total
                  </td>
                  {itemNames.map((name, index) => {
                    const colors = [
                      "bg-red-50",
                      "bg-blue-50",
                      "bg-green-50",
                      "bg-yellow-50",
                      "bg-purple-50",
                      "bg-pink-50",
                      "bg-orange-50",
                      "bg-teal-50",
                      "bg-indigo-50",
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <React.Fragment key={`total-cash-${name}`}>
                        <td
                          className={`border p-1 ${color} outline outline-1 outline-gray-200`}
                        >
                          {monthlyTotal.cash[name].qty.toFixed(2)}
                        </td>
                        <td
                          className={`border p-1 ${color} outline outline-1 outline-gray-200`}
                        >
                          {monthlyTotal.cash[name].price.toFixed(2)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  {itemNames.map((name, index) => {
                    const colors = [
                      "bg-red-50",
                      "bg-blue-50",
                      "bg-green-50",
                      "bg-yellow-50",
                      "bg-purple-50",
                      "bg-pink-50",
                      "bg-orange-50",
                      "bg-teal-50",
                      "bg-indigo-50",
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <React.Fragment key={`total-credit-${name}`}>
                        <td
                          className={`border p-1 ${color} outline outline-1 outline-gray-200`}
                        >
                          {monthlyTotal.credit[name].qty.toFixed(2)}
                        </td>
                        <td
                          className={`border p-1 ${color} outline outline-1 outline-gray-200`}
                        >
                          {monthlyTotal.credit[name].price.toFixed(2)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  {itemNames.map((name, index) => {
                    const colors = [
                      "bg-red-50",
                      "bg-blue-50",
                      "bg-green-50",
                      "bg-yellow-50",
                      "bg-purple-50",
                      "bg-pink-50",
                      "bg-orange-50",
                      "bg-teal-50",
                      "bg-indigo-50",
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <React.Fragment key={`total-item-${name}`}>
                        <td
                          className={`border p-1 ${color} outline outline-1 outline-gray-200`}
                        >
                          {monthlyTotal.dailyItemTotal[name].qty.toFixed(2)}
                        </td>
                        <td
                          className={`border p-1 ${color} outline outline-1 outline-gray-200`}
                        >
                          {monthlyTotal.dailyItemTotal[name].price.toFixed(2)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="border p-1 text-sm whitespace-nowrap bg-gray-200 outline outline-1 outline-gray-300">
                    {monthlyTotal.grandTotal.toFixed(2)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;
