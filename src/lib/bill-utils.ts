import { School, Student, AcademicPeriod, FeeCategory, calculateStudentTotalBalance } from './data-store';

export interface NewFeeItem {
    description: string;
    amount: number;
}

const numberToWords = (num: number): string => {
    const isNegative = num < 0;
    num = Math.abs(num);

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convert_thousands = (n: number): string => {
        if (n >= 1000) return convert_hundreds(Math.floor(n / 1000)) + " Thousand " + convert_hundreds(n % 1000);
        else return convert_hundreds(n);
    };

    const convert_hundreds = (n: number): string => {
        if (n > 99) return ones[Math.floor(n / 100)] + " Hundred " + convert_tens(n % 100);
        else return convert_tens(n);
    };

    const convert_tens = (n: number): string => {
        if (n < 10) return ones[n];
        else if (n >= 10 && n < 20) return teens[n - 10];
        else return tens[Math.floor(n / 10)] + " " + ones[n % 10];
    };

    if (num === 0) return "Zero";
    
    // Split decimals
    const [cedis, pesewas] = num.toFixed(2).split('.').map(Number);
    
    let result = convert_thousands(cedis) + " Ghana Cedis";
    if (pesewas > 0) {
        result += " and " + convert_tens(pesewas) + " Pesewas";
    }
    
    result = result.trim().replace(/\s+/g, ' ');
    return isNegative ? "Negative " + result : result;
};

/**
 * Calculates the net outstanding balance from ALL terms BEFORE the current period.
 * If currentPeriodId is not provided, returns the full ledger balance (legacy behaviour).
 */
const calculateArrears = (student: Student, currentPeriodId?: string): number => {
    const ledger = student.ledger || [];
    const prevTransactions = ledger.filter(t => {
        if (t.isVoided) return false;
        if (!currentPeriodId) return true; // no period context — treat everything as arrears
        return t.periodId !== currentPeriodId; // only prior-period entries
    });
    const totalBilled = prevTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
    const totalPaid   = prevTransactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
    return Math.max(0, totalBilled - totalPaid);
};

/**
 * Returns the list of fee charges posted to the student's ledger in the current period.
 * Each debit entry becomes a line item on the bill under "New Fees".
 */
const getCurrentTermFees = (student: Student, currentPeriodId?: string, feeCategories?: FeeCategory[]): NewFeeItem[] => {
    if (!currentPeriodId) return [];
    const ledger = student.ledger || [];
    return ledger
        .filter(t => !t.isVoided && t.periodId === currentPeriodId && (Number(t.debit) || 0) > 0)
        .map(t => {
            let desc = '';
            if (feeCategories) {
                const catObj = feeCategories.find(c => c.id === t.category || c.name === t.category);
                if (catObj) {
                    desc = catObj.name;
                }
            }
            if (!desc) {
                desc = t.category || t.description || 'Transaction';
                desc = desc.charAt(0).toUpperCase() + desc.slice(1);
            }
            
            // Append description only if it adds useful context
            if (t.description && t.description !== t.category && t.description !== desc && t.description.toLowerCase() !== 'class fee' && t.description.toLowerCase() !== 'fees payment') {
                desc = `${desc} (${t.description})`;
            }
            
            return {
                description: desc,
                amount: Number(t.debit),
            };
        });
};

