const mongoose = require('mongoose');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Supplier = require('../models/Supplier');
const Transaction = require('../models/Transaction');
const ConsumptionRecord = require('../models/ConsumptionRecord');
const Alert = require('../models/Alert');
const Branch = require('../models/Branch');
const SystemSettings = require('../models/SystemSettings');
const { syncInventoryAlerts } = require('./alertService');

const runManualSeed = async () => {
  console.log('[Seed] Starting manual development seed process...');

  // 1. Ensure system settings exist
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({
      pharmacyName: 'MedStock AI Central Pharmacy',
      tagline: 'Intelligent Inventory & Healthcare Operations',
      address: '101 Medical Enclave, Health City',
      phone: '+91 98765 43210',
      email: 'admin@medstock.ai',
      currencySymbol: '₹',
      taxRatePercent: 12,
      lowStockThresholdUnits: 20,
      criticalStockThresholdUnits: 5,
      nearExpiryThresholdDays: 90,
      criticalExpiryThresholdDays: 30
    });
  }

  // 2. Ensure Main Branch exists
  let branch = await Branch.findOne({ code: 'MAIN' });
  if (!branch) {
    branch = await Branch.create({
      name: 'Central Pharmacy Branch',
      code: 'MAIN',
      address: 'Central Hospital Complex, Ground Floor',
      phone: '+91 98765 43210',
      email: 'central@medstock.ai',
      isMain: true
    });
  }

  // 3. Create Sample Admin & Staff Accounts
  let admin = await User.findOne({ email: 'admin@medstock.ai' });
  if (!admin) {
    admin = await User.create({
      name: 'Dr. Jane Admin',
      email: 'admin@medstock.ai',
      password: 'Admin@123456',
      role: 'admin',
      branch: branch._id,
      phone: '+91 98765 00001',
      isActive: true
    });
    console.log('[Seed] Created default Admin account: admin@medstock.ai / Admin@123456');
  }

  // Ensure Administrator "riya" exists with proper admin role and credentials
  let riyaAdmin = await User.findOne({
    $or: [
      { email: 'riya@medstock.ai' },
      { name: new RegExp('^riya$', 'i') }
    ]
  });
  if (!riyaAdmin) {
    riyaAdmin = await User.create({
      name: 'riya',
      email: 'riya@medstock.ai',
      password: 'Admin@123456',
      role: 'admin',
      branch: branch._id,
      phone: '+91 98765 00003',
      isActive: true
    });
    console.log('[Seed] Created default Administrator account: riya / riya@medstock.ai / Admin@123456');
  } else {
    let modified = false;
    if (riyaAdmin.role !== 'admin') {
      riyaAdmin.role = 'admin';
      modified = true;
    }
    if (!riyaAdmin.isActive) {
      riyaAdmin.isActive = true;
      modified = true;
    }
    if (modified) {
      await riyaAdmin.save();
    }
  }

  let staff = await User.findOne({ email: 'staff@medstock.ai' });
  if (!staff) {
    staff = await User.create({
      name: 'John Pharmacist',
      email: 'staff@medstock.ai',
      password: 'Staff@123456',
      role: 'staff',
      branch: branch._id,
      phone: '+91 98765 00002',
      isActive: true
    });
    console.log('[Seed] Created default Staff account: staff@medstock.ai / Staff@123456');
  }

  // 4. Create Supplier: Test Pharma Supplier (Requirement 50)
  let supplier = await Supplier.findOne({ name: 'Test Pharma Supplier' });
  if (!supplier) {
    supplier = await Supplier.create({
      name: 'Test Pharma Supplier',
      contactPerson: 'Robert Vendor',
      phone: '+91 98111 22334',
      email: 'orders@testpharmasupplier.com',
      address: 'Plot 45, Pharmaceutical Industrial Zone',
      leadTimeDays: 5,
      medicinesSupplied: ['TestParacetamol 500', 'Amoxicillin 500mg', 'Cetirizine 10mg'],
      reliabilityRating: 4.8
    });
    console.log('[Seed] Created Supplier: Test Pharma Supplier');
  }

  // 5. Create Sample Medicine & Batch per Requirement 50:
  // Medicine: TestParacetamol 500
  // Generic: Paracetamol
  // Brand: MedStock Test
  // Strength: 500 mg
  // Dosage: Tablet
  // Manufacturer: MedStock Test Pharma
  // Barcode: MEDTEST001
  // Batch: TEST-B001
  // Manufacturing: 01/09/2026
  // Expiry: 01/09/2028
  // Quantity: 100
  // Purchase Price: ₹1
  // Selling Price: ₹2
  // Minimum Stock: 20
  // Supplier: Test Pharma Supplier
  let med1 = await Medicine.findOne({ barcode: 'MEDTEST001' });
  if (!med1) {
    med1 = await Medicine.create({
      name: 'TestParacetamol 500',
      genericName: 'Paracetamol',
      brand: 'MedStock Test',
      strength: '500 mg',
      dosageForm: 'Tablet',
      manufacturer: 'MedStock Test Pharma',
      barcode: 'MEDTEST001',
      qrCode: 'QR-MEDTEST001',
      category: 'Analgesics',
      unitsPerStrip: 10,
      reorderLevel: 20,
      maximumStock: 500,
      supplier: supplier._id,
      supplierName: supplier.name,
      branch: branch._id
    });

    const batch1 = await Batch.create({
      medicineId: med1._id,
      batchNumber: 'TEST-B001',
      manufacturingDate: new Date('2026-09-01'),
      expiryDate: new Date('2028-09-01'),
      quantity: 100,
      initialQuantity: 100,
      purchasePrice: 1,
      sellingPrice: 2,
      supplierId: supplier._id,
      supplierName: supplier.name,
      branch: branch._id,
      status: 'Active'
    });
    batch1.updateStatus();
    await batch1.save();
    console.log('[Seed] Created TestParacetamol 500 with Batch TEST-B001 per Requirement 50');
  }

  // Also seed a couple of extra realistic items to demonstrate FEFO and Expiry Risk
  // Item 2: Amoxicillin 500mg with two batches (one near expiry, one later) to demonstrate FEFO!
  let med2 = await Medicine.findOne({ barcode: 'MEDAMOX500' });
  if (!med2) {
    med2 = await Medicine.create({
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      brand: 'Amoxil',
      strength: '500 mg',
      dosageForm: 'Capsule',
      manufacturer: 'Apex Healthcare Ltd',
      barcode: 'MEDAMOX500',
      qrCode: 'QR-MEDAMOX500',
      category: 'Antibiotics',
      unitsPerStrip: 10,
      reorderLevel: 30,
      maximumStock: 400,
      supplier: supplier._id,
      supplierName: supplier.name,
      branch: branch._id
    });

    // Batch A: Expiring in 20 days (Critical Near Expiry, FEFO should pick this first!)
    const batchA = await Batch.create({
      medicineId: med2._id,
      batchNumber: 'AMX-2026-A1',
      manufacturingDate: new Date('2025-10-01'),
      expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
      quantity: 25,
      initialQuantity: 50,
      purchasePrice: 4,
      sellingPrice: 8,
      supplierId: supplier._id,
      supplierName: supplier.name,
      branch: branch._id
    });
    batchA.updateStatus();
    await batchA.save();

    // Batch B: Expiring in 18 months
    const batchB = await Batch.create({
      medicineId: med2._id,
      batchNumber: 'AMX-2026-B2',
      manufacturingDate: new Date('2026-06-01'),
      expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000),
      quantity: 120,
      initialQuantity: 120,
      purchasePrice: 4,
      sellingPrice: 8,
      supplierId: supplier._id,
      supplierName: supplier.name,
      branch: branch._id
    });
    batchB.updateStatus();
    await batchB.save();
    console.log('[Seed] Created Amoxicillin 500mg with multi-batch FEFO demo data');
  }

  // Define extra realistic medicines across various categories
  const additionalMedicines = [
    {
      barcode: 'MEDAZEE500',
      name: 'Azithromycin 500mg',
      genericName: 'Azithromycin',
      brand: 'Azee 500',
      strength: '500 mg',
      dosageForm: 'Tablet',
      category: 'Antibiotics',
      manufacturer: 'Cipla Ltd',
      unitsPerStrip: 5,
      unitOfMeasurement: 'Strip',
      prescriptionRequired: true,
      reorderLevel: 25,
      maximumStock: 200,
      batchNumber: 'AZI-2026-01',
      expiryDays: 450,
      quantity: 60,
      purchasePrice: 12,
      sellingPrice: 22
    },
    {
      barcode: 'MEDMET500',
      name: 'Metformin 500mg',
      genericName: 'Metformin Hydrochloride',
      brand: 'Glycomet 500',
      strength: '500 mg',
      dosageForm: 'Tablet',
      category: 'Antidiabetic',
      manufacturer: 'USV Pvt Ltd',
      unitsPerStrip: 20,
      unitOfMeasurement: 'Strip',
      prescriptionRequired: true,
      reorderLevel: 50,
      maximumStock: 600,
      batchNumber: 'MET-2026-11',
      expiryDays: 520,
      quantity: 150,
      purchasePrice: 2.5,
      sellingPrice: 4.5
    },
    {
      barcode: 'MEDPAN040',
      name: 'Pantoprazole 40mg',
      genericName: 'Pantoprazole',
      brand: 'Pan 40',
      strength: '40 mg',
      dosageForm: 'Tablet',
      category: 'Gastrointestinal',
      manufacturer: 'Alkem Laboratories',
      unitsPerStrip: 15,
      unitOfMeasurement: 'Strip',
      prescriptionRequired: false,
      reorderLevel: 30,
      maximumStock: 350,
      batchNumber: 'PAN-2026-08',
      expiryDays: 380,
      quantity: 80,
      purchasePrice: 5,
      sellingPrice: 9
    },
    {
      barcode: 'MEDCET010',
      name: 'Cetirizine 10mg',
      genericName: 'Cetirizine Hydrochloride',
      brand: 'Cetzine 10',
      strength: '10 mg',
      dosageForm: 'Tablet',
      category: 'Antiallergic',
      manufacturer: 'Dr. Reddy’s Laboratories',
      unitsPerStrip: 10,
      unitOfMeasurement: 'Strip',
      prescriptionRequired: false,
      reorderLevel: 40,
      maximumStock: 500,
      batchNumber: 'CET-2026-04',
      expiryDays: 600,
      quantity: 120,
      purchasePrice: 1.8,
      sellingPrice: 3.5
    },
    {
      barcode: 'MEDIBU400',
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      brand: 'Brufen 400',
      strength: '400 mg',
      dosageForm: 'Tablet',
      category: 'Analgesics',
      manufacturer: 'Abbott Healthcare',
      unitsPerStrip: 15,
      unitOfMeasurement: 'Strip',
      prescriptionRequired: false,
      reorderLevel: 30,
      maximumStock: 300,
      batchNumber: 'IBU-2026-09',
      expiryDays: 480,
      quantity: 90,
      purchasePrice: 2.8,
      sellingPrice: 5
    },
    {
      barcode: 'MEDATO010',
      name: 'Atorvastatin 10mg',
      genericName: 'Atorvastatin Calcium',
      brand: 'Atorva 10',
      strength: '10 mg',
      dosageForm: 'Tablet',
      category: 'Cardiovascular',
      manufacturer: 'Zydus Cadila',
      unitsPerStrip: 10,
      unitOfMeasurement: 'Strip',
      prescriptionRequired: true,
      reorderLevel: 25,
      maximumStock: 250,
      batchNumber: 'ATO-2026-15',
      expiryDays: 365,
      quantity: 75,
      purchasePrice: 8,
      sellingPrice: 14
    },
    {
      barcode: 'MEDASC100',
      name: 'Ascoril D+ Cough Syrup 100ml',
      genericName: 'Dextromethorphan + Chlorpheniramine',
      brand: 'Ascoril D+',
      strength: '100 ml',
      dosageForm: 'Syrup',
      category: 'Respiratory',
      manufacturer: 'Glenmark Pharmaceuticals',
      unitsPerStrip: 1,
      unitOfMeasurement: 'Bottle',
      prescriptionRequired: false,
      reorderLevel: 15,
      maximumStock: 100,
      batchNumber: 'ASC-2026-03',
      expiryDays: 300,
      quantity: 40,
      purchasePrice: 55,
      sellingPrice: 85
    },
    {
      barcode: 'MEDLIM500',
      name: 'Vitamin C + Zinc Chewable',
      genericName: 'Ascorbic Acid + Sodium Ascorbate',
      brand: 'Limcee Chewable',
      strength: '500 mg',
      dosageForm: 'Tablet',
      category: 'Vitamins & Supplements',
      manufacturer: 'Abbott India',
      unitsPerStrip: 15,
      unitOfMeasurement: 'Strip',
      prescriptionRequired: false,
      reorderLevel: 50,
      maximumStock: 500,
      batchNumber: 'LIM-2026-07',
      expiryDays: 650,
      quantity: 200,
      purchasePrice: 1.2,
      sellingPrice: 2.5
    },
    {
      barcode: 'MEDOME020',
      name: 'Omeprazole 20mg',
      genericName: 'Omeprazole',
      brand: 'Omez 20',
      strength: '20 mg',
      dosageForm: 'Capsule',
      category: 'Gastrointestinal',
      manufacturer: 'Dr. Reddy’s Laboratories',
      unitsPerStrip: 15,
      unitOfMeasurement: 'Strip',
      prescriptionRequired: false,
      reorderLevel: 30,
      maximumStock: 300,
      batchNumber: 'OME-2026-02',
      expiryDays: 410,
      quantity: 110,
      purchasePrice: 3.2,
      sellingPrice: 6.5
    }
  ];

  for (const item of additionalMedicines) {
    let med = await Medicine.findOne({ barcode: item.barcode });
    if (!med) {
      med = await Medicine.create({
        name: item.name,
        genericName: item.genericName,
        brand: item.brand,
        strength: item.strength,
        dosageForm: item.dosageForm,
        category: item.category,
        manufacturer: item.manufacturer,
        barcode: item.barcode,
        qrCode: `QR-${item.barcode}`,
        unitsPerStrip: item.unitsPerStrip,
        unitOfMeasurement: item.unitOfMeasurement,
        prescriptionRequired: item.prescriptionRequired,
        reorderLevel: item.reorderLevel,
        maximumStock: item.maximumStock,
        supplier: supplier._id,
        supplierName: supplier.name,
        branch: branch._id
      });

      const batch = await Batch.create({
        medicineId: med._id,
        batchNumber: item.batchNumber,
        manufacturingDate: new Date('2026-01-01'),
        expiryDate: new Date(Date.now() + item.expiryDays * 24 * 60 * 60 * 1000),
        quantity: item.quantity,
        initialQuantity: item.quantity,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        supplierId: supplier._id,
        supplierName: supplier.name,
        branch: branch._id,
        status: 'Active'
      });
      batch.updateStatus();
      await batch.save();
      console.log(`[Seed] Created ${item.name} with batch ${item.batchNumber}`);
    }
  }

  // Add historical consumption events over past 7 days for Paracetamol so AI algorithms can show real statistics!
  const existingRecords = await ConsumptionRecord.countDocuments({ medicineId: med1._id });
  if (existingRecords === 0) {
    const historicalLogs = [];
    const now = new Date();

    for (let dayAgo = 7; dayAgo >= 1; dayAgo--) {
      const recordDate = new Date(now.getTime() - dayAgo * 24 * 60 * 60 * 1000);
      const consumedQty = Math.floor(Math.random() * 6) + 8; // 8 to 13 units/day

      const tx = await Transaction.create({
        transactionNumber: `TX-HIST-00${dayAgo}`,
        items: [{
          medicineId: med1._id,
          medicineName: med1.name,
          batchId: (await Batch.findOne({ medicineId: med1._id }))._id,
          batchNumber: 'TEST-B001',
          quantity: consumedQty,
          unitPrice: 2,
          subtotal: consumedQty * 2,
          expiryDate: new Date('2028-09-01')
        }],
        subtotal: consumedQty * 2,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: consumedQty * 2,
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        userId: staff._id,
        staffName: staff.name,
        branchId: branch._id,
        date: recordDate
      });

      historicalLogs.push({
        medicineId: med1._id,
        medicineName: med1.name,
        batchId: (await Batch.findOne({ medicineId: med1._id }))._id,
        batchNumber: 'TEST-B001',
        quantity: consumedQty,
        date: recordDate,
        transactionId: tx._id,
        transactionNumber: tx.transactionNumber,
        userId: staff._id,
        branchId: branch._id
      });
    }

    await ConsumptionRecord.insertMany(historicalLogs);
    console.log(`[Seed] Injected ${historicalLogs.length} days of historical consumption for AI model demo.`);
  }

  // Trigger alert sync
  await syncInventoryAlerts(branch._id);

  console.log('[Seed] Manual development seed completed successfully.');
};

