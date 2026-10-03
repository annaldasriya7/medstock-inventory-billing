import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ShoppingCart,
  SwitchCamera,
  Video,
  Volume2,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { createWorker } from 'tesseract.js';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';

// Comprehensive set of standard medicine 1D barcodes and 2D QR codes
const SUPPORTED_BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.ITF
];

// Web Audio API feedback beep on successful detection
const playScanBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz pleasant A5 chime
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Audio context not allowed or unsupported; safe fallback
  }
};

const ScanMedicinePage = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // Mode: 'camera' | 'ocr' | 'manual'
  const [activeTab, setActiveTab] = useState('camera');

  // Camera Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Scanning Feedback State (Requirement 8 & 10)
  const [detectedBarcodeInfo, setDetectedBarcodeInfo] = useState(null);

  // Direct manual barcode input on camera card (Requirement 13)
  const [quickManualBarcode, setQuickManualBarcode] = useState('');

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

  // Cleanup camera scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, []);

  // Stop the Camera Scanner cleanly
  const stopCameraScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('[Scanner Stop Warning]', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsStarting(false);
  }, []);

  // Initialize and start camera scanner
  const startCameraScanner = async (overrideCameraId = null) => {
    if (isStarting || isScanning) return;
    setCameraError('');
    setIsStarting(true);
    isProcessingRef.current = false;

    try {
      // 1. Cleanly stop any previous scanner instance
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
      }

      // 2. Discover available cameras on this device
      let cameras = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
        }
      } catch (enumErr) {
        console.warn('Camera enumeration note:', enumErr);
      }

      // 3. Resolve preferred camera:
      // Priority 1: User's override/selection
      // Priority 2: Back/environment camera (rear camera on mobile phone)
      // Priority 3: First available camera (integrated laptop webcam)
      let targetCameraId = overrideCameraId || selectedCameraId;
      if (!targetCameraId && cameras && cameras.length > 0) {
        const backCamera = cameras.find(c => /back|rear|environment|world/i.test(c.label));
        targetCameraId = backCamera ? backCamera.id : cameras[0].id;
      }
      if (targetCameraId) {
        setSelectedCameraId(targetCameraId);
      }

      // Fallback constraints if camera IDs couldn't be enumerated yet
      const cameraConfig = targetCameraId || { facingMode: 'environment' };

      // 4. Create Html5Qrcode instance with supported formats & native BarcodeDetector if available
      const html5QrCode = new Html5Qrcode('qr-reader', {
        formatsToSupport: SUPPORTED_BARCODE_FORMATS,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      scannerRef.current = html5QrCode;

      // 5. Dynamic scan configuration:
      // Wide rectangular scanning box to easily enclose both wide 1D barcodes and square QR codes
      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const width = Math.min(Math.floor(viewfinderWidth * 0.88), 380);
          const height = Math.min(Math.floor(viewfinderHeight * 0.55), 240);
          return { width: Math.max(width, 240), height: Math.max(height, 140) };
        },
        aspectRatio: 1.0,
        disableFlip: false
      };

      // 6. Start camera stream
      await html5QrCode.start(
        cameraConfig,
        scanConfig,
        (decodedText, decodedResult) => {
          // Atomic guard to stop duplicate rapid detections
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          const formatName = decodedResult?.result?.format?.formatName || 'BARCODE/QR';

          // Requirement 10: Log ONLY barcode detected and format (never sensitive info)
          console.log(`Barcode detected: ${decodedText}`);
          console.log(`Format: ${formatName}`);

          // Sound feedback
          playScanBeep();

          // Set detection feedback banner
          setDetectedBarcodeInfo({
            code: decodedText,
            format: formatName,
            status: 'detected',
            timestamp: new Date().toLocaleTimeString()
          });

          // Stop camera stream to freeze on detection
          stopCameraScanner();

          // Search database for medicine
          handleLookup(decodedText, formatName);
        },
        (errorMessage) => {
          // Frame-by-frame non-match is normal during active scanning; ignore silently
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Camera start error:', err);
      let errorMsg = 'Failed to start camera scanner.';
      if (err.name === 'NotAllowedError' || /permission/i.test(err.message)) {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings to scan medicine barcodes.';
      } else if (err.name === 'NotFoundError' || /not found/i.test(err.message)) {
        errorMsg = 'No camera found on this device. Please connect a webcam or enter the barcode manually below.';
      } else if (err.name === 'NotReadableError' || /in use/i.test(err.message)) {
        errorMsg = 'Camera is currently in use by another application or browser window.';
      } else if (err.name === 'OverconstrainedError') {
        // Fallback retry with basic camera configuration
        try {
          const fallbackCameras = await Html5Qrcode.getCameras();
          if (fallbackCameras && fallbackCameras.length > 0) {
            return startCameraScanner(fallbackCameras[0].id);
          }
        } catch (e) {}
        errorMsg = 'Requested camera resolution or constraints are not supported by this device.';
      } else {
        errorMsg = err.message || errorMsg;
      }
      setCameraError(errorMsg);
      setIsScanning(false);
    } finally {
      setIsStarting(false);
    }
  };

  // Flip/Switch Camera between available devices
  const handleFlipCamera = async () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    await stopCameraScanner();
    await startCameraScanner(nextCamera.id);
  };

  // Perform Medicine Lookup via Barcode or Code (Requirement 4 & 5)
  const handleLookup = async (code, formatName = '') => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim();

    try {
      setLoadingLookup(true);
      setLookupResult(null);

      // Scanning Feedback: transition to 'searching'
      setDetectedBarcodeInfo(prev => ({
        code: cleanCode,
        format: formatName || prev?.format || 'BARCODE',
        status: 'searching'
      }));

      const res = await api.scanLookup(cleanCode);
      setLookupResult(res);

      if (res.found && res.medicine) {
        // Medicine found in database
        setDetectedBarcodeInfo(prev => ({
          ...prev,
          status: 'found',
          medicineName: res.medicine.name
        }));
      } else {
        // Medicine not found in database (Requirement 6: pre-fill Add Medicine form with detected barcode)
        setDetectedBarcodeInfo(prev => ({
          ...prev,
          status: 'not_found'
        }));
        setRegForm(prev => ({
          ...prev,
          barcode: cleanCode,
          qrCode: cleanCode.startsWith('QR-') ? cleanCode : ''
        }));
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setLookupResult({
        found: false,
        scannedCode: cleanCode,
        message: 'Network or server error during medicine lookup.'
      });
      setDetectedBarcodeInfo(prev => ({
        ...prev,
        status: 'not_found'
      }));
    } finally {
      setLoadingLookup(false);
    }
  };

  // Safe Sample Test Simulator (Requirement 14)
  const handleSimulatorTest = (testCode, format = 'BARCODE') => {
    // Requirement 10: Log ONLY barcode detected and format
    console.log(`Barcode detected: ${testCode}`);
    console.log(`Format: ${format}`);
    playScanBeep();

    setDetectedBarcodeInfo({
      code: testCode,
      format,
      status: 'detected',
      timestamp: new Date().toLocaleTimeString()
    });

    handleLookup(testCode, format);
  };

  // Quick Manual Barcode Submission (Requirement 13)
  const handleQuickManualSubmit = (e) => {
    e.preventDefault();
    if (!quickManualBarcode.trim()) return;
    const code = quickManualBarcode.trim();
    setQuickManualBarcode('');
    handleSimulatorTest(code, 'MANUAL_ENTRY');
  };

  // OCR Processing via Tesseract.js (Package Scanner)
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
    const strengthMatch = text.match(/\b\d+\s*(mg|mcg|ml|g|gm)\b/i);
    const batchMatch = text.match(/(?:batch|b\.?no|lot)[:\s]*([a-z0-9\-_]+)/i);
    const expiryMatch = text.match(/(?:exp|expiry)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{2,4})/i);
    const mfgMatch = text.match(/(?:mfg\.?\s*(?:by)?|manufactured\s*by)[:\s]*([^\n]+)/i);

    let guessedName = lines[0] || 'Scanned Medicine';
    if (guessedName.length > 40) guessedName = guessedName.slice(0, 40);

    let dosage = 'Tablet';
    if (/capsule/i.test(text)) dosage = 'Capsule';
    else if (/syrup|suspension|oral solution/i.test(text)) dosage = 'Syrup';
    else if (/injection/i.test(text)) dosage = 'Injection';
    else if (/ointment|cream/i.test(text)) dosage = 'Ointment';
    else if (/drops/i.test(text)) dosage = 'Drops';

    let expFormatted = '';
    if (expiryMatch && expiryMatch[1]) {
      const parts = expiryMatch[1].split(/[\/\-\.]/);
      if (parts.length === 2) {
        const m = parts[0].padStart(2, '0');
        const y = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
        expFormatted = `${y}-${m}-28`;
      } else if (parts.length === 3) {
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

    handleLookup(guessedName, 'OCR_TEXT');
  };

  // Submit New Medicine Registration (Scenario C & Requirement 6)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createMedicine(regForm);
      setShowRegisterModal(false);
      handleLookup(res.medicine.name, 'REGISTERED');
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
      handleLookup(lookupResult.medicine.name, 'BATCH_UPDATED');
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
            Identify medicines via camera Barcode / QR, package OCR, or manual search.
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
            <span>Barcode / QR Scanner</span>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Live Camera Scanner
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800">
                    EAN-13 • UPC • Code 128 • QR
                  </span>
                </div>
                {isScanning && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Scanning
                  </span>
                )}
              </div>

              {/* Viewport container with custom reticle */}
              <div className="relative overflow-hidden bg-slate-950 rounded-2xl aspect-square flex flex-col items-center justify-center text-slate-400 border border-slate-800 shadow-inner">
                {/* HTML5 QR code video container */}
                <div id="qr-reader" className="w-full h-full" />

                {/* Live Scanning Guide / Reticle Frame */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Reticle Boundary */}
                    <div className="relative w-4/5 h-1/2 border-2 border-emerald-500/40 rounded-2xl flex items-center justify-center shadow-lg">
                      {/* Laser Barcode Sweep Animation */}
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse" />

                      {/* 4 Corner Markers */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                    </div>

                    <p className="mt-3 text-[11px] font-medium text-emerald-300 bg-slate-900/80 px-3 py-1 rounded-full border border-emerald-500/20 backdrop-blur-xs">
                      Align medicine barcode or QR code inside frame
                    </p>
                  </div>
                )}

                {/* Idle / Start Camera Prompt */}
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-900/95 z-10">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Position Barcode / QR Code</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        Works with laptop webcam or mobile rear camera. Supports EAN-13, EAN-8, UPC, Code 128, Code 39, and QR.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startCameraScanner()}
                      disabled={isStarting}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      <span>{isStarting ? 'Starting Camera...' : 'Start Camera Scanner'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Controls Bar */}
              <div className="flex items-center gap-2">
                {isScanning ? (
                  <button
                    type="button"
                    onClick={stopCameraScanner}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Stop Camera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCameraScanner()}
                    disabled={isStarting}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Turn On Camera</span>
                  </button>
                )}

                {availableCameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
                    title="Switch camera device"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span>Switch Camera</span>
                  </button>
                )}
              </div>

              {/* Error Message */}
              {cameraError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Camera Notification</span>
                  </div>
                  <p className="text-[11px] text-amber-700">{cameraError}</p>
                </div>
              )}

              {/* Requirement 13: Quick Manual Barcode Fallback Input */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Manual Barcode Input (Fallback)
                </span>
                <form onSubmit={handleQuickManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter barcode manually (e.g. 8901234567890)"
                    value={quickManualBarcode}
                    onChange={(e) => setQuickManualBarcode(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!quickManualBarcode.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors"
                  >
                    Search
                  </button>
                </form>
              </div>

              {/* Requirement 14: Safe Quick Test Barcodes (Simulator) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Test Simulator</span>
                  </span>
                  <span className="text-[10px] text-slate-400">One-click test</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSimulatorTest('MEDTEST001', 'CODE_128')}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-200 transition-colors"
                    title="Test Paracetamol 500 (Pre-seeded in MedStock AI)"
                  >
                    MEDTEST001 (Known)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatorTest('MEDAMOX500', 'CODE_128')}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-200 transition-colors"
                    title="Test Amoxicillin 500mg (Pre-seeded in MedStock AI)"
                  >
                    MEDAMOX500 (Known)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatorTest('8901234567890', 'EAN_13')}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-amber-100/70 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors"
                    title="Test Sample EAN-13 Barcode (Unknown, prompts Add Medicine form)"
                  >
                    8901234567890 (Unknown)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatorTest('QR-MEDTEST001', 'QR_CODE')}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-purple-100/70 text-purple-800 border border-purple-300 rounded-lg hover:bg-purple-200 transition-colors"
                    title="Test Sample QR Code"
                  >
                    QR-MEDTEST001 (QR)
                  </button>
                </div>
              </div>
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
                  handleLookup(manualCode, 'MANUAL');
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
          {/* Requirement 8: Explicit Scanning Feedback Banner */}
          {detectedBarcodeInfo && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                detectedBarcodeInfo.status === 'found'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : detectedBarcodeInfo.status === 'not_found'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                      detectedBarcodeInfo.status === 'found'
                        ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                        : detectedBarcodeInfo.status === 'not_found'
                        ? 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-600 border-blue-500/30'
                    }`}
                  >
                    {detectedBarcodeInfo.status === 'found' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : detectedBarcodeInfo.status === 'not_found' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        ✓ Barcode detected
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white rounded border border-slate-200 text-slate-600">
                        {detectedBarcodeInfo.format}
                      </span>
                    </div>

                    <p className="text-base font-mono font-extrabold text-slate-900">
                      {detectedBarcodeInfo.code}
                    </p>

                    {detectedBarcodeInfo.status === 'searching' && (
                      <p className="text-xs text-blue-700 font-semibold flex items-center gap-1.5 pt-0.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Searching medicine...</span>
                      </p>
                    )}

                    {detectedBarcodeInfo.status === 'found' && (
                      <div className="pt-0.5">
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          ✓ Medicine found: <span className="underline font-extrabold">{detectedBarcodeInfo.medicineName}</span>
                        </span>
                      </div>
                    )}

                    {detectedBarcodeInfo.status === 'not_found' && (
                      <div className="pt-1 space-y-2">
                        <p className="text-xs font-semibold text-amber-800">
                          Medicine not found. Add this medicine to MedStock AI?
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowRegisterModal(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Add Medicine to MedStock AI</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDetectedBarcodeInfo(null);
                    setLookupResult(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Query in progress placeholder */}
          {loadingLookup && !detectedBarcodeInfo && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Querying central medicine catalog...</p>
            </div>
          )}

          {/* SCENARIO 1: Existing Medicine Found (Requirement 4 & 5) */}
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
                  {lookupResult.batches && lookupResult.batches.length > 0 ? (
                    lookupResult.batches.map((b) => (
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
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No active batches currently in stock for this medicine.
                    </div>
                  )}
                </div>
              </div>

              {/* Actions: Add to Cart / Add New Batch */}
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
                  <span>Add New Batch</span>
                </button>
              </div>
            </div>
          )}

          {/* SCENARIO 2: New Medicine Detected / Not Found in DB (Requirement 4 & 6) */}
          {!loadingLookup && lookupResult && !lookupResult.found && (
            <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">Medicine Not Found in MedStock AI</h2>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                The barcode <span className="font-mono font-bold text-slate-800">"{lookupResult.scannedCode}"</span> is not currently registered in the database. Complete the registration form below to add it to your inventory catalog.
              </p>

              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Open Registration Form (Barcode Pre-filled)</span>
              </button>
            </div>
          )}

          {/* Idle Placeholder */}
          {!loadingLookup && !lookupResult && !detectedBarcodeInfo && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400 space-y-2">
              <Boxes className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-700">Waiting for Barcode Scan</p>
              <p className="text-xs max-w-sm mx-auto text-slate-400">
                Point your webcam or mobile camera at any medicine barcode or QR code to automatically identify it in MedStock AI.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* NEW MEDICINE REGISTRATION MODAL (Requirement 6) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register New Medicine</h3>
                <p className="text-xs text-slate-500">
                  Barcode <span className="font-mono font-bold text-emerald-600">{regForm.barcode}</span> has been automatically pre-filled.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Barcode (Pre-filled) */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Barcode / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.barcode}
                    onChange={(e) => setRegForm({ ...regForm, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol 500mg"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Generic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol"
                    value={regForm.genericName}
                    onChange={(e) => setRegForm({ ...regForm, genericName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Dolo, Calpol"
                    value={regForm.brand}
                    onChange={(e) => setRegForm({ ...regForm, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
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
                    <option value="Gastrointestinal">Gastrointestinal</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dosage Form</label>
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
                  <label className="font-semibold text-slate-700 block mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 mg, 10 ml"
                    value={regForm.strength}
                    onChange={(e) => setRegForm({ ...regForm, strength: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Sun Pharma, Cipla"
                    value={regForm.manufacturer}
                    onChange={(e) => setRegForm({ ...regForm, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Supplier</label>
                  <select
                    value={regForm.supplier}
                    onChange={(e) => setRegForm({ ...regForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Supplier (Optional)</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Reorder Level (Units)</label>
                  <input
                    type="number"
                    min="1"
                    value={regForm.reorderLevel}
                    onChange={(e) => setRegForm({ ...regForm, reorderLevel: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Initial Batch Information (Requirement 6) */}
              <div className="pt-3 border-t border-slate-100">
                <span className="font-bold text-slate-700 block mb-2 uppercase tracking-wider text-[10px]">
                  Initial Batch & Stock Details
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Batch Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BATCH-01"
                      value={regForm.batchNumber}
                      onChange={(e) => setRegForm({ ...regForm, batchNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
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
                    <label className="text-slate-500 block mb-1">Quantity (Units) *</label>
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
                    <label className="text-slate-500 block mb-1">Selling Price / MRP (₹) *</label>
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
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
                >
                  Save & Register Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW BATCH MODAL */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Add Batch to {lookupResult?.medicine?.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewBatchModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
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
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
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
