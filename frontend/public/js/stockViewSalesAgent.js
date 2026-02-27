document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const branch = localStorage.getItem('branch');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    fetchStock(token, branch);

    // Search functionality
    const searchInput = document.getElementById('stockSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterTable(term);
        });
    }

    // Print functionality
    const printBtn = document.getElementById('printStockBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            printStockReport(stockData);
        });
    }
});

let stockData = [];

async function fetchStock(token, branch) {
    try {
        // Fetch procurement data to calculate stock
        // We use procurement endpoint because stock is derived from remaining procurement stock
        const response = await fetch('/api/procurement', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const json = await response.json();
            const procurements = json.data || [];

            // Aggregate stock for the specific branch
            const stockMap = {};

            procurements.forEach(item => {
                // Only consider items for this branch that have stock remaining
                if (item.branch === branch && item.stock > 0) {
                    if (!stockMap[item.produceName]) {
                        stockMap[item.produceName] = {
                            name: item.produceName,
                            type: item.produceType,
                            quantity: 0,
                            price: item.sellingPrice || 0
                        };
                    }
                    stockMap[item.produceName].quantity += item.stock;
                }
            });

            stockData = Object.values(stockMap);
            renderTable(stockData);
        } else {
            console.error('Failed to fetch stock');
            document.querySelector('#stockTable tbody').innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load stock data.</td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderTable(data) {
    const tbody = document.querySelector('#stockTable tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No stock available in this branch.</td></tr>';
        return;
    }

    data.forEach(item => {
        // Determine status based on quantity
        let status = 'Available';
        let statusColor = 'green';
        
        if (item.quantity === 0) {
            status = 'Out of Stock';
            statusColor = 'red';
        } else if (item.quantity < 50) {
            status = 'Low Stock';
            statusColor = 'orange';
        }

        const row = `
            <tr>
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.quantity.toLocaleString()}</td>
                <td>${item.price.toLocaleString()}</td>
                <td style="color: ${statusColor}; font-weight: bold;">${status}</td>
                <td>
                    <button class="action-btn" style="padding: 5px 10px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="window.location.href='recordSaleSalesAgent.html'">
                        <i class="fa-solid fa-cart-plus"></i> Sell
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function printStockReport(data) {
    const branch = localStorage.getItem('branch') || 'N/A';
    const printDate = new Date().toLocaleDateString('en-GB');

    const tableRows = data.map(item => {
        let status = 'Available';
        if (item.quantity === 0) status = 'Out of Stock';
        else if (item.quantity < 50) status = 'Low Stock';

        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.quantity.toLocaleString()}</td>
                <td>${item.price.toLocaleString()}</td>
                <td>${status}</td>
            </tr>
        `;
    }).join('');

    const reportContent = `
        <html>
        <head>
            <title>Stock Report - ${branch}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 16px; }
                h2, h3 { color: #2c3e50; margin: 4px 0; }
                .header { text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 12px; }
                .header img { max-width: 120px; max-height: 60px; object-fit: contain; margin-bottom: 6px; }
                .header p { margin: 2px 0; color: #555; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="/images/logo.png" alt="Karibu Groceries Logo" onerror="this.style.display='none';">
                <h2>Karibu Groceries Ltd</h2>
                <p>Available Stock Report</p>
            </div>
            <h3>Branch: ${branch}</h3>
            <p>Date: ${printDate}</p>
            <table>
                <thead>
                    <tr>
                        <th>Produce Name</th>
                        <th>Type</th>
                        <th>Quantity (KG)</th>
                        <th>Selling Price (UGX)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows.length > 0 ? tableRows : '<tr><td colspan="5" style="text-align:center;">No stock data available.</td></tr>'}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(reportContent);
    printWindow.document.close();
    printWindow.print();
}

function filterTable(term) {
    const filtered = stockData.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.type.toLowerCase().includes(term)
    );
    renderTable(filtered);
}
