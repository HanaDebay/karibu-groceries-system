document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let currentProcurements = [];
    let searchTimeout;

    // DOM Elements
    const tableBody = document.querySelector("#stockTable tbody");
    const printTbody = document.querySelector("#printTbody");
    const stockSearch = document.getElementById('stockSearch');
    const printBtn = document.getElementById('printBtn');
    const printGeneratedDate = document.getElementById('printGeneratedDate');

    // Modal Elements
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const editForm = document.getElementById('editForm');
    const deleteConfirm = document.getElementById('deleteConfirm');

    // Toast function
    function showToast(msg, type = "success") {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // --- Data Fetching and Rendering ---
    const getStatus = (stock) => {
        if (stock <= 0) return { text: "Out of Stock", class: "danger" };
        if (stock < 500) return { text: "Low Stock", class: "warning" };
        return { text: "Available", class: "success" };
    };

    const renderTable = (data, tbody, isForPrint = false) => {
        tbody.innerHTML = "";
        const colspan = isForPrint ? 6 : 7;
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${colspan}">No stock records found.</td></tr>`;
            return;
        }
        data.forEach(item => {
            const status = getStatus(item.stock);
            const row = document.createElement("tr");

            const actionsHtml = isForPrint ? '' : `
                <td class="actions">
                    <button class="btn edit" onclick="openEditModal('${item._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn delete" onclick="openDeleteModal('${item._id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;

            row.innerHTML = `
                <td>${item.produceName}</td>
                <td>${item.produceType}</td>
                <td>${item.branch}</td>
                <td>${item.stock.toLocaleString()}</td>
                <td>${(item.sellingPrice || 0).toLocaleString()}</td>
                <td><span class="badge ${status.class}">${status.text}</span></td>
                ${actionsHtml}
            `;
            tbody.appendChild(row);
        });
    };

    async function fetchAndDisplayStock(searchTerm = "") {
        tableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
        let url = '/api/procurement?';
        if (searchTerm) {
            url += `search=${encodeURIComponent(searchTerm)}`;
        } else {
            url += 'limit=10';
        }

        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch stock data.');
            const resData = await response.json();
            currentProcurements = resData.data || [];
            renderTable(currentProcurements, tableBody, false);
        } catch (err) {
            tableBody.innerHTML = `<tr><td colspan="7" class="error">${err.message}</td></tr>`;
            showToast(err.message, 'error');
        }
    }

    // --- Search and Print ---
    stockSearch.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchAndDisplayStock(stockSearch.value.trim());
        }, 300);
    });

    printBtn.addEventListener('click', async () => {
        showToast('Generating print report...');
        const searchTerm = stockSearch.value.trim();
        const printUrl = searchTerm ? `/api/procurement?search=${encodeURIComponent(searchTerm)}` : '/api/procurement';

        try {
            const response = await fetch(printUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not fetch full report data.');
            const resData = await response.json();
            const printData = resData.data || [];
            renderTable(printData, printTbody, true);
            if (printGeneratedDate) {
                const branch = localStorage.getItem('branch') || 'N/A';
                const now = new Date();
                printGeneratedDate.textContent = `Branch: ${branch} | Date: ${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            }
            window.print();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // --- Modal Handling ---
    const closeModals = () => {
        editModal.setAttribute('aria-hidden', 'true');
        deleteModal.setAttribute('aria-hidden', 'true');
    };

    window.openEditModal = (id) => {
        const item = currentProcurements.find(p => p._id === id);
        if (!item) return;
        editForm.dataset.id = id;
        document.getElementById('editProduceName').value = item.produceName;
        document.getElementById('editProduceType').value = item.produceType;
        document.getElementById('editBranch').value = item.branch;
        document.getElementById('editTonnage').value = item.tonnage;
        document.getElementById('editSellingPrice').value = item.sellingPrice;
        editModal.setAttribute('aria-hidden', 'false');
    };

    let deleteTargetId = null;
    window.openDeleteModal = (id) => {
        const item = currentProcurements.find(p => p._id === id);
        if (!item) return;
        deleteTargetId = id;
        document.getElementById('deleteMessage').textContent = `Are you sure you want to delete the procurement record for "${item.produceName} (${item.produceType})"? This cannot be undone.`;
        deleteModal.setAttribute('aria-hidden', 'false');
    };

    // Add event listeners to close buttons
    document.querySelectorAll('.modal-close, .modal-actions .btn:not([type="submit"])').forEach(el => {
        el.addEventListener('click', closeModals);
    });

    // --- CRUD Operations ---
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editForm.dataset.id;
        const updates = {
            produceName: document.getElementById('editProduceName').value,
            produceType: document.getElementById('editProduceType').value,
            tonnage: parseInt(document.getElementById('editTonnage').value, 10),
            sellingPrice: parseFloat(document.getElementById('editSellingPrice').value),
        };

        try {
            const response = await fetch(`/api/procurement/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updates),
            });
            const resData = await response.json();
            if (!response.ok) throw new Error(resData.message || 'Failed to update record.');

            showToast('Procurement updated successfully!');
            closeModals();
            fetchAndDisplayStock(stockSearch.value.trim());
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    deleteConfirm.addEventListener('click', async () => {
        if (!deleteTargetId) return;
        try {
            const response = await fetch(`/api/procurement/${deleteTargetId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const resData = await response.json();
            if (!response.ok) throw new Error(resData.message || 'Failed to delete record.');

            showToast('Procurement deleted successfully!');
            closeModals();
            deleteTargetId = null;
            fetchAndDisplayStock(stockSearch.value.trim());
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Initial Load
    fetchAndDisplayStock();
});
