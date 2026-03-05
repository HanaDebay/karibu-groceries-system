document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName');
  const branch = localStorage.getItem('branch');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const branchInfo = document.querySelector('.topbar span');
  if (branch && branchInfo) {
    branchInfo.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${branch} Branch`;
  }

  const cashBtn = document.getElementById('cashBtn');
  const creditBtn = document.getElementById('creditBtn');
  const searchInput = document.getElementById('salesSearch');

  let allSales = [];
  let currentView = 'cash';

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function getOutstanding(sale) {
    // Current due value after any partial payments.
    return Number(sale.amountDue ?? sale.amount ?? 0);
  }

  function getPaid(sale) {
    return Number(sale.amountPaid ?? 0);
  }

  function getTotalCredit(sale) {
    return Number(sale.totalAmount ?? (getOutstanding(sale) + getPaid(sale)));
  }

  function closePaymentModal() {
    document.getElementById('paymentModalBackdrop')?.remove();
  }

  function openPaymentModal(sale) {
    // Same payment modal flow as manager screen for feature parity.
    const outstanding = getOutstanding(sale);
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
        await fetchMySales();
      } catch (_err) {
        showToast('Failed to receive payment.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Payment';
      }
    });
  }

  function applyCreditColumnVisibility() {
    const isCredit = currentView === 'credit';
    const dueDateHeader = document.querySelector('#salesTable thead th:nth-child(8)');
    const paidHeader = document.getElementById('paidHeader');
    const totalCreditHeader = document.getElementById('totalCreditHeader');
    const totalPaid = document.getElementById('totalPaid');
    const totalCredit = document.getElementById('totalCredit');
    const footerDueDate = document.getElementById('footerDueDate');

    if (dueDateHeader) dueDateHeader.style.display = isCredit ? '' : 'none';
    if (paidHeader) paidHeader.style.display = isCredit ? '' : 'none';
    if (totalCreditHeader) totalCreditHeader.style.display = isCredit ? '' : 'none';
    if (totalPaid) totalPaid.style.display = isCredit ? '' : 'none';
    if (totalCredit) totalCredit.style.display = isCredit ? '' : 'none';
    if (footerDueDate) footerDueDate.style.display = isCredit ? '' : 'none';
  }

  function renderSalesTable() {
    const tbody = document.querySelector('#salesTable tbody');
    const term = (searchInput?.value || '').toLowerCase();
    tbody.innerHTML = '';

    applyCreditColumnVisibility();

    // Filter by active tab + search term before computing totals.
    const filteredSales = allSales.filter((sale) => {
      const matchesType = sale.type === currentView;
      const matchesSearch =
        String(sale.produceName || '').toLowerCase().includes(term) ||
        String(sale.buyerName || '').toLowerCase().includes(term) ||
        String(sale.date || sale.dispatchDate || '').toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });

    if (!filteredSales.length) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center">No ${currentView} sales found.</td></tr>`;
      document.getElementById('totalKg').textContent = '0';
      document.getElementById('totalAmount').textContent = '0';
      document.getElementById('totalPaid').textContent = '0';
      document.getElementById('totalCredit').textContent = '0';
      return;
    }

    let totalKg = 0;
    let totalOutstanding = 0;
    let totalPaidAmount = 0;
    let totalCreditAmount = 0;

    filteredSales.forEach((sale) => {
      const outstanding = currentView === 'credit' ? getOutstanding(sale) : Number(sale.amountPaid || sale.amount || 0);
      const paid = getPaid(sale);
      const creditTotal = getTotalCredit(sale);
      const dueDateStr = sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('en-GB') : '-';

      totalKg += Number(sale.tonnage || 0);
      totalOutstanding += Number(outstanding || 0);
      totalPaidAmount += paid;
      totalCreditAmount += creditTotal;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(sale.date || sale.dispatchDate).toLocaleDateString('en-GB')}</td>
        <td>${sale.produceName || '-'}</td>
        <td>${Number(sale.tonnage || 0).toLocaleString()}</td>
        <td>${sale.buyerName || '-'}</td>
        <td>${Number(outstanding).toLocaleString()}</td>
        <td style="display:${currentView === 'credit' ? '' : 'none'};">${Number(paid).toLocaleString()}</td>
        <td style="display:${currentView === 'credit' ? '' : 'none'};">${Number(creditTotal).toLocaleString()}</td>
        <td style="display:${currentView === 'credit' ? '' : 'none'};">${dueDateStr}</td>
        <td>
          <button class="action-btn print-btn" data-id="${sale._id}"><i class="fa-solid fa-print"></i> Print</button>
          ${currentView === 'credit' && Number(outstanding) > 0 ? '<button class="action-btn pay-btn" type="button">Receive Payment</button>' : ''}
        </td>
      `;

      row.querySelector('.print-btn')?.addEventListener('click', () => printReceipt(sale._id));
      row.querySelector('.pay-btn')?.addEventListener('click', () => openPaymentModal(sale));
      tbody.appendChild(row);
    });

    document.getElementById('totalKg').textContent = totalKg.toLocaleString();
    document.getElementById('totalAmount').textContent = totalOutstanding.toLocaleString();
    document.getElementById('totalPaid').textContent = totalPaidAmount.toLocaleString();
    document.getElementById('totalCredit').textContent = totalCreditAmount.toLocaleString();
  }

  function printReceipt(saleId) {
    const sale = allSales.find((s) => s._id === saleId);
    if (!sale) return;

    const agent = sale.salesAgent || localStorage.getItem('userName') || 'N/A';
    const saleDate = new Date(sale.date || sale.dispatchDate).toLocaleDateString('en-GB');
    const saleTime = sale.time || new Date(sale.date || sale.dispatchDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCredit = sale.type === 'credit';
    const amount = Number(isCredit ? getOutstanding(sale) : (sale.amountPaid || sale.amount || 0));
    const taxAmount = amount * 0.18;
    const grandTotal = amount + taxAmount;

    const rows = `<tr><td>${sale.produceName}</td><td>${Number(sale.tonnage || 0).toLocaleString()} KG</td><td>${amount.toLocaleString()}</td></tr>`;

    const receiptHtml = `
      <html><head><title>Sales Receipt</title></head><body style="font-family:Segoe UI;padding:15px;background:#f9f9f9;"><div style="max-width:450px;margin:auto;background:#fff;padding:25px;border-radius:8px;"><div style="text-align:center;"><img src="/images/logo.png" style="max-width:120px;" /><h2>Karibu Groceries Ltd</h2><p>${isCredit ? 'Credit Sale Invoice' : 'Cash Sale Receipt'}</p></div><p><strong>Receipt No:</strong> ${sale._id}</p><p><strong>Date:</strong> ${saleDate} ${saleTime}</p><p><strong>Branch:</strong> ${sale.branch || branch || 'N/A'}</p><p><strong>Sold To:</strong> ${sale.buyerName}</p><p><strong>Sales Agent:</strong> ${agent}</p><table style="width:100%;border-collapse:collapse;"><thead><tr><th>Item</th><th>Qty</th><th>Amount (UGX)</th></tr></thead><tbody>${rows}</tbody></table><p>Subtotal: UGX ${amount.toLocaleString()}</p><p>VAT (18%): UGX ${taxAmount.toLocaleString()}</p><p><strong>Total: UGX ${grandTotal.toLocaleString()}</strong></p>${isCredit ? `<p><strong>Due Date:</strong> ${new Date(sale.dueDate).toLocaleDateString('en-GB')}</p>` : ''}</div></body></html>`;

    const printWindow = window.open('', '_blank', 'width=500,height=750');
    if (!printWindow) return;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.print();
  }

  async function fetchMySales() {
    try {
      const response = await fetch('/api/sales', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch sales');

      const json = await response.json();
      const data = json.data || [];
      allSales = data
        .filter((sale) => sale.salesAgent === userName || sale.recordedBy === userName)
        .sort((a, b) => new Date(b.date || b.dispatchDate) - new Date(a.date || a.dispatchDate));
      renderSalesTable();
    } catch (error) {
      console.error(error);
      showToast('Failed to load sales data.', 'error');
    }
  }

  searchInput?.addEventListener('input', renderSalesTable);

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

  fetchMySales();
});
