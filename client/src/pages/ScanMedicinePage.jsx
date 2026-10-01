import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  ScanLine,
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  Upload,
  X,
  Sparkles,
  Boxes,
  ShoppingCart
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { createWorker } from 'tesseract.js';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';

const ScanMedicinePage = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // Mode: 'camera' | 'ocr' | 'manual'
  const [activeTab, setActiveTab] = useState('camera');

  // Camera Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  // OCR state
  const [ocrImage, setOcrImage] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);

  // Search / Scan lookup outcome
  const [lookupResult, setLookupResult] = useState(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Suppliers list for dropdown
  const [suppliers, setSuppliers] = useState([]);

  // Modals: New Medicine Registration & New Batch modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);

  // Registration Form
  const [regForm, setRegForm] = useState({
    name: '',
    genericName: '',
    brand: '',
    category: 'General',
    dosageForm: 'Tablet',
    strength: '',
    manufacturer: '',
    barcode: '',
    qrCode: '',
    unitsPerStrip: 10,
    reorderLevel: 20,
    maximumStock: 500,
    supplier: '',
    // Initial Batch
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    initialQuantity: 100,
    purchasePrice: 10,
    sellingPrice: 15
  });

  // Batch Form (for existing medicine)
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    quantity: 50,
    purchasePrice: 10,
    sellingPrice: 15,
    supplierId: ''
  });

  // Load suppliers on mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await api.getSuppliers();
        setSuppliers(res.suppliers || []);
      } catch (err) {
        console.warn('Failed to load suppliers:', err.message);
      }
    };
    fetchSuppliers();
  }, []);

  // Initialize and clean up Html5Qrcode camera
  const startCameraScanner = async () => {
    setCameraError('');
    setIsScanning(true);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          console.log('[Scanner Decoded]', decodedText);
          stopCameraScanner();
          handleLookup(decodedText);
        },
        (errorMessage) => {
          // ignore frame errors
        }
      );
    } catch (err) {
      console.error('Camera start error:', err);
      setCameraError(err.message || 'Camera permission denied or camera not found on this device.');
      setIsScanning(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // already stopped
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Perform Medicine Lookup via Barcode or Code
  const handleLookup = async (code) => {
    if (!code || !code.trim()) return;
    try {
      setLoadingLookup(true);
      setLookupResult(null);

      const res = await api.scanLookup(code.trim());
      setLookupResult(res);

      if (!res.found) {
        // Pre-fill registration form with the scanned code
        setRegForm(prev => ({
          ...prev,
          barcode: code.trim(),
          qrCode: code.trim().startsWith('QR-') ? code.trim() : ''
        }));
      }
    } catch (err) {
      console.error('Lookup error:', err);
    } finally {
      setLoadingLookup(false);
    }
  };

  // OCR Processing via Tesseract.js (Requirement 9)
  const handleOcrImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrImage(URL.createObjectURL(file));
    setOcrProcessing(true);
    setOcrProgress(0);

    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(file);
      await worker.terminate();

      const text = ret.data.text;
      setOcrRawText(text);

      // Intelligent parser heuristics to extract medicine parameters
      parseOcrTextToForm(text);
    } catch (err) {
      console.error('OCR Error:', err);
    } finally {
      setOcrProcessing(false);
    }
  };

  const parseOcrTextToForm = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Heuristics:
    // Strength regex e.g. 500mg, 100 mg, 10 ml
    const strengthMatch = text.match(/\b\d+\s*(mg|mcg|ml|g|gm)\b/i);
    // Batch number regex e.g. B.No, Batch No, BATCH: ABC-123
    const batchMatch = text.match(/(?:batch|b\.?no|lot)[:\s]*([a-z0-9\-_]+)/i);
    // Expiry date regex e.g. EXP: 10/2027, EXP. 12/28, 01/09/2028
    const expiryMatch = text.match(/(?:exp|expiry)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{2,4})/i);
    // Manufacturer regex e.g. Mfg by, Pharma, Ltd, Laboratories
    const mfgMatch = text.match(/(?:mfg\.?\s*(?:by)?|manufactured\s*by)[:\s]*([^\n]+)/i);

    // Guess medicine name from the largest or prominent line
    let guessedName = lines[0] || 'Scanned Medicine';
    if (guessedName.length > 40) guessedName = guessedName.slice(0, 40);

    // Guess dosage form
    let dosage = 'Tablet';
    if (/capsule/i.test(text)) dosage = 'Capsule';
    else if (/syrup|suspension|oral solution/i.test(text)) dosage = 'Syrup';
    else if (/injection/i.test(text)) dosage = 'Injection';
    else if (/ointment|cream/i.test(text)) dosage = 'Ointment';
    else if (/drops/i.test(text)) dosage = 'Drops';

    // Parse Expiry into YYYY-MM-DD
    let expFormatted = '';
    if (expiryMatch && expiryMatch[1]) {
      const parts = expiryMatch[1].split(/[\/\-\.]/);
      if (parts.length === 2) {
        // MM/YY or MM/YYYY
        const m = parts[0].padStart(2, '0');
        const y = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
        expFormatted = `${y}-${m}-28`;
      } else if (parts.length === 3) {
        // DD/MM/YYYY
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        expFormatted = `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    setRegForm(prev => ({
      ...prev,
      name: guessedName,
      dosageForm: dosage,
      strength: strengthMatch ? strengthMatch[0] : prev.strength,
      batchNumber: batchMatch ? batchMatch[1].toUpperCase() : `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
      expiryDate: expFormatted || '2028-09-01',
      manufacturer: mfgMatch ? mfgMatch[1].trim() : prev.manufacturer
    }));

    // Trigger Lookup to see if this medicine is already in DB
    handleLookup(guessedName);
  };

  // Submit New Medicine Registration (Scenario C)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createMedicine(regForm);
      setShowRegisterModal(false);
      // Reload lookup state with newly created medicine
      handleLookup(res.medicine.name);
    } catch (err) {
      alert(err.message || 'Error registering medicine');
    }
  };

  // Submit New Batch for Existing Medicine (Scenario B or Scenario A)
  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...batchForm,
        medicineId: lookupResult.medicine._id
      };
      await api.createOrUpdateBatch(payload);
      setShowNewBatchModal(false);
      handleLookup(lookupResult.medicine.name);
    } catch (err) {
      alert(err.message || 'Error adding batch');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medicine Scanner & Identification</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify medicines via camera Barcode / QR, OCR package scanning, or search.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('camera');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'camera' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Barcode / QR</span>
          </button>

          <button
            onClick={() => {
              stopCameraScanner();
              setActiveTab('ocr');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'ocr' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>OCR Package Scan</span>
          </button>

          <button
            onClick={() => {
              stopCameraScanner();
              setActiveTab('manual');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search / Manual</span>
          </button>
        </div>
      </div>

      {/* Scanner Views Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanning Interface (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* TAB 1: Camera Barcode/QR */}
          {activeTab === 'camera' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Live Camera Scanner
                </span>
                {isScanning && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Scanning
                  </span>
                )}
              </div>

              {/* Viewport container */}
              <div className="relative overflow-hidden bg-slate-900 rounded-xl aspect-square flex flex-col items-center justify-center text-slate-400">
                <div id="qr-reader" className="w-full h-full" />

                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-900/90">
                    <Camera className="w-12 h-12 text-slate-500 stroke-1" />
                    <p className="text-xs text-slate-300">
                      Position the medicine barcode or QR code in front of your camera.
                    </p>
                    <button
                      onClick={startCameraScanner}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
                    >
                      Start Camera
                    </button>
                  </div>
                )}
              </div>

              {isScanning && (
                <button
                  onClick={stopCameraScanner}
                  className="w-full py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                >
                  Stop Camera
                </button>
              )}

              {cameraError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  {cameraError}
                  <p className="mt-1 text-[11px] text-amber-600">
                    You can also use the "Search / Manual" tab to type a barcode directly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OCR Package Scanner */}
          {activeTab === 'ocr' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  OCR Package Reader (Tesseract.js)
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a photo of medicine packaging to auto-extract Name, Batch, Expiry & Strength.
                </p>
              </div>

              <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-emerald-50/20 text-center">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Upload Package Image</span>
                <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WEBP</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleOcrImageUpload}
                  className="hidden"
                />
              </label>

              {ocrProcessing && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Analyzing packaging text with OCR engine...</span>
                </div>
              )}

              {ocrRawText && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Extracted Raw Text:</p>
                  <p className="text-[11px] text-slate-600 line-clamp-4 font-mono">{ocrRawText}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Search / Manual */}
          {activeTab === 'manual' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Manual Code / Name Search
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Enter barcode string, QR payload, or exact medicine name.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookup(manualCode);
                }}
                className="space-y-3"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. MEDTEST001 or Paracetamol"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingLookup}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
                >
                  {loadingLookup ? 'Looking up...' : 'Search Catalog'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Scan Result & Decision Tree (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {loadingLookup && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Querying central medicine catalog...</p>
            </div>
          )}

          {/* SCENARIO 1: Existing Medicine Found */}
          {!loadingLookup && lookupResult && lookupResult.found && (
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-900">{lookupResult.medicine.name}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lookupResult.medicine.genericName} • {lookupResult.medicine.dosageForm} • {lookupResult.medicine.strength}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-full">
                    {lookupResult.totalStock} units in stock
                  </span>
                </div>
              </div>

              {/* Medicine Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Brand</span>
                  <p className="font-bold text-slate-800">{lookupResult.medicine.brand || 'Generic'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Category</span>
                  <p className="font-bold text-slate-800">{lookupResult.medicine.category}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Reorder Level</span>
                  <p className="font-bold text-slate-800">{lookupResult.medicine.reorderLevel} units</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Barcode</span>
                  <p className="font-bold text-slate-800 font-mono truncate">{lookupResult.medicine.barcode || 'N/A'}</p>
                </div>
              </div>

              {/* Batches Table for this Medicine */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Associated Batches (FEFO Ordering)
                  </h3>
                  <span className="text-[11px] text-slate-500">{lookupResult.batches?.length || 0} batches</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {lookupResult.batches?.map((b) => (
                    <div key={b._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-mono font-bold text-slate-800">{b.batchNumber}</p>
                        <p className="text-[10px] text-slate-400">
                          Expires: {new Date(b.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{b.quantity} units</span>
                        <p className="text-[10px] text-emerald-600">₹{b.sellingPrice?.toFixed(2)}/unit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions: Add to Cart / Add New Batch (Scenario B) */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    addToCart(lookupResult.medicine, 1);
                    navigate('/pos');
                  }}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Sale Cart & Checkout</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNewBatchModal(true)}
                  className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Batch (Scenario B)</span>
                </button>
              </div>
            </div>
          )}

          {/* SCENARIO 2: New Medicine Detected */}
          {!loadingLookup && lookupResult && !lookupResult.found && (
            <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">New Medicine Detected</h2>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                The code <span className="font-mono font-bold text-slate-800">"{lookupResult.scannedCode}"</span> is not registered in the database. Please complete the registration form to add it to the inventory catalog.
              </p>

              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Open Registration Form</span>
              </button>
            </div>
          )}

          {/* Idle Placeholder */}
          {!loadingLookup && !lookupResult && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400 space-y-2">
              <Boxes className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-700">Waiting for Scan</p>
              <p className="text-xs max-w-sm mx-auto text-slate-400">
                Scan a barcode, snap packaging for OCR text extraction, or type a code to identify medicine.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* NEW MEDICINE REGISTRATION MODAL (Scenario C) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">New Medicine Registration</h3>
                <p className="text-xs text-slate-500">Verify extracted OCR information before saving to catalog.</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={regForm.genericName}
                    onChange={(e) => setRegForm({ ...regForm, genericName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={regForm.brand}
                    onChange={(e) => setRegForm({ ...regForm, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Category</label>
                  <select
                    value={regForm.category}
                    onChange={(e) => setRegForm({ ...regForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="General">General</option>
                    <option value="Analgesics">Analgesics (Pain)</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Antipyretics">Antipyretics (Fever)</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Respiratory">Respiratory</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Dosage Form</label>
                  <select
                    value={regForm.dosageForm}
                    onChange={(e) => setRegForm({ ...regForm, dosageForm: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Drops">Drops</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 mg"
                    value={regForm.strength}
                    onChange={(e) => setRegForm({ ...regForm, strength: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Barcode</label>
                  <input
                    type="text"
                    value={regForm.barcode}
                    onChange={(e) => setRegForm({ ...regForm, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={regForm.manufacturer}
                    onChange={(e) => setRegForm({ ...regForm, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Initial Batch Information (Requirement 9 & 10) */}
              <div className="pt-3 border-t border-slate-100">
                <span className="font-bold text-slate-700 block mb-2 uppercase tracking-wider text-[10px]">
                  Initial Batch Details
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Batch Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. B-001"
                      value={regForm.batchNumber}
                      onChange={(e) => setRegForm({ ...regForm, batchNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={regForm.expiryDate}
                      onChange={(e) => setRegForm({ ...regForm, expiryDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Initial Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={regForm.initialQuantity}
                      onChange={(e) => setRegForm({ ...regForm, initialQuantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Selling Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={regForm.sellingPrice}
                      onChange={(e) => setRegForm({ ...regForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  Save & Register Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW BATCH MODAL (Scenario B / A) */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Add Batch to {lookupResult?.medicine?.name}
              </h3>
              <button onClick={() => setShowNewBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Batch Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BATCH-2026-X"
                  value={batchForm.batchNumber}
                  onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={batchForm.expiryDate}
                  onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchForm.quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={batchForm.sellingPrice}
                    onChange={(e) => setBatchForm({ ...batchForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewBatchModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanMedicinePage;
