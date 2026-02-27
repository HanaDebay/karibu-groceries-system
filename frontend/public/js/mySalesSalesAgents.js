document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    fetchMySales(token, userName);

    const searchInput = document.getElementById('salesSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderSalesTable();
        });
    }

    // View Toggles
    const cashBtn = document.getElementById('cashBtn');
    const creditBtn = document.getElementById('creditBtn');

    cashBtn.addEventListener('click', () => {
        currentView = 'cash';
        cashBtn.classList.add('active');
        creditBtn.classList.remove('active');
        renderSalesTable();
    });

    creditBtn.addEventListener('click', () => {
        currentView = 'credit';
        creditBtn.classList.add('active');
        cashBtn.classList.remove('active');
        renderSalesTable();
    });

    // Event delegation for print buttons
    const salesTableBody = document.querySelector('#salesTable tbody');
    if (salesTableBody) {
        salesTableBody.addEventListener('click', (e) => {
            const printButton = e.target.closest('.print-btn');
            if (printButton) {
                const saleId = printButton.dataset.id;
                printReceipt(saleId);
            }
        });
    }
});

let allSales = [];
let currentView = 'cash';

function printReceipt(saleId) {
    const sale = allSales.find(s => s._id === saleId);
    if (!sale) {
        alert('Sale not found!');
        return;
    }

    const branch = localStorage.getItem('branch') || 'N/A';
    const agent = sale.salesAgent || localStorage.getItem('userName') || 'N/A';
    const saleDate = new Date(sale.date || sale.dispatchDate).toLocaleDateString('en-GB');
    const saleTime = sale.time || new Date(sale.date || sale.dispatchDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCredit = sale.type === 'credit';
    const amount = Number(sale.amountPaid || sale.amountDue || sale.amount || 0);
    
    // Tax Calculation (Example: 18% VAT)
    const taxRate = 0.18;
    const taxAmount = amount * taxRate;
    const grandTotal = amount + taxAmount;

    const rows = `<tr>
                    <td>${sale.produceName}</td>
                    <td>${Number(sale.tonnage || 0).toLocaleString()} KG</td>
                    <td>${amount.toLocaleString()}</td>
                </tr>`;

    const receiptHtml = `
        <html>
        <head>
            <title>Sales Receipt</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 15px; 
                    background-color: #f9f9f9;
                    -webkit-print-color-adjust: exact; /* For Chrome, Safari */
                    color-adjust: exact; /* Standard */
                }
                .receipt-container { 
                    width: 100%; 
                    max-width: 450px; 
                    margin: auto; 
                    background: #fff; 
                    padding: 25px; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 20px; 
                    border-bottom: 2px solid #f0f0f0;
                    padding-bottom: 15px;
                }
                .header img {
                    max-width: 120px; /* Adjust as needed */
                    margin-bottom: 10px;
                }
                .header h2 { 
                    margin: 0; 
                    color: #2c3e50; 
                    font-size: 24px;
                }
                .header p { margin: 2px 0; font-size: 13px; color: #555; }
                .details, .totals {
                    margin-top: 20px;
                    font-size: 14px;
                }
                .details p, .totals p {
                    margin: 6px 0;
                    display: flex;
                    justify-content: space-between;
                }
                .details p strong, .totals p strong {
                    color: #333;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px;
                }
                th, td { 
                    text-align: left; 
                    padding: 10px; 
                    border-bottom: 1px solid #eee;
                    font-size: 14px;
                }
                th {
                    background-color: #f7f7f7;
                    color: #333;
                    font-weight: 600;
                }
                .totals {
                    border-top: 2px solid #f0f0f0;
                    padding-top: 10px;
                }
                .totals .grand-total {
                    font-size: 18px;
                    font-weight: bold;
                    color: #2c3e50;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 25px; 
                    font-size: 12px; 
                    color: #888; 
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <img src="/images/logo.png" alt="Company Logo">
                    <h2>Karibu Groceries Ltd</h2>
                    <p>${isCredit ? 'Credit Sale Invoice' : 'Cash Sale Receipt'}</p>
                </div>
                <div class="details">
                    <p><strong>Receipt No:</strong> <span>${sale._id}</span></p>
                    <p><strong>Date:</strong> <span>${saleDate} ${saleTime}</span></p>
                    <p><strong>Branch:</strong> <span>${sale.branch || branch}</span></p>
                    <p><strong>Sold To:</strong> <span>${sale.buyerName}</span></p>
                    <p><strong>Sales Agent:</strong> <span>${agent}</span></p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Amount (UGX)</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="totals">
                    <p>Subtotal: <span>UGX ${amount.toLocaleString()}</span></p>
                    <p>VAT (18%): <span>UGX ${taxAmount.toLocaleString()}</span></p>
                    <p class="grand-total"><strong>Total:</strong> <span>UGX ${grandTotal.toLocaleString()}</span></p>
                    ${isCredit ? `<p><strong>Due Date:</strong> <span>${new Date(sale.dueDate).toLocaleDateString('en-GB')}</span></p>` : ''}
                </div>
                <div class="footer">
                    <p>Thank you for your business!</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=500,height=750');
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.print();
}

async function fetchMySales(token, userName) {
    try {
        const response = await fetch('/api/sales', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const json = await response.json();
            const data = json.data || [];

            // Filter for logged-in agent (checking both salesAgent and recordedBy fields for compatibility)
            allSales = data.filter(sale => sale.salesAgent === userName || sale.recordedBy === userName);
            
            // Sort by date descending (newest first)
            allSales.sort((a, b) => {
                const dateA = new Date(a.date || a.dispatchDate);
                const dateB = new Date(b.date || b.dispatchDate);
                return dateB - dateA;
            });

            renderSalesTable();
        } else {
            console.error('Failed to fetch sales');
            document.querySelector('#salesTable tbody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Failed to load sales data.</td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderSalesTable() {
    const tbody = document.querySelector('#salesTable tbody');
    const totalKgEl = document.getElementById('totalKg');
    const totalAmountEl = document.getElementById('totalAmount');
    const searchInput = document.getElementById('salesSearch');
    const term = searchInput ? searchInput.value.toLowerCase() : '';
    
    tbody.innerHTML = '';

    let totalKg = 0;
    let totalAmount = 0;

    // Filter based on View (Cash/Credit) AND Search Term
    const filteredSales = allSales.filter(sale => {
        const matchesType = sale.type === currentView;
        const matchesSearch = 
            (sale.produceName && sale.produceName.toLowerCase().includes(term)) ||
            (sale.buyerName && sale.buyerName.toLowerCase().includes(term)) ||
            ((sale.date || sale.dispatchDate) && (sale.date || sale.dispatchDate).includes(term));
        
        return matchesType && matchesSearch;
    });

    // Toggle Due Date Header (6th column)
    const dueDateHeader = document.querySelector('#salesTable thead th:nth-child(6)');
    if (dueDateHeader) {
        dueDateHeader.style.display = currentView === 'cash' ? 'none' : '';
    }

    if (filteredSales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">No ${currentView} sales found.</td></tr>`;
        if(totalKgEl) totalKgEl.textContent = '0';
        if(totalAmountEl) totalAmountEl.textContent = '0';
        return;
    }

    filteredSales.forEach(sale => {
        // Determine amount based on sale type or available fields
        const amount = Number(sale.amountPaid || sale.amountDue || sale.amount || 0);
        const tonnage = Number(sale.tonnage || 0);
        const dateStr = sale.date || sale.dispatchDate;
        const dueDateStr = sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('en-GB') : '-';
        const dueDateStyle = currentView === 'cash' ? 'display:none;' : '';
        
        totalKg += tonnage;
        totalAmount += amount;

        const row = `
            <tr>
                <td>${new Date(dateStr).toLocaleDateString('en-GB')}</td>
                <td>${sale.produceName}</td>
                <td>${tonnage.toLocaleString()}</td>
                <td>${sale.buyerName}</td>
                <td>${amount.toLocaleString()}</td>
                <td style="${dueDateStyle}">${dueDateStr}</td>
                <td>
                    <button class="action-btn print-btn" data-id="${sale._id}" style="padding: 5px 10px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fa-solid fa-print"></i> Print
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    if(totalKgEl) totalKgEl.textContent = totalKg.toLocaleString();
    if(totalAmountEl) totalAmountEl.textContent = totalAmount.toLocaleString();
}
