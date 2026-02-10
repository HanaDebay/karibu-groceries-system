// ===== Toast Notification =====
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Toggle Forms =====
const cashBtn = document.getElementById('cashBtn');
const creditBtn = document.getElementById('creditBtn');
const cashForm = document.getElementById('cashSaleForm');
const creditForm = document.getElementById('creditSaleForm');

if (cashBtn && creditBtn && cashForm && creditForm) {
    cashBtn.addEventListener('click', () => {
        cashForm.classList.remove('hidden');
        creditForm.classList.add('hidden');
        cashBtn.classList.add('active');
        creditBtn.classList.remove('active');
    });

    creditBtn.addEventListener('click', () => {
        creditForm.classList.remove('hidden');
        cashForm.classList.add('hidden');
        creditBtn.classList.add('active');
        cashBtn.classList.remove('active');
    });
}

// ===== Validation Functions =====
function validateCashSale(form) {
    const produceName = form.produceName.value.trim();
    const tonnage = form.tonnage.value.trim();
    const amountPaid = form.amountPaid.value.trim();
    const buyerName = form.buyerName.value.trim();
    const salesAgent = form.salesAgent.value.trim();
    const date = form.date.value;
    const time = form.time.value;

    const isAlphanumeric = /^[a-z0-9 ]+$/i;
    if(!produceName || !tonnage || !amountPaid || !buyerName || !salesAgent || !date || !time) {
        return 'All fields are required';
    }
    if (!isAlphanumeric.test(produceName) || produceName.length < 2) return 'Produce name must be at least 2 characters and cannot contain special characters';
    if (isNaN(tonnage) || tonnage <= 1000) return 'Tonnage must be greater than or equal 1000 KG';
    if (!amountPaid || isNaN(amountPaid)) return 'Amount Paid must be a valid number ';
    if (buyerName.length < 2) return 'Buyer name must be at least 2 characters';
    if (salesAgent.length < 2 || !salesAgent) return 'Sales agent name is required and must be at least 2 characters';
    if (!date) return 'Date is required';
    if (!time) return 'Time is required';
    return null;
}

function validateCreditSale(form) {
    const buyerName = form.buyerName.value.trim();
    const nationalId = form.nationalId.value.trim();
    const location = form.location.value.trim();
    const contact = form.contact.value.trim();
    const produceName = form.produceName.value.trim();
    const type = form.type.value.trim();
    const tonnage = form.tonnage.value.trim();
    const amountDue = form.amountDue.value.trim();
    const salesAgent = form.salesAgent.value.trim();
    const dueDate = form.dueDate.value;
    const dispatchDate = form.dispatchDate.value;

    const phoneRegex = /^[0-9]{10,15}$/;
    const ninRegex = /^[A-Z0-9]{5,10}$/i;

    if(!buyerName || !nationalId || !location || !contact || !produceName || !type || !tonnage || !amountDue || !salesAgent || !dueDate || !dispatchDate) {
        return 'All fields are required';
    }
    if (buyerName.length < 2) return 'Buyer name must be at least 2 characters';
    if (!ninRegex.test(nationalId)) return 'Invalid National ID';
    if (location.length < 2) return 'Location must be at least 2 characters';
    if (!phoneRegex.test(contact)) return 'Invalid contact number';
    if (produceName.length < 2) return 'Produce name must be at least 2 characters';
    if (type.length < 2) return 'Produce type must be at least 2 characters';
    if (!tonnage || isNaN(tonnage) || tonnage <= 100) return 'Tonnage must be a positive number';
    if (!amountDue || isNaN(amountDue) || amountDue < 1000) return 'Amount due must be at least 1000 UGX';
    if (salesAgent.length < 2) return 'Sales agent name must be at least 2 characters';
    if (!dueDate ) return 'Due date is required';
    if (!dispatchDate || dispatchDate < dueDate) return 'Dispatch date must be on or after due date';
    return null;
}

// ===== Form Submissions =====
if (cashForm) {
    cashForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const error = validateCashSale(cashForm);
        if (error) {
            showToast(error, 'error');
        } else {
            showToast('Cash sale recorded successfully!', 'success');
            cashForm.reset();
        }
    });
}

if (creditForm) {
    creditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const error = validateCreditSale(creditForm);
        if (error) {
            showToast(error, 'error');
        } else {
            showToast('Credit sale recorded successfully!', 'success');
            creditForm.reset();
        }
    });
}
