const form = document.getElementById("procurementForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  // Collect form data
  const data = {
    produceName: form.produceName.value,
    produceType: form.produceType.value,
    date: form.date.value,
    time: form.time.value,
    tonnage: form.tonnage.value,
    cost: form.cost.value,
    dealerName: form.dealerName.value,
    branch: form.branch.value,
    contact: form.contact.value,
    sellPrice: form.sellPrice.value
  };

  console.log("Procurement Data:", data);

  alert("Procurement record saved successfully! (Check console for data)");

  form.reset();
});
