document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const branch = localStorage.getItem('branch');
  const branchInfo = document.querySelector('.topbar span');
  if (branch && branchInfo) {
    branchInfo.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${branch} Branch`;
  }

  const cashBtn = document.getElementById('cashBtn');
  const creditBtn = document.getElementById('creditBtn');
  const searchInput = document.getElementById('searchInput');
  const salesBody = document.getElementById('salesBody');
  const amountHeader = document.getElementById('amountHeader');

  let salesData = [];
  let currentView = 'cash';

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function amountDue(sale) {
    // For credit rows this is the live outstanding balance from backend.
    return Number(sale.amountDue ?? sale.amount ?? 0);
  }

  function amountPaid(sale) {
    return Number(sale.amountPaid ?? 0);
  }

  function totalCredit(sale) {
    return Number(sale.totalAmount ?? (amountDue(sale) + amountPaid(sale)));
  }

  function statusLabel(sale) {
    if (amountDue(sale) <= 0) return 'Paid';
    if (amountPaid(sale) > 0) return 'Partially Paid';
    return 'Pending';
  }

  function statusBadgeClass(sale) {
    const status = statusLabel(sale);
    if (status === 'Paid') return 'success';
    if (status === 'Partially Paid') return 'warning';
    return 'danger';
  }

  async function fetchSales() {
    try {
      const response = await fetch('/api/sales', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch sales');

      const result = await response.json();
      salesData = result.data || [];
      renderTable();
    } catch (error) {
      console.error(error);
      salesBody.innerHTML = '<tr><td colspan="14" style="text-align:center; color:red;">Failed to load sales data.</td></tr>';
    }
  }

  function applyCreditColumnVisibility() {
    // Cash and credit share one table; columns are toggled by active view.
    const isCredit = currentView === 'credit';
    const paidHeader = document.getElementById('paidHeader');
    const totalCreditHeader = document.getElementById('totalCreditHeader');
    const statusHeader = document.getElementById('statusHeader');
    const dueDateHeader = document.querySelector('table thead th:nth-child(11)');
    const footerDueDate = document.getElementById('footerDueDate');
    const totalPaid = document.getElementById('totalPaid');
    const totalCreditCell = document.getElementById('totalCredit');
    const footerStatus = document.getElementById('footerStatus');

    if (paidHeader) paidHeader.style.display = isCredit ? '' : 'none';
    if (totalCreditHeader) totalCreditHeader.style.display = isCredit ? '' : 'none';
    if (statusHeader) statusHeader.style.display = isCredit ? '' : 'none';
    if (dueDateHeader) dueDateHeader.style.display = isCredit ? '' : 'none';
    if (footerDueDate) footerDueDate.style.display = isCredit ? '' : 'none';
    if (totalPaid) totalPaid.style.display = isCredit ? '' : 'none';
    if (totalCreditCell) totalCreditCell.style.display = isCredit ? '' : 'none';
    if (footerStatus) footerStatus.style.display = isCredit ? '' : 'none';

    amountHeader.textContent = isCredit ? 'Outstanding (UGX)' : 'Amount Paid (UGX)';
  }

  function filteredSales() {
    const searchTerm = (searchInput.value || '').toLowerCase();
    return salesData.filter((sale) => {
      if (sale.type !== currentView) return false;
      const buyer = String(sale.buyerName || '').toLowerCase();
      const produce = String(sale.produceName || '').toLowerCase();
      const agent = String(sale.salesAgent || sale.recordedBy || '').toLowerCase();
      return buyer.includes(searchTerm) || produce.includes(searchTerm) || agent.includes(searchTerm);
    });
  }

  function renderTable() {
    salesBody.innerHTML = '';
    applyCreditColumnVisibility();

    const rows = filteredSales();
    if (!rows.length) {
      salesBody.innerHTML = `<tr><td colspan="14" style="text-align:center;">No ${currentView} sales found.</td></tr>`;
      document.getElementById('totalTonnage').textContent = '0';
      document.getElementById('totalAmount').textContent = '0';
      document.getElementById('totalPaid').textContent = '0';
      document.getElementById('totalCredit').textContent = '0';
      return;
    }

    let totalTonnage = 0;
    let totalOutstanding = 0;
    let totalPaidAmount = 0;
    let totalCreditAmount = 0;

    rows.forEach((sale) => {
      const row = document.createElement('tr');
      const rawDate = sale.date || sale.dispatchDate;
      const dateObj = new Date(rawDate);
      const dateStr = !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-GB') : 'N/A';
      const dueDateStr = sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('en-GB') : '-';

      const outstanding = currentView === 'credit' ? amountDue(sale) : Number(sale.amountPaid ?? sale.amount ?? 0);
      const paid = amountPaid(sale);
      const total = totalCredit(sale);

      totalTonnage += Number(sale.tonnage || 0);
      totalOutstanding += Number(outstanding || 0);
      totalPaidAmount += paid;
      totalCreditAmount += total;

      row.innerHTML = `
        <td>${dateStr}</td>
        <td>${sale.time || '-'}</td>
        <td>${sale.produceName || '-'}</td>
        <td>${sale.produceType || '-'}</td>
        <td>${Number(sale.tonnage || 0).toLocaleString()}</td>
        <td>${sale.buyerName || '-'}</td>
        <td>${Number(outstanding).toLocaleString()}</td>
        <td style="display:${currentView === 'credit' ? '' : 'none'};">${Number(paid).toLocaleString()}</td>
        <td style="display:${currentView === 'credit' ? '' : 'none'};">${Number(total).toLocaleString()}</td>
        <td style="display:${currentView === 'credit' ? '' : 'none'};"><span class="badge ${statusBadgeClass(sale)}">${statusLabel(sale)}</span></td>
        <td style="display:${currentView === 'credit' ? '' : 'none'};">${dueDateStr}</td>
        <td>${sale.salesAgent || sale.recordedBy || '-'}</td>
        <td>
          <button type="button" class="action-btn print-btn print-sale-btn"><i class="fa-solid fa-print"></i> Print</button>
          ${currentView === 'credit' && Number(outstanding) > 0 ? '<button type="button" class="action-btn pay-btn">Receive Payment</button>' : ''}
        </td>
      `;

      row.querySelector('.print-sale-btn')?.addEventListener('click', () => printSaleReceipt(sale));
      row.querySelector('.pay-btn')?.addEventListener('click', () => openPaymentModal(sale));
      salesBody.appendChild(row);
    });

    document.getElementById('totalTonnage').textContent = totalTonnage.toLocaleString();
    document.getElementById('totalAmount').textContent = totalOutstanding.toLocaleString();
    document.getElementById('totalPaid').textContent = totalPaidAmount.toLocaleString();
    document.getElementById('totalCredit').textContent = totalCreditAmount.toLocaleString();
  }

  function closePaymentModal() {
    document.getElementById('paymentModalBackdrop')?.remove();
  }

  function openPaymentModal(sale) {
    // Inline modal avoids browser prompt and supports method/date/note metadata.
    const outstanding = amountDue(sale);
    if (outstanding <= 0) {
      showToast('This credit sale is already fully paid.', 'error');
      return;
    }

    closePaymentModal();
    const today = new Date().toISOString().split('T')[0];
    const modal = document.createElement('div');
    modal.id = 'paymentModalBackdrop';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="payment-modal">
        <h4>Receive Credit Payment</h4>
        <p><strong>Buyer:</strong> ${sale.buyerName || '-'}</p>
        <p><strong>Outstanding:</strong> UGX ${Number(outstanding).toLocaleString()}</p>

        <div class="modal-group">
          <label>Amount (UGX)</label>
          <input id="paymentAmount" type="number" min="1" />
        </div>
        <div class="modal-group">
          <label>Method</label>
          <select id="paymentMethod">
            <option value="cash">Cash</option>
            <option value="mobile-money">Mobile Money</option>
            <option value="bank-transfer">Bank Transfer</option>
          </select>
        </div>
        <div class="modal-group">
          <label>Payment Date</label>
          <input id="paymentDate" type="date" value="${today}" />
        </div>
        <div class="modal-group">
          <label>Note (Optional)</label>
          <textarea id="paymentNote" rows="2"></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" id="cancelPaymentBtn">Cancel</button>
          <button type="button" class="btn-submit" id="submitPaymentBtn">Submit Payment</button>
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target.id === 'paymentModalBackdrop') closePaymentModal();
    });
    document.body.appendChild(modal);

    document.getElementById('cancelPaymentBtn').addEventListener('click', closePaymentModal);
    document.getElementById('submitPaymentBtn').addEventListener('click', async () => {
      const amount = Number(document.getElementById('paymentAmount').value || 0);
      const method = document.getElementById('paymentMethod').value;
      const paidOn = document.getElementById('paymentDate').value;
      const note = document.getElementById('paymentNote').value.trim();

      if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Payment amount must be greater than 0.', 'error');
        return;
      }
      if (amount > outstanding) {
        showToast('Payment cannot exceed outstanding amount.', 'error');
        return;
      }

      const submitBtn = document.getElementById('submitPaymentBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      try {
        // Payment API updates amountDue/amountPaid/status and appends history.
        const response = await fetch(`/api/sales/credit/${sale._id}/payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ amount, method, paidOn, note })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          showToast(payload.message || 'Failed to receive payment.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Payment';
          return;
        }

        closePaymentModal();
        showToast('Credit payment received successfully.');
        await fetchSales();
      } catch (_err) {
        showToast('Failed to receive payment.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Payment';
      }
    });
  }

  function printSaleReceipt(sale) {
    const receiptBranch = sale.branch || branch || 'N/A';
    const receiptDate = sale.date || sale.dispatchDate || new Date().toISOString().split('T')[0];
    const safeDate = new Date(receiptDate);
    const formattedDate = !Number.isNaN(safeDate.getTime()) ? safeDate.toLocaleDateString('en-GB') : receiptDate;
    const formattedTime = sale.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const amount = Number(currentView === 'credit' ? amountDue(sale) : (sale.amountPaid ?? sale.amount ?? 0));
    const amountLabel = currentView === 'credit' ? 'Outstanding Amount' : 'Amount Paid';

    const receiptHtml = `
      <html>
        <head><title>Sale Receipt</title></head>
        <body style="font-family:Segoe UI;padding:15px;background:#f9f9f9;">
          <div style="max-width:460px;margin:auto;background:#fff;padding:20px;border-radius:8px;">
            <div style="text-align:center;border-bottom:2px solid #f0f0f0;padding-bottom:10px;margin-bottom:14px;">
              <img src="/images/logo.png" alt="Karibu Groceries Logo" style="max-width:120px;max-height:60px;object-fit:contain;" />
              <h2 style="margin:3px 0;color:#2c3e50;">Karibu Groceries Ltd</h2>
              <p style="margin:0;font-size:12px;color:#666;">Sale Receipt</p>
            </div>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Branch:</strong> ${receiptBranch}</p>
            <p><strong>Sale Type:</strong> ${sale.type || currentView}</p>
            <p><strong>Buyer:</strong> ${sale.buyerName || '-'}</p>
            <p><strong>Produce:</strong> ${sale.produceName || '-'}</p>
            <p><strong>Produce Type:</strong> ${sale.produceType || '-'}</p>
            <p><strong>Tonnage:</strong> ${sale.tonnage || 0} KG</p>
            <p><strong>Sales Agent:</strong> ${sale.salesAgent || sale.recordedBy || '-'}</p>
            <p><strong>${amountLabel}:</strong> UGX ${amount.toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '', 'width=520,height=760');
    if (!win) return;
    win.document.open();
    win.document.write(receiptHtml);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 250);
  }

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
  fetchSales();
});