export const getTermBillStyles = (navyBlue: string, parchment: string, goldLine: string, isForPdfGeneration: boolean = false) => `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
    
    * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
    }

    body {
        font-family: 'Outfit', sans-serif;
        margin: 0;
        padding: 0;
        color: ${navyBlue};
        background-color: #f0f0f0;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .bill-page {
        width: ${isForPdfGeneration ? '800px' : '210mm'};
        min-height: ${isForPdfGeneration ? 'auto' : '297mm'};
        background-color: ${parchment};
        padding: ${isForPdfGeneration ? '50px' : '40px'};
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
        position: relative;
        margin-bottom: 20px;
    }
    
    .page-break {
        page-break-before: always;
    }

    /* Header Layout */
    .header-container {
        display: flex;
        padding-bottom: 10px;
        margin-bottom: 15px;
        align-items: center;
    }

    .logo-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding-right: 20px;
        border-right: 2px solid ${goldLine};
    }

    .school-logo {
        width: ${isForPdfGeneration ? '140px' : '100px'};
        height: ${isForPdfGeneration ? '140px' : '100px'};
        object-fit: contain;
        margin-bottom: 10px;
    }

    .logo-placeholder {
        width: ${isForPdfGeneration ? '140px' : '100px'};
        height: ${isForPdfGeneration ? '140px' : '100px'};
        background-color: white;
        border: 2px solid ${navyBlue};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isForPdfGeneration ? '60px' : '40px'};
        font-weight: 800;
        margin-bottom: 10px;
    }

    .logo-school-name {
        font-size: ${isForPdfGeneration ? '20px' : '14px'};
        font-weight: 700;
        text-transform: uppercase;
        line-height: 1.2;
    }

    .contact-section {
        flex: 2;
        padding-left: 30px;
    }

    .main-school-name {
        font-size: ${isForPdfGeneration ? '46px' : '32px'};
        font-weight: 800;
        margin: 0 0 10px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .contact-info-row {
        width: 100%;
        text-align: center;
        border-bottom: 2px solid ${goldLine};
        padding-bottom: 20px;
        margin-bottom: 20px;
        font-size: ${isForPdfGeneration ? '22px' : '15px'};
    }

    .contact-info-row span {
        margin: 0 15px;
        white-space: nowrap;
        display: inline-block;
    }

    .contact-info-row strong {
        font-weight: 700;
    }

    /* Official Bar */
    .official-bar {
        background-color: ${navyBlue};
        color: white;
        display: flex;
        justify-content: space-between;
        padding: ${isForPdfGeneration ? '18px 30px' : '12px 30px'};
        margin-bottom: 20px;
        border-top: 3px solid ${goldLine};
        border-bottom: 3px solid ${goldLine};
        align-items: center;
    }

    .official-bar h1 {
        font-size: ${isForPdfGeneration ? '30px' : '22px'};
        font-weight: 800;
        margin: 0;
        letter-spacing: 2px;
    }

    .term-box {
        font-size: ${isForPdfGeneration ? '24px' : '18px'};
        font-weight: 600;
    }

    /* Student Information */
    .student-info-section {
        margin-bottom: 30px;
    }

    .section-header {
        font-weight: 800;
        font-size: ${isForPdfGeneration ? '24px' : '18px'};
        margin-bottom: 15px;
        display: flex;
        justify-content: space-between;
    }

    .info-grid {
        display: grid;
        grid-template-columns: 1.5fr 1fr 1.5fr 1fr;
        gap: ${isForPdfGeneration ? '20px' : '15px'};
        font-size: ${isForPdfGeneration ? '20px' : '15px'};
    }

    .info-item {
        display: flex;
        align-items: center;
    }

    .info-label {
        font-weight: 700;
        margin-right: 8px;
    }

    .info-value {
        border-bottom: 1px dashed ${navyBlue};
        flex-grow: 1;
        padding-bottom: 2px;
        min-height: 20px;
    }

    /* Items Table */
    .bill-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
    }

    .bill-table th {
        background-color: ${navyBlue};
        color: white;
        padding: ${isForPdfGeneration ? '16px' : '12px'};
        text-align: left;
        font-size: ${isForPdfGeneration ? '20px' : '14px'};
        font-weight: 700;
        border: 1px solid white;
    }

    .bill-table td {
        padding: ${isForPdfGeneration ? '20px 16px' : '15px 12px'};
        border: 1px solid ${navyBlue};
        font-size: ${isForPdfGeneration ? '22px' : '15px'};
    }

    .col-sno { width: 60px; text-align: center; }
    .col-desc { flex-grow: 1; }
    .col-amount { width: ${isForPdfGeneration ? '220px' : '180px'}; text-align: right; font-weight: 700; }

    /* Totals Section */
    .totals-container {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 30px;
    }

    .totals-table {
        width: ${isForPdfGeneration ? '500px' : '400px'};
        border-collapse: collapse;
    }

    .totals-table td {
        padding: ${isForPdfGeneration ? '12px 16px' : '8px 12px'};
        font-size: ${isForPdfGeneration ? '22px' : '16px'};
    }

    .total-label {
        font-weight: 700;
        text-align: right;
    }

    .total-value {
        text-align: right;
        border-bottom: 1px solid ${navyBlue};
        width: ${isForPdfGeneration ? '200px' : '150px'};
    }

    .total-due-row td {
        padding-top: 20px;
        color: #d32f2f;
        font-weight: 800;
    }

    .total-due-box {
        font-size: ${isForPdfGeneration ? '30px' : '20px'};
        font-weight: 900;
        border-bottom: 2px double #d32f2f !important;
    }

    /* Words & Footer */
    .words-section {
        margin-bottom: 20px;
        font-size: ${isForPdfGeneration ? '22px' : '16px'};
    }

    .words-line {
        border-bottom: 1px dashed ${navyBlue};
        font-style: italic;
        font-weight: 600;
        padding-left: 10px;
    }
    
    .due-date-section {
        margin-bottom: 30px;
        font-size: ${isForPdfGeneration ? '22px' : '16px'};
        padding: 10px;
        background-color: rgba(211, 47, 47, 0.1);
        border-left: 4px solid #d32f2f;
        display: inline-block;
    }

    .footer-notes {
        margin-top: 40px;
        text-align: center;
        font-style: italic;
        font-size: ${isForPdfGeneration ? '18px' : '14px'};
        opacity: 0.8;
    }

    /* Print Utilities */
    @media print {
        body { 
            background: white; 
            display: block;
        }
        .bill-page { 
            box-shadow: none; 
            padding: 0;
            width: 100%;
            margin-bottom: 0;
        }
        @page {
            margin: 10mm;
        }
    }
`;

