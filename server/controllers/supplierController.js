const Supplier = require('../models/Supplier');

exports.getSuppliers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { isActive: true };

    if (search) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ name: reg }, { contactPerson: reg }, { phone: reg }, { email: reg }];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });
    res.json({
      success: true,
      count: suppliers.length,
      suppliers
    });
  } catch (err) {
    next(err);
  }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, email, address, leadTimeDays, medicinesSupplied } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }

    const existing = await Supplier.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A supplier with this name already exists.' });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      contactPerson: contactPerson ? contactPerson.trim() : '',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      leadTimeDays: Number(leadTimeDays) || 5,
      medicinesSupplied: Array.isArray(medicinesSupplied) ? medicinesSupplied : []
    });

    res.status(201).json({
      success: true,
      message: 'Supplier registered successfully.',
      supplier
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully.',
      supplier
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    res.json({
      success: true,
      message: 'Supplier marked inactive.'
    });
  } catch (err) {
    next(err);
  }
};
