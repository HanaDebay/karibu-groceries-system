document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Update Branch Name
    const branch = localStorage.getItem('branch');
    const branchInfo = document.querySelector('.topbar span');
    if (branch && branchInfo) {
        branchInfo.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${branch} Branch`;
    }

    // DOM Elements
    const cashBtn = document.getElementById('cashBtn');
    const creditBtn = document.getElementById('creditBtn');
    const searchInput = document.getElementById('searchInput');
    const salesBody = document.getElementById('salesBody');
    const amountHeader = document.getElementById('amountHeader');

    let salesData = [];
    let currentView = 'cash'; // 'cash' or 'credit'

    // Fetch Sales Data
    async function fetchSales() {
        try {
            const response = await fetch('/api/sales', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                salesData = result.data || [];
                renderTable();
            } else {
                console.error("Failed to fetch sales");
                salesBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:red;">Failed to load sales data.</td></tr>';
            }
        } catch (error) {
            console.error("Error:", error);
            salesBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:red;">Error connecting to server.</td></tr>';
        }
    }

    // Render Table
    function renderTable() {
        salesBody.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();

        // Filter based on view (cash/credit) and search term
        const filteredSales = salesData.filter(sale => {
            const isTypeMatch = sale.type === currentView;
            
            // Search logic
            const buyer = (sale.buyerName || '').toLowerCase();
            const produce = (sale.produceName || '').toLowerCase();
            const agent = (sale.salesAgent || sale.recordedBy || '').toLowerCase();
            const isSearchMatch = buyer.includes(searchTerm) || produce.includes(searchTerm) || agent.includes(searchTerm);

            return isTypeMatch && isSearchMatch;
        });

        if (filteredSales.length === 0) {
            salesBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No ${currentView} sales found.</td></tr>`;
            return;
        }

        let totalTonnage = 0;
        let totalAmountVal = 0;

        filteredSales.forEach(sale => {
            const row = document.createElement('tr');

            // Determine Date (Cash uses 'date', Credit uses 'dispatchDate' or 'date')
            const rawDate = sale.date || sale.dispatchDate;
            const dateObj = new Date(rawDate);
            const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-GB') : 'N/A';
            
            // Determine Amount
            const amount = sale.amount ?? sale.amountPaid ?? sale.amountDue ?? 0;
            const dueDateStr = sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('en-GB') : '-';
            const dueDateStyle = currentView === 'cash' ? 'display:none;' : '';

            totalTonnage += Number(sale.tonnage || 0);
            totalAmountVal += Number(amount);

            row.innerHTML = `
                <td>${dateStr}</td>
                <td>${sale.time || '-'}</td>
                <td>${sale.produceName || '-'}</td>
                <td>${sale.produceType || '-'}</td>
                <td>${sale.tonnage || 0}</td>
                <td>${sale.buyerName || '-'}</td>
                <td>${Number(amount).toLocaleString()}</td>
                <td style="${dueDateStyle}">${dueDateStr}</td>
                <td>${sale.salesAgent || sale.recordedBy || '-'}</td>
                <td>
                    <button type="button" class="action-btn print-btn print-sale-btn" style="padding: 5px 10px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fa-solid fa-print"></i> Print
                    </button>
                </td>
            `;
            const printBtn = row.querySelector('.print-sale-btn');
            if (printBtn) {
                printBtn.addEventListener('click', () => printSaleReceipt(sale));
            }
            salesBody.appendChild(row);
        });

        // Update Header Text
        if (amountHeader) {
            amountHeader.textContent = currentView === 'cash' ? 'Amount Paid (UGX)' : 'Amount Due (UGX)';
        }

        // Toggle Due Date Header Visibility (8th column)
        const dueDateHeader = document.querySelector('table thead th:nth-child(8)');
        if (dueDateHeader) {
            dueDateHeader.style.display = currentView === 'cash' ? 'none' : '';
        }

        // Update Footer Totals
        const totalTonnageEl = document.getElementById('totalTonnage');
        const totalAmountEl = document.getElementById('totalAmount');
        const footerDueDate = document.getElementById('footerDueDate');

        if (totalTonnageEl) totalTonnageEl.textContent = totalTonnage.toLocaleString();
        if (totalAmountEl) totalAmountEl.textContent = totalAmountVal.toLocaleString();
        
        if (footerDueDate) {
            footerDueDate.style.display = currentView === 'cash' ? 'none' : '';
        }
    }

    function printSaleReceipt(sale) {
        const receiptBranch = sale.branch || branch || 'N/A';
        const receiptDate = sale.date || sale.dispatchDate || new Date().toISOString().split('T')[0];
        const safeDate = new Date(receiptDate);
        const formattedDate = !isNaN(safeDate) ? safeDate.toLocaleDateString('en-GB') : receiptDate;
        const formattedTime = sale.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const amount = Number(sale.amount ?? sale.amountPaid ?? sale.amountDue ?? 0);
        const amountLabel = (sale.type || currentView) === 'credit' ? 'Amount Due' : 'Amount Paid';

        const receiptHtml = `
          <html>
            <head>
              <title>Sale Receipt</title>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  margin: 0;
                  padding: 15px;
                  background: #f9f9f9;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .receipt {
                  max-width: 460px;
                  margin: auto;
                  background: #fff;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                }
                .header {
                  text-align: center;
                  border-bottom: 2px solid #f0f0f0;
                  padding-bottom: 10px;
                  margin-bottom: 14px;
                }
                .header img {
                  max-width: 120px;
                  max-height: 60px;
                  object-fit: contain;
                  margin-bottom: 6px;
                }
                .header h2 {
                  margin: 3px 0;
                  color: #2c3e50;
                }
                .header p {
                  margin: 0;
                  font-size: 12px;
                  color: #666;
                }
                .line {
                  display: flex;
                  justify-content: space-between;
                  margin: 8px 0;
                  font-size: 14px;
                }
                .amount {
                  margin-top: 14px;
                  padding-top: 10px;
                  border-top: 2px solid #f0f0f0;
                  font-size: 16px;
                  font-weight: 700;
                }
                .footer {
                  text-align: center;
                  margin-top: 18px;
                  color: #777;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              <div class="receipt">
                <div class="header">
                  <img src="/images/logo.png" alt="Karibu Groceries Logo" onerror="this.style.display='none';">
                  <h2>Karibu Groceries Ltd</h2>
                  <p>Sale Receipt</p>
                </div>

                <div class="line"><strong>Date:</strong><span>${formattedDate}</span></div>
                <div class="line"><strong>Time:</strong><span>${formattedTime}</span></div>
                <div class="line"><strong>Branch:</strong><span>${receiptBranch}</span></div>
                <div class="line"><strong>Sale Type:</strong><span style="text-transform:capitalize;">${sale.type || currentView}</span></div>
                <div class="line"><strong>Buyer:</strong><span>${sale.buyerName || '-'}</span></div>
                <div class="line"><strong>Produce:</strong><span>${sale.produceName || '-'}</span></div>
                <div class="line"><strong>Produce Type:</strong><span>${sale.produceType || '-'}</span></div>
                <div class="line"><strong>Tonnage:</strong><span>${sale.tonnage || 0} KG</span></div>
                <div class="line"><strong>Sales Agent:</strong><span>${sale.salesAgent || sale.recordedBy || '-'}</span></div>
                <div class="line amount"><strong>${amountLabel}:</strong><span>UGX ${amount.toLocaleString()}</span></div>

                <div class="footer">Thank you for your business.</div>
              </div>
            </body>
          </html>
        `;

        const win = window.open('', '', 'width=520,height=760');
        if (!win) return;

        win.document.open();
        win.document.write(receiptHtml);
        win.document.close();

        const tryPrint = () => {
            win.focus();
            win.print();
        };

        const logo = win.document.querySelector('img');
        if (logo && !logo.complete) {
            logo.onload = tryPrint;
            logo.onerror = tryPrint;
            setTimeout(tryPrint, 800);
        } else {
            setTimeout(tryPrint, 200);
        }
    }

    // Event Listeners
    cashBtn.addEventListener('click', () => {
        currentView = 'cash';
        cashBtn.classList.add('active');
        creditBtn.classList.remove('active');
        renderTable();
    });

    creditBtn.addEventListener('click', () => {
        currentView = 'credit';
        creditBtn.classList.add('active');
        cashBtn.classList.remove('active');
        renderTable();
    });

    searchInput.addEventListener('input', renderTable);

    // Initial Load
    fetchSales();
});