export const generateSingleTermBillHtmlString = (
    school: School,
    student: Student,
    termLabel: string,
    currentPeriodId?: string,
    dueDate?: string,
    periods?: AcademicPeriod[],
    feeCategories?: FeeCategory[],
    isForPdfGeneration: boolean = false
): string => {
    const date = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const navyBlue = '#1a2a47';
    const parchment = '#ffffff';
    const goldLine = '#c5a059';

    const newFees = getCurrentTermFees(student, currentPeriodId, feeCategories);
    
    let arrears = 0;
    if (periods && feeCategories) {
        const balanceInfo = calculateStudentTotalBalance(student, periods, currentPeriodId, feeCategories);
        arrears = balanceInfo.mainData.bf + balanceInfo.dailyData.bf;
        
        // Add current term's daily recurring fees to the bill so Total Due matches Family Overview
        if (balanceInfo.dailyAccruedInfo > 0) {
            newFees.push({
                description: 'Daily Recurring Fees (Current Term)',
                amount: balanceInfo.dailyAccruedInfo
            });
        }
    } else {
        arrears = calculateArrears(student, currentPeriodId);
    }

    const totalNewFees = newFees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalDue = arrears + totalNewFees;
    const amountInWords = totalDue < 0 
        ? `Credit of ${numberToWords(Math.abs(totalDue))}`
        : numberToWords(totalDue);

    // Apply strict Arial font family if generating for html2canvas PDF
    const fontOverride = isForPdfGeneration ? 'font-family: Arial, Helvetica, sans-serif !important;' : '';

    // Route logo through proxy for PDF generation to bypass all CORS restrictions on Firebase Storage
    const logoSrc = isForPdfGeneration && school.logoUrl
        ? `/api/proxy-image?url=${encodeURIComponent(school.logoUrl)}`
        : school.logoUrl;

    return `
        <div class="bill-page" style="${fontOverride}">
            ${isForPdfGeneration ? `<style>${getTermBillStyles(navyBlue, parchment, goldLine, true)}</style>` : ''}
            <div class="header-container">
                <div class="logo-section">
                    ${logoSrc ? 
                        `<img src="${logoSrc}" ${isForPdfGeneration ? 'crossorigin="anonymous"' : ''} alt="Logo" class="school-logo" style="margin-bottom: 0;">` : 
                        `<div class="logo-placeholder" style="margin-bottom: 0;">${school.name.charAt(0).toUpperCase()}</div>`
                    }
                </div>
                <div class="contact-section">
                    <h2 class="main-school-name" style="${fontOverride}">${school.name}</h2>
                </div>
            </div>
            
            <div class="contact-info-row" style="${fontOverride}">
                <span style="${fontOverride}">
                    <strong style="${fontOverride}">Email:</strong> ${school.schoolEmail || school.adminEmail || 'N/A'}
                </span>
                <span style="opacity: 0.5; margin: 0 5px;">•</span>
                <span style="${fontOverride}">
                    <strong style="${fontOverride}">Phone Number:</strong> ${school.schoolPhone || 'N/A'}
                </span>
            </div>

            <div class="official-bar" style="${fontOverride}">
                <h1 style="${fontOverride}">STUDENT TERM BILL</h1>
                <div class="term-box" style="${fontOverride}">${termLabel.toUpperCase()}</div>
            </div>

            <div class="student-info-section">
                <div class="section-header" style="${fontOverride}">
                    <span style="${fontOverride}">STUDENT INFORMATION</span>
                    <span style="${fontOverride}">Date Printed: <strong style="${fontOverride}">${date}</strong></span>
                </div>
                <div class="info-grid">
                    <div class="info-item" style="grid-column: span 4; ${fontOverride}">
                        <span class="info-label" style="${fontOverride}">Name:</span>
                        <span class="info-value" style="${fontOverride}">${student.name.toUpperCase()}</span>
                    </div>
                    <div class="info-item" style="grid-column: span 1; ${fontOverride}">
                        <span class="info-label" style="${fontOverride}">Class:</span>
                        <span class="info-value" style="${fontOverride}">${student.className}</span>
                    </div>
                    <div class="info-item" style="grid-column: span 2; ${fontOverride}">
                        <span class="info-label" style="${fontOverride}">Student ID:</span>
                        <span class="info-value" style="${fontOverride}">${student.studentId}</span>
                    </div>
                    <div class="info-item" style="grid-column: span 1; ${fontOverride}">
                        <span class="info-label" style="${fontOverride}">Parent Phone:</span>
                        <span class="info-value" style="${fontOverride}">${student.parentPhone || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <table class="bill-table" style="${fontOverride}">
                <thead>
                    <tr>
                        <th class="col-sno" style="${fontOverride}">S/No</th>
                        <th class="col-desc" style="${fontOverride}">DESCRIPTION</th>
                        <th class="col-amount" style="${fontOverride}">AMOUNT (GHC)</th>
                    </tr>
                </thead>
                <tbody>
                    ${newFees.map((fee, i) => `
                    <tr>
                        <td class="col-sno" style="${fontOverride}">${i + 1}</td>
                        <td class="col-desc" style="${fontOverride}">${fee.description}</td>
                        <td class="col-amount" style="${fontOverride}">${fee.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                    `).join('')}
                    <!-- Empty rows for spacing -->
                    <tr><td class="col-sno" style="${fontOverride}">&nbsp;</td><td class="col-desc" style="${fontOverride}">&nbsp;</td><td style="${fontOverride}">&nbsp;</td></tr>
                </tbody>
            </table>

            <div class="totals-container">
                <table class="totals-table" style="${fontOverride}">
                    <tr>
                        <td class="total-label" style="${fontOverride}">Sub-Total (New Fees):</td>
                        <td class="total-value" style="${fontOverride}">${totalNewFees.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr>
                        <td class="total-label" style="${fontOverride}">${arrears < 0 ? 'Previous Credit (Overpayment):' : 'Previous Arrears:'}</td>
                        <td class="total-value" style="${fontOverride}">${arrears < 0 ? `(${Math.abs(arrears).toLocaleString(undefined, {minimumFractionDigits: 2})})` : arrears.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr class="total-due-row">
                        <td class="total-label" style="font-size: 18px; ${fontOverride}">${totalDue <= 0 ? 'CREDIT BALANCE:' : 'TOTAL AMOUNT DUE:'}</td>
                        <td class="total-value total-due-box" style="${fontOverride}">${totalDue <= 0 ? `(${Math.abs(totalDue).toLocaleString(undefined, {minimumFractionDigits: 2})})` : totalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                </table>
            </div>

            <div class="words-section" style="${fontOverride}">
                <span class="info-label" style="${fontOverride}">Total Amount in words:</span>
                <div class="words-line" style="${fontOverride}">*** ${amountInWords.toUpperCase()} ***</div>
            </div>
            
            ${dueDate ? `
            <div class="due-date-section" style="${fontOverride}">
                <strong style="${fontOverride}">Payment Due Date:</strong> ${dueDate}
            </div>
            ` : ''}

            <div class="footer-notes" style="${fontOverride}">
                <p style="${fontOverride}">Please make all payments promptly to avoid interruptions to your ward's education.</p>
                <p style="${fontOverride}">Thank you for your cooperation.</p>
            </div>
        </div>
    `;
};

export const generateTermBills = (
    school: School,
    students: Student[],
    termLabel: string,
    currentPeriodId?: string,
    dueDate?: string,
    periods?: AcademicPeriod[],
    feeCategories?: FeeCategory[]
) => {
    let billsHtml = '';

    students.forEach((student, index) => {
        const studentHtml = generateSingleTermBillHtmlString(school, student, termLabel, currentPeriodId, dueDate, periods, feeCategories, false);
        // We only add page-break for the printable version
        billsHtml += studentHtml.replace('<div class="bill-page"', `<div class="bill-page ${index > 0 ? 'page-break' : ''}"`);
    });

    const navyBlue = '#1a2a47';
    const parchment = '#ffffff';
    const goldLine = '#c5a059';

    const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Term Bills - ${termLabel}</title>
            <style>
                ${getTermBillStyles(navyBlue, parchment, goldLine)}
            </style>
        </head>
        <body>
            ${billsHtml}
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Use an anchor tag to open in a new tab with noopener/noreferrer
    // This avoids triggering popup window mode which often gets blocked
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL after a reasonable time to prevent memory leaks
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 60000); // 1 minute
};