const ensureDefaultAccounts = async () => {
  try {
    let branch = await Branch.findOne({ code: 'MAIN' });
    if (!branch) {
      branch = await Branch.create({
        name: 'Central Pharmacy Branch',
        code: 'MAIN',
        address: 'Central Hospital Complex, Ground Floor',
        phone: '+91 98765 43210',
        email: 'central@medstock.ai',
        isMain: true
      });
    }

    // 1. Ensure master admin exists
    let admin = await User.findOne({ email: 'admin@medstock.ai' });
    if (!admin) {
      admin = await User.create({
        name: 'Dr. Jane Admin',
        email: 'admin@medstock.ai',
        password: 'Admin@123456',
        role: 'admin',
        branch: branch._id,
        phone: '+91 98765 00001',
        isActive: true
      });
      console.log('[Seed] Verified Administrator account: admin@medstock.ai / Admin@123456');
    }

    // 2. Ensure "riya" admin exists
    let riyaAdmin = await User.findOne({
      $or: [
        { email: 'riya@medstock.ai' },
        { name: new RegExp('^riya$', 'i') }
      ]
    });
    if (!riyaAdmin) {
      riyaAdmin = await User.create({
        name: 'riya',
        email: 'riya@medstock.ai',
        password: 'Admin@123456',
        role: 'admin',
        branch: branch._id,
        phone: '+91 98765 00003',
        isActive: true
      });
      console.log('[Seed] Verified Administrator account: riya / riya@medstock.ai / Admin@123456');
    } else {
      let modified = false;
      if (riyaAdmin.role !== 'admin') {
        riyaAdmin.role = 'admin';
        modified = true;
      }
      if (!riyaAdmin.isActive) {
        riyaAdmin.isActive = true;
        modified = true;
      }
      if (modified) {
        await riyaAdmin.save();
      }
    }

    // 3. Ensure staff account exists
    let staff = await User.findOne({ email: 'staff@medstock.ai' });
    if (!staff) {
      staff = await User.create({
        name: 'John Pharmacist',
        email: 'staff@medstock.ai',
        password: 'Staff@123456',
        role: 'staff',
        branch: branch._id,
        phone: '+91 98765 00002',
        isActive: true
      });
      console.log('[Seed] Verified Staff account: staff@medstock.ai / Staff@123456');
    }
  } catch (err) {
    console.error('[Seed] Error in ensureDefaultAccounts:', err.message);
  }
};

module.exports = { runManualSeed, ensureDefaultAccounts };
