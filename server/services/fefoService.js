const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');

/**
 * Previews FEFO (First Expire, First Out) allocation without mutating the database.
 * Used by POS billing to inform cashier exactly which batches will be drawn.
 */
const previewFefoAllocation = async (medicineId, requestedQuantity, branchId = null) => {
  const now = new Date();
  const query = {
    medicineId,
    quantity: { $gt: 0 },
    status: { $nin: ['Expired', 'Quarantined'] },
    expiryDate: { $gt: now }
  };
  if (branchId) {
    query.branch = branchId;
  }

  // Sort strictly by earliest expiry date first (FEFO), then by receipt/creation date
  const batches = await Batch.find(query).sort({ expiryDate: 1, createdAt: 1 });

  let remaining = requestedQuantity;
  const allocations = [];
  let totalAvailable = 0;

  for (const batch of batches) {
    totalAvailable += batch.quantity;
  }

  if (totalAvailable < requestedQuantity) {
    const med = await Medicine.findById(medicineId).select('name');
    throw new Error(
      `Insufficient stock for "${med ? med.name : 'Medicine'}". Requested: ${requestedQuantity}, Available: ${totalAvailable}`
    );
  }

  for (const batch of batches) {
    if (remaining <= 0) break;

    const takeQty = Math.min(batch.quantity, remaining);
    allocations.push({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      allocatedQuantity: takeQty,
      availableBefore: batch.quantity,
      availableAfter: batch.quantity - takeQty,
      expiryDate: batch.expiryDate,
      sellingPrice: batch.sellingPrice,
      purchasePrice: batch.purchasePrice,
      supplierId: batch.supplierId
    });

    remaining -= takeQty;
  }

  return allocations;
};

/**
 * Executes atomic FEFO batch deduction for a medicine sale.
 * Deducts stock from the earliest expiring active batches.
 */
const executeFefoDeduction = async (medicineId, requestedQuantity, branchId = null) => {
  // First verify and compute allocations
  const allocations = await previewFefoAllocation(medicineId, requestedQuantity, branchId);

  // Apply deductions safely
  const updatedBatches = [];
  for (const alloc of allocations) {
    const batch = await Batch.findById(alloc.batchId);
    if (!batch) {
      throw new Error(`Batch ${alloc.batchNumber} was not found during transaction execution.`);
    }

    if (batch.quantity < alloc.allocatedQuantity) {
      throw new Error(
        `Concurrency conflict: Batch ${batch.batchNumber} has insufficient stock (${batch.quantity} available, ${alloc.allocatedQuantity} required). Please refresh cart.`
      );
    }

    batch.quantity -= alloc.allocatedQuantity;
    batch.updateStatus();
    await batch.save();
    updatedBatches.push(batch);
  }

  return { allocations, updatedBatches };
};

module.exports = {
  previewFefoAllocation,
  executeFefoDeduction
};
