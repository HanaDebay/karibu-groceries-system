//alpha numeric validation
exports.isAlphaNumeric = (value, min = 1) => {
  if (value === undefined || value === null) return false;
  return new RegExp(`^[a-zA-Z0-9]{${min},}$`).test(value);
};

//Alphabetic only
exports.isAlphabetic = (value, min = 2) => {
  if (value === undefined || value === null) return false;
  return new RegExp(`^[a-zA-Z]{${min},}$`).test(value);
};

//required field
exports.isRequired = (value) => {
  return value !== undefined && value !== null && value !== "";
};

//numeric minimum check
exports.isNumericMin = (value, min = 1) => {
  return !isNaN(value) && Number(value) >= min;
};

//phone validation
exports.isValidPhone = (phone) => {
  if (!phone) return false;
  // return /^(07|\+256)[0-9]{8,9}$/.test(phone);
  return /^((07[0-9]{8})|(\+256[0-9]{9}))$/.test(phone);
};

//nin validation
exports.isValidNin = (nin) => {
  if (!nin) return false;
  return /^[A-Z]{2}[0-9]{8}[A-Z]{1}$/.test(nin);
};

//branch validation
exports.isValidBranch = (branch) => {
  return ["Maganjo", "Matugga"].includes(branch);
};

exports.validateProcurement = (req, res, next) => {
  const data = req.body;

  if (!exports.isAlphaNumeric(data.produceName))
    return res.status(400).json({ error: "Invalid produce name" });
  if (!exports.isAlphabetic(data.produceType, 2))
    return res.status(400).json({ error: "Invalid produce type" });
  if (!exports.isRequired(data.date))
    return res.status(400).json({ error: "Date required" });
  if (!exports.isNumericMin(data.tonnage, 100))
    return res.status(400).json({ error: "Tonnage must be >=100kg" });
  if (!exports.isNumericMin(data.cost, 10000))
    return res.status(400).json({ error: "Cost too small and cost required" });
  if (!exports.isAlphaNumeric(data.dealerName, 2))
    return res.status(400).json({ error: "Invalid dealer name" });
  if (!exports.isValidBranch(data.branch))
    return res.status(400).json({ error: "Invalid branch" });
  if (!exports.isValidPhone(data.contact))
    return res.status(400).json({ error: "Invalid phone" });
  next();
};

exports.validateCashSales = (req, res, next) => {
  const data = req.body;

  if (!exports.isAlphaNumeric(data.produceName))
    return res.status(400).json({ error: "Invalid Produce Name" });
  if (!exports.isNumericMin(data.tonnage, 1))
    return res.status(400).json({ error: "Invalid Tonnage" });
  if (!exports.isNumericMin(data.amountPaid, 10000))
    return res.status(400).json({ error: "Amount Paid must be at least 10,000 UgX" });
  if (!exports.isAlphaNumeric(data.buyerName, 2))
    return res.status(400).json({ error: "Invalid Buyer Name (min 2 alphanumeric chars)" });
  if (!exports.isAlphaNumeric(data.salesAgent, 2))
    return res.status(400).json({ error: "Invalid Sales Agent Name" });
  if (!exports.isRequired(data.date))
    return res.status(400).json({ error: "Date is required" });
  if (!exports.isRequired(data.time))
    return res.status(400).json({ error: "Time is required" });

  next();
};

exports.validateCreditSales = (req, res, next) => {
  const data = req.body;

  if (!exports.isAlphaNumeric(data.buyerName, 2))
    return res.status(400).json({ error: "Invalid Buyer Name (min 2 alphanumeric chars)" });
  if (!exports.isValidNin(data.nin))
    return res.status(400).json({ error: "Invalid NIN format" });
  if (!exports.isAlphaNumeric(data.location, 2))
    return res.status(400).json({ error: "Invalid Location (min 2 alphanumeric chars)" });
  if (!exports.isValidPhone(data.contact))
    return res.status(400).json({ error: "Invalid Contact format" });
  if (!exports.isNumericMin(data.amountDue, 10000))
    return res.status(400).json({ error: "Amount Due must be at least 10,000 UgX" });
  if (!exports.isAlphaNumeric(data.salesAgent, 2))
    return res.status(400).json({ error: "Invalid Sales Agent Name" });
  if (!exports.isRequired(data.dueDate))
    return res.status(400).json({ error: "Due Date is required" });
  if (!exports.isAlphaNumeric(data.produceName))
    return res.status(400).json({ error: "Invalid Produce Name" });
  if (!exports.isAlphabetic(data.produceType))
    return res.status(400).json({ error: "Invalid Produce Type" });
  if (!exports.isNumericMin(data.tonnage, 1))
    return res.status(400).json({ error: "Invalid Tonnage" });
  if (!exports.isRequired(data.dispatchDate))
    return res.status(400).json({ error: "Dispatch Date is required" });

  next();
};
