import { School, Student, PaymentItem, AcademicPeriod } from './data-store';

/**
 * Utility to convert numbers to words for the receipt
 */
const numberToWords = (num: number): string => {
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
    
    return result.trim().replace(/\s+/g, ' ');
};

export const generateReceipt = (school: School, student: Student, payment: PaymentItem, type: 'General' | 'Feeding' | 'Transportation', periods: AcademicPeriod[] = []) => {
    const receiptId = `RCP-${payment.id.toString().slice(-6).toUpperCase()}`;
    const date = new Date(payment.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Official Colors from Design
    const navyBlue = '#1a2a47'; // Deep Navy Professional
    const parchment = '#ffffff'; // White background as requested
    const goldLine = '#c5a059'; // Subtle gold accent
    
    const amountInWords = numberToWords(payment.amount);
    
    // Format Period Label
    let periodLabel = payment.periodId || '';
    if (payment.periodId && periods.length > 0) {
        const period = periods.find(p => p.id === payment.periodId);
        if (period) {
            const termMap: Record<string, string> = {
                'First Term': 'term 1',
                'Second Term': 'term 2',
                'Third Term': 'term 3'
            };
            const termLabel = termMap[period.term] || period.term;
            
            // Format year (e.g. 2025/2026 -> 2025/26)
            let yearLabel = period.year;
            if (yearLabel.includes('/')) {
                const parts = yearLabel.split('/');
                if (parts[1].length === 4) {
                    yearLabel = `${parts[0]}/${parts[1].slice(-2)}`;
                }
            }
            
            periodLabel = `${termLabel} ${yearLabel}`;
        }
    }
    
    // Balance Calculations
    let totalBilled = 0;
    let totalPaid = 0;
    
    // Calculate totals from the unified ledger up to this payment
    const ledger = student.ledger || [];
    
    const paymentIndex = ledger.findIndex(t => t.id === payment.id?.toString() || Number(t.id) === payment.id);
    const ledgerUpToPayment = paymentIndex >= 0 ? ledger.slice(0, paymentIndex + 1) : ledger;
    const validTransactions = ledgerUpToPayment.filter(t => !t.isVoided);

    totalBilled = validTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
    totalPaid = validTransactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
    
    const currentBalance = totalBilled - totalPaid;
    const previousBalance = currentBalance + payment.amount;

    const receiptHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Official Receipt - ${receiptId}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
                
                @font-face {
                    font-family: 'Soin Sans Pro';
                    src: url('/SoinSansPro-Bold.ttf') format('truetype');
                    font-weight: 700;
                    font-style: normal;
                }
                
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
                    justify-content: center;
                }

                .receipt-page {
                    width: 210mm;
                    min-height: 297mm;
                    background-color: ${parchment};
                    padding: 40px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    position: relative;
                }

                /* Header Layout */
                .header-container {
                    display: flex;
                    border-bottom: 2px solid ${goldLine};
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                    align-items: flex-start;
                }

                .logo-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding-right: 20px;
                    border-right: 1px solid ${goldLine};
                }

                .school-logo {
                    width: 100px;
                    height: 100px;
                    object-fit: contain;
                    margin-bottom: 10px;
                }

                .logo-placeholder {
                    width: 100px;
                    height: 100px;
                    background-color: white;
                    border: 2px solid ${navyBlue};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                    font-weight: 800;
                    margin-bottom: 10px;
                }

                .logo-school-name {
                    font-size: 14px;
                    font-weight: 700;
                    text-transform: uppercase;
                    line-height: 1.2;
                }

                .contact-section {
                    flex: 2;
                    padding-left: 30px;
                }

                .main-school-name {
                    font-family: 'Soin Sans Pro', 'Outfit', sans-serif;
                    font-size: 32px;
                    font-weight: 800;
                    margin: 0 0 10px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .contact-info {
                    font-size: 16px;
                    line-height: 1.4;
                }

                .contact-info p {
                    margin: 5px 0;
                }

                .contact-info strong {
                    font-weight: 700;
                }

                /* Official Bar */
                .official-bar {
                    background-color: ${navyBlue};
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 30px;
                    margin-bottom: 20px;
                    border-top: 3px solid ${goldLine};
                    border-bottom: 3px solid ${goldLine};
                }

                .official-bar h1 {
                    font-family: 'Soin Sans Pro', 'Outfit', sans-serif;
                    font-size: 22px;
                    font-weight: 800;
                    margin: 0;
                    letter-spacing: 2px;
                }

                .receipt-no-box {
                    font-size: 18px;
                    font-weight: 600;
                }

                /* Student Information */
                .student-info-section {
                    margin-bottom: 30px;
                }

                .section-header {
                    font-family: 'Soin Sans Pro', 'Outfit', sans-serif;
                    font-weight: 800;
                    font-size: 18px;
                    margin-bottom: 15px;
                    display: flex;
                    justify-content: space-between;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr 1.5fr 1fr;
                    gap: 15px;
                    font-size: 15px;
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
                .receipt-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }

                .receipt-table th {
                    background-color: ${navyBlue};
                    color: white;
                    padding: 12px;
                    text-align: left;
                    font-size: 14px;
                    font-weight: 700;
                    border: 1px solid white;
                }

                .receipt-table td {
                    padding: 15px 12px;
                    border: 1px solid ${navyBlue};
                    font-size: 15px;
                }

                .col-sno { width: 60px; text-align: center; }
                .col-desc { flex-grow: 1; }
                .col-period { width: 150px; }
                .col-amount { width: 180px; text-align: right; font-weight: 700; }

                /* Totals Section */
                .totals-container {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 30px;
                }

                .totals-table {
                    width: 350px;
                    border-collapse: collapse;
                }

                .totals-table td {
                    padding: 8px 12px;
                    font-size: 16px;
                }

                .total-label {
                    font-weight: 700;
                    text-align: right;
                }

                .total-value {
                    text-align: right;
                    border-bottom: 1px solid ${navyBlue};
                    width: 150px;
                }

                .total-paid-row td {
                    padding-top: 15px;
                }

                .total-paid-box {
                    font-size: 20px;
                    font-weight: 900;
                    border-bottom: 2px double ${navyBlue};
                }

                .balance-row td {
                    color: ${navyBlue};
                    font-weight: 700;
                }

                .balance-box {
                    color: #d32f2f; /* Red for emphasis on balance remaining */
                }

                /* Amount in Words */
                .words-section {
                    margin-bottom: 40px;
                    font-size: 16px;
                }

                .words-line {
                    border-bottom: 1px dashed ${navyBlue};
                    font-style: italic;
                    font-weight: 600;
                    padding-left: 10px;
                }

                /* Print Utilities */
                @media print {
                    body { background: white; }
                    .receipt-page { 
                        box-shadow: none; 
                        padding: 0;
                        width: 100%;
                    }
                    @page {
                        margin: 10mm;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-page">
                <div class="header-container">
                    <div class="logo-section">
                        ${school.logoUrl ? 
                            `<img src="${school.logoUrl}" alt="Logo" class="school-logo">` : 
                            `<div class="logo-placeholder">${school.name.charAt(0).toUpperCase()}</div>`
                        }
                        <div class="logo-school-name">${school.name}</div>
                    </div>
                    <div class="contact-section">
                        <h2 class="main-school-name">${school.name}</h2>
                        <div class="contact-info">
                            <p><strong>Email:</strong> ${school.schoolEmail || school.adminEmail || ''}</p>
                            <p><strong>Phone Number:</strong> ${school.schoolPhone || ''}</p>
                        </div>
                    </div>
                </div>

                <div class="official-bar">
                    <h1>OFFICIAL SCHOOL RECEIPT</h1>
                    <div class="receipt-no-box">Receipt No: <strong>#${receiptId}</strong></div>
                </div>

                <div class="student-info-section">
                    <div class="section-header">
                        <span>STUDENT INFORMATION</span>
                        <span>Date: <strong>${date}</strong></span>
                    </div>
                    <div class="info-grid">
                        <div class="info-item" style="grid-column: span 4;">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${student.name.toUpperCase()}</span>
                        </div>
                        <div class="info-item" style="grid-column: span 1;">
                            <span class="info-label">Class:</span>
                            <span class="info-value">${student.className}</span>
                        </div>
                        <div class="info-item" style="grid-column: span 2;">
                            <span class="info-label">Student ID:</span>
                            <span class="info-value">${student.studentId}</span>
                        </div>
                        <div class="info-item" style="grid-column: span 1;">
                            <span class="info-label">Phone:</span>
                            <span class="info-value">${student.parentPhone || ''}</span>
                        </div>
                    </div>
                </div>

                <table class="receipt-table">
                    <thead>
                        <tr>
                            <th class="col-sno">S/No</th>
                            <th class="col-desc">DESCRIPTION</th>
                            <th class="col-period">PERIOD</th>
                            <th class="col-amount">AMOUNT (GHC)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="col-sno">1</td>
                            <td class="col-desc">
                                <strong>${type.toUpperCase()} FEE PAYMENT</strong><br>
                                <span style="font-size: 13px; opacity: 0.8;">${payment.notes || 'School fee payment'}</span>
                            </td>
                            <td class="col-period">${periodLabel}</td>
                            <td class="col-amount">${payment.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                        <!-- Empty rows to match official look -->
                        <tr><td class="col-sno">&nbsp;</td><td class="col-desc">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                        <tr><td class="col-sno">&nbsp;</td><td class="col-desc">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                        <tr><td class="col-sno">&nbsp;</td><td class="col-desc">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                    </tbody>
                </table>

                <div class="totals-container">
                    <table class="totals-table">
                        <tr>
                            <td class="total-label">Sub-Total:</td>
                            <td class="total-value">${payment.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr>
                            <td class="total-label">Previous Balance:</td>
                            <td class="total-value">${Math.max(0, previousBalance).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr class="total-paid-row">
                            <td class="total-label" style="font-size: 18px;">Amount Paid:</td>
                            <td class="total-value total-paid-box">${payment.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr class="balance-row">
                            <td class="total-label">Balance Remaining:</td>
                            <td class="total-value balance-box">${Math.max(0, currentBalance).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                    </table>
                </div>

                <div class="words-section">
                    <span class="info-label">Amount in words:</span>
                    <div class="words-line">*** ${amountInWords.toUpperCase()} ***</div>
                </div>

            </div>

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

    const blob = new Blob([receiptHtml], { type: 'text/html' });
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
    
    // Clean up the blob URL after a reasonable time
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 60000); // 1 minute
};

export const generateThermalReceipt = (school: School, student: Student, payment: PaymentItem, currentBalance: number) => {
    const receiptId = `RCP-${payment.id.toString().slice(-6).toUpperCase()}`;
    const date = new Date(payment.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    
    // Determine fee type display name based on payment category/type
    const catId = (payment as any).categoryId;
    const catName = (payment as any).category;
    const feeTypeName = catName || (catId === 'daily_fee' ? 'Daily Recurring Fee' : (catId === 'fees_payment' ? 'Core School Fees' : 'School Fee'));

    const receiptHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thermal Receipt - ${receiptId}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
                
                * {
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact;
                }

                body {
                    font-family: 'Space Mono', monospace;
                    margin: 0;
                    padding: 0;
                    background-color: white;
                    color: black;
                    width: 58mm; /* Standard 58mm thermal printer */
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                }

                @media print {
                    @page { margin: 0; size: 58mm auto; }
                    body { margin: 0; padding: 5mm; }
                }

                .center { text-align: center; }
                .bold { font-weight: 700; }
                .header-title { font-size: 13px; margin-bottom: 2px; }
                .header-sub { font-size: 11px; margin-bottom: 5px; }
                
                .divider {
                    border-top: 1px dashed black;
                    margin: 6px 0;
                }
                
                .text { font-size: 11px; margin: 3px 0; }
                
                .row {
                    display: flex;
                    justify-content: space-between;
                }
                
                .footer { font-size: 11px; margin-top: 15px; margin-bottom: 5px; }
            </style>
        </head>
        <body>
            <div class="center bold header-title">${school.name.toUpperCase()}</div>
            <div class="center header-sub">OFFICIAL FEE RECEIPT</div>
            
            <div class="divider"></div>
            
            <div class="text">Receipt No: ${receiptId}</div>
            <div class="text row"><span>Student:</span> <span>${student.name.substring(0, 15)}</span></div>
            <div class="text row"><span>Class:</span> <span>${student.className}</span></div>
            
            <div class="divider"></div>
            
            <div class="text row bold"><span>Fee Type</span> <span>Amount</span></div>
            <div class="text row"><span>${feeTypeName}</span> <span>GH&cent; ${payment.amount.toFixed(2)}</span></div>
            
            <div class="divider"></div>
            
            <div class="text row"><span>Balance</span> <span>GH&cent; ${currentBalance.toFixed(2)}</span></div>
            
            <div class="divider"></div>
            
            <div class="text">Date: ${date}</div>
            
            <div class="center footer">Thank you for your payment</div>
            
            <div class="divider"></div>

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

    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 60000); // 1 minute
};
