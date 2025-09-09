import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// serviceTypes
const serviceTypes = {
  engine: [
    'Oil change', 'Oil filter change', 'Air filter change', 'AC filter change',
    'Oil seal replacement', 'Belt replacement', 'Water pump replacement',
    'Thermostat replacement', 'Coolant hose replacement', 'Drive pulley replacement',
    'Engine mount replacement', 'Spark plug replacement', 'Fuel injector repair',
    'Fuel injector replacement', 'Throttle body repair', 'Ignition coil replacement',
    'Fuel pump replacement', 'Timing belt replacement', 'Timing chain replacement'
  ],
  chassis: [
    'Shock absorber replacement', 'Lower arm replacement', 'Rack end replacement',
    'Ball joint replacement', 'Front brake repair', 'Front brake replacement',
    'Rear brake repair', 'Rear brake replacement',
    'Wheel bearing replacement - Front Left side',
    'Wheel bearing replacement - Front right side',
    'Wheel bearing replacement - Rear right side',
    'Wheel bearing replacement - Rear left side'
  ]
};

// RecordsList
function RecordsList({ appId, userId, db }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  useEffect(() => {
    if (!userId || !db) {
      setError('User not authenticated or database not initialized. Cannot fetch records.');
      setLoading(false);
      return;
    }

    const collectionPath = `artifacts/${appId}/public/data/vehicleServices`;
    const q = query(collection(db, collectionPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecords = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedRecords.push({
          id: docSnap.id,
          ...data,
          brakePercentages: data.brakePercentages || { frontLeft: '', frontRight: '', rearLeft: '', rearRight: '' },
          vehicleScanning: Array.isArray(data.vehicleScanning) ? data.vehicleScanning : [{ type: '', done: false, urgent: false, later: false }],
          additionalInfo: data.additionalInfo || ''
        });
      });

      fetchedRecords.sort((a, b) => {
        const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
        const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
        return timeB - timeA;
      });

      setRecords(fetchedRecords);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching records:", err);
      setError("Failed to load records. " + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [appId, userId, db]);

  const handleEdit = (record) => {
    setEditingRecordId(record.id);
    setEditFormData({
      ...record,
      engineServices: record.engineServices ? record.engineServices.map(s => ({ ...s })) : [],
      chassisServices: record.chassisServices ? record.chassisServices.map(s => ({ ...s })) : [],
      brakePercentages: { ...(record.brakePercentages || {}) },
      vehicleScanning: record.vehicleScanning && record.vehicleScanning.length
        ? record.vehicleScanning.map(s => ({ ...s }))
        : [{ type: '', done: false, urgent: false, later: false }],
      additionalInfo: record.additionalInfo || ''
    });
  };

  const handleSave = async (recordId) => {
    if (!db) {
      setError('Database not initialized. Cannot save record.');
      return;
    }
    try {
      const recordRef = doc(db, `artifacts/${appId}/public/data/vehicleServices`, recordId);
      await updateDoc(recordRef, editFormData);
      setEditingRecordId(null);
      setEditFormData({});
      console.log("Record updated successfully!");
    } catch (e) {
      console.error("Error updating document: ", e);
      setError("Failed to update record: " + e.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditFormData({});
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('brakePercentages.')) {
      const brakeField = name.split('.')[1];
      setEditFormData(prev => ({
        ...prev,
        brakePercentages: {
          ...prev.brakePercentages,
          [brakeField]: value
        }
      }));
    } else if (name === 'vehicleScanning[0].type') {
      setEditFormData(prev => ({
        ...prev,
        vehicleScanning: [{ ...prev.vehicleScanning[0], type: value }]
      }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // FIXED: simpler, no double-toggle special-case
  const handleEditServiceChange = (category, index, field) => {
    setEditFormData(prev => {
      const list = Array.isArray(prev[category]) ? [...prev[category]] : [];
      if (!list[index]) return prev;
      list[index] = { ...list[index], [field]: !list[index][field] };
      return { ...prev, [category]: list };
    });
  };

  const handleDeleteClick = (recordId) => {
    setRecordToDelete(recordId);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete || !db) {
      setError('No record selected for deletion or database not initialized.');
      return;
    }
    try {
      const recordRef = doc(db, `artifacts/${appId}/public/data/vehicleServices`, recordToDelete);
      await deleteDoc(recordRef);
      console.log("Record deleted successfully!");
      setShowConfirmModal(false);
      setRecordToDelete(null);
    } catch (e) {
      console.error("Error deleting document: ", e);
      setError("Failed to delete record: " + e.message);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setRecordToDelete(null);
  };

  // Printing a single record with the A4
  const handlePrintRecord = (record) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups for printing.');
      return;
    }

    const formatDate = (timestamp) => {
      return timestamp?.toDate ? timestamp.toDate().toLocaleDateString() : 'N/A';
    };

    const generateServiceRows = (_allServiceTypes, recordServices) => {
      let rows = '';
      const filtered = (recordServices || []).filter(s => s && (s.done || s.urgent || s.later));
      filtered.forEach(service => {
        const doneChecked = service?.done ? 'checked' : '';
        const urgentChecked = service?.urgent ? 'checked' : '';
        const laterChecked = service?.later ? 'checked' : '';
        rows += `
          <tr>
            <td class="service-type">${service.type}</td>
            <td class="checkbox-cell"><div class="checkbox-square ${doneChecked}"></div></td>
            <td class="checkbox-cell"><div class="checkbox-square ${urgentChecked}"></div></td>
            <td class="checkbox-cell"><div class="checkbox-square ${laterChecked}"></div></td>
          </tr>
        `;
      });
      if (!rows.trim()) {
        rows = '<tr><td colspan="4" class="scanning-data-box">No services marked Done/Urgent/Later.</td></tr>';
      }
      return rows;
    };

    const printContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vehicle Inspection Report</title>
          <style>
              body { font-family: 'Inter', sans-serif; margin: 10mm; font-size: 9pt; color: #333; } 
              table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; } 
              th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; font-size: 8.5pt; } 
              th { background-color: #f0f0f0; font-weight: bold; }
              .header-title { font-size: 13pt; font-weight: bold; text-align: center; margin-bottom: 10px; } 
              .date-box { float: right; border: 1px solid #000; padding: 3px; width: 100px; text-align: center; font-size: 8.5pt; } 
              .section-title { font-size: 11pt; font-weight: bold; margin-top: 10px; margin-bottom: 3px; border-bottom: 1px solid #000; padding-bottom: 2px; } 
              .info-table td:first-child { font-weight: bold; width: 90px; } 
              .checkbox-cell { text-align: center; width: 35px; } 
              .service-type { width: 140px; }
              .radio-option { display: inline-block; margin-right: 8px; } 
              .checkbox-square {
                width: 14px; 
                height: 14px; 
                border: 1px solid #000;
                display: inline-block;
                position: relative;
                margin: auto;
              }
              .checkbox-square.checked::after {
                content: "✔";
                color: #000;
                font-size: 12px; 
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              }
              .radio-circle {
                  width: 14px; 
                  height: 14px; 
                  border: 1px solid #000;
                  border-radius: 50%;
                  display: inline-block;
                  position: relative;
                  vertical-align: middle;
                  margin-right: 4px; 
              }
              .radio-circle.checked::after {
                  content: '●';
                  font-size: 9px; 
                  color: #000;
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  line-height: 1;
              }
              .brake-percentage-cell { text-align: right; }
              .scanning-data-box { border: 1px solid #000; padding: 5px; min-height: 50px; }

              @media print {
                  input[type="checkbox"], input[type="radio"] { display: none; }
                  body { margin: 8mm; } 
                  @page { size: A4; margin: 8mm; } 
                  .header-title { margin-bottom: 8px; }
                  .date-box { margin-top: 0; }
                  .flex-container { display: flex; justify-content: space-between; gap: 3mm; } 
                  .flex-item { flex: 1; min-width: 0; } 
              }
          </style>
      </head>
      <body>
          <div style="overflow: hidden;">
              <div class="header-title" style="float: left; width: calc(100% - 110px);">Vehicle Inspection Report</div>
              <div class="date-box">Printed: ${formatDate(record.timestamp)}</div>
          </div>
          <div style="clear: both;"></div>

          <div class="section-title">Vehicle Information</div>
          <table>
              <tr>
                  <td>Reg Number</td><td>${record.regNumber}</td>
                  <td>Kilometers</td><td>${record.kilometers}</td>
              </tr>
              <tr>
                  <td>Brand</td><td>${record.brand}</td>
                  <td>Model</td><td>${record.model}</td>
              </tr>
              <tr>
                  <td>Year</td><td>${record.year}</td>
                  <td colspan="2">
                      Gearbox:
                      <label class="radio-option">
                        <div class="radio-circle ${record.gearbox === 'Auto' ? 'checked' : ''}"></div> Auto
                      </label>
                      <label class="radio-option">
                        <div class="radio-circle ${record.gearbox === 'Manual' ? 'checked' : ''}"></div> Manual
                      </label>
                  </td>
              </tr>
              <tr>
                  <td colspan="2">
                      Motive Power: <br>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'Petrol' ? 'checked' : ''}"></div> Petrol</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'Diesel' ? 'checked' : ''}"></div> Diesel</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'Gas' ? 'checked' : ''}"></div> Gas</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'Hybrid' ? 'checked' : ''}"></div> Hybrid</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'PHEV' ? 'checked' : ''}"></div> PHEV</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'HEV' ? 'checked' : ''}"></div> HEV</label>
                  </td>
                  <td colspan="2">
                      Drive Mode: <br>
                      <label class="radio-option"><div class="radio-circle ${record.driveMode === 'Rear' ? 'checked' : ''}"></div> Rear</label>
                      <label class="radio-option"><div class="radio-circle ${record.driveMode === 'Front' ? 'checked' : ''}"></div> Front</label>
                      <label class="radio-option"><div class="radio-circle ${record.driveMode === '4 x 4' ? 'checked' : ''}"></div> 4 x 4</label>
                  </td>
              </tr>
          </table>

          <div class="section-title">Vehicle Scanning Data</div>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th class="checkbox-cell">Done</th>
                <th class="checkbox-cell">Urgent</th>
                <th class="checkbox-cell">Later</th>
              </tr>
            </thead>
            <tbody>
              ${record.vehicleScanning && record.vehicleScanning.length > 0 ? `
                <tr>
                  <td class="service-type">${record.vehicleScanning[0].type}</td>
                  <td class="checkbox-cell"><div class="checkbox-square ${record.vehicleScanning[0].done ? 'checked' : ''}"></div></td>
                  <td class="checkbox-cell"><div class="checkbox-square ${record.vehicleScanning[0].urgent ? 'checked' : ''}"></div></td>
                  <td class="checkbox-cell"><div class="checkbox-square ${record.vehicleScanning[0].later ? 'checked' : ''}"></div></td>
                </tr>
              ` : '<tr><td colspan="4" class="scanning-data-box">N/A</td></tr>'}
            </tbody>
          </table>

          <div class="flex-container">
              <div class="flex-item">
                  <div class="section-title">Engine Services</div>
                  <table>
                      <thead>
                          <tr>
                              <th>Type</th>
                              <th class="checkbox-cell">Done</th>
                              <th class="checkbox-cell">Urgent</th>
                              <th class="checkbox-cell">Later</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${generateServiceRows(serviceTypes, record.engineServices, 'engine')}
                      </tbody>
                  </table>
              </div>
              <div class="flex-item">
                  <div class="section-title">Chassis Services</div>
                  <table>
                      <thead>
                          <tr>
                              <th>Type</th>
                              <th class="checkbox-cell">Done</th>
                              <th class="checkbox-cell">Urgent</th>
                              <th class="checkbox-cell">Later</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${generateServiceRows(serviceTypes, record.chassisServices, 'chassis')}
                      </tbody>
                  </table>
              </div>
          </div>

          <div class="section-title">Brake Percentages</div>
          <table>
              <thead>
                  <tr>
                      <th></th>
                      <th class="brake-percentage-cell">Left</th>
                      <th class="brake-percentage-cell">Right</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td>Front</td>
                      <td class="brake-percentage-cell">${record.brakePercentages.frontLeft || ''}%</td>
                      <td class="brake-percentage-cell">${record.brakePercentages.frontRight || ''}%</td>
                  </tr>
                  <tr>
                      <td>Rear</td>
                      <td class="brake-percentage-cell">${record.brakePercentages.rearLeft || ''}%</td>
                      <td class="brake-percentage-cell">${record.brakePercentages.rearRight || ''}%</td>
                  </tr>
              </tbody>
          </table>

          <h3 class="section-title">Services Completed / Additional Information</h3>
          <table class="info-table">
              <tbody>
                  <tr>
                      <td>${record.additionalInfo ? record.additionalInfo.replace(/\\n/g, '<br>') : ''}</td>
                  </tr>
              </tbody>
          </table>

          <div style="margin-top: 20mm;">
              <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                  <span>Date: ____________________</span>
                  <span>Signature: ______________________________</span>
              </div>
          </div>
    
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Downloading all records as CSV (ALL data as columns)
  const handleDownloadAllRecords = () => {
    if (records.length === 0) {
      alert("No records to download.");
      return;
    }

    const headers = [
      "Document ID",
      "User ID",
      "Reg Number",
      "Brand",
      "Model",
      "Year",
      "Kilometers",
      "Gearbox",
      "Motive Power",
      "Drive Mode",
      "Brake Front Left (%)",
      "Brake Front Right (%)",
      "Brake Rear Left (%)",
      "Brake Rear Right (%)",
      "Scanning Type",
      "Scanning Done",
      "Scanning Urgent",
      "Scanning Later",
      "Engine Services",
      "Chassis Services",
      "Additional Information",
      "Registered On"
    ];

    const csvEscape = (v) => {
      if (v === null || v === undefined) return '""';
      const s = String(v).replace(/"/g, '""'); // escape double quotes
      return `"${s}"`; // wrap every cell in quotes
    };

    const formatServicesForCsv = (services) => {
      if (!services || services.length === 0) return '';
      return services
        .map((s) => {
          const status = [];
          if (s.done) status.push('Done');
          if (s.urgent) status.push('Urgent');
          if (s.later) status.push('Later');
          return `${s.type} (${status.join(', ') || 'Pending'})`;
        })
        .join('; ');
    };

    const rows = records.map((record) => {
      const scan = (record.vehicleScanning && record.vehicleScanning[0]) || {
        type: '',
        done: false,
        urgent: false,
        later: false,
      };

      const row = [
        record.id || '',
        record.userId || '',
        record.regNumber || '',
        record.brand || '',
        record.model || '',
        record.year ?? '',
        record.kilometers ?? '',
        record.gearbox || '',
        record.motivePower || '',
        record.driveMode || '',
        record.brakePercentages?.frontLeft ?? '',
        record.brakePercentages?.frontRight ?? '',
        record.brakePercentages?.rearLeft ?? '',
        record.brakePercentages?.rearRight ?? '',
        scan.type || '',
        scan.done ? 'Yes' : 'No',
        scan.urgent ? 'Yes' : 'No',
        scan.later ? 'Yes' : 'No',
        formatServicesForCsv(record.engineServices),
        formatServicesForCsv(record.chassisServices),
        record.additionalInfo || '',
        record.timestamp?.toDate
          ? record.timestamp.toDate().toLocaleString()
          : record.timestamp || ''
      ];

      return row.map(csvEscape).join(',');
    });

    const csvString = [headers.map(csvEscape).join(','), ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vehicle_service_records_full.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  // ----- EDIT UI helpers -----

  // service checkboxes (+ scanning type input when category is 'vehicleScanning')
  const renderEditServiceCheckboxes = (category, services) => (
    <div className="flex flex-col space-y-1 p-1 bg-gray-50 rounded-md text-xs">
      <h4 className="font-semibold text-gray-700 mb-1">
        {category === 'engineServices' ? 'Engine Status:' : category === 'chassisServices' ? 'Chassis Status:' : 'Scanning Status:'}
      </h4>
      <div className="grid grid-cols-1 gap-x-2 gap-y-1">
        {services.map((service, index) => (
          <div key={index} className="flex flex-col border-b border-gray-200 pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0">
            {category === 'vehicleScanning' && index === 0 ? (
              <div className="mb-1">
                <label className="block text-gray-700 text-xs font-medium mb-0.5">Type</label>
                <input
                  type="text"
                  name={'vehicleScanning[0].type'}
                  value={services[0]?.type || ''}
                  onChange={handleEditFormChange}
                  className="w-full p-1 border border-gray-300 rounded-md text-xs"
                  placeholder="Enter scanning item (e.g., ABS, OBD scan)"
                />
              </div>
            ) : (
              <span className="font-medium text-gray-800 mb-0.5">{service.type}:</span>
            )}

            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={service.done}
                  onChange={() => handleEditServiceChange(category, index, 'done')}
                  className="form-checkbox h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500"
                />
                <span className="ml-0.5 text-gray-600">Done</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={service.urgent}
                  onChange={() => handleEditServiceChange(category, index, 'urgent')}
                  className="form-checkbox h-3.5 w-3.5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="ml-0.5 text-gray-600">Urgent</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={service.later}
                  onChange={() => handleEditServiceChange(category, index, 'later')}
                  className="form-checkbox h-3.5 w-3.5 text-yellow-600 rounded focus:ring-yellow-500"
                />
                <span className="ml-0.5 text-gray-600">Later</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ----- RENDER -----

  if (loading) {
    return <div className="text-center text-gray-700 py-8">Loading records...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 py-8">Error: {error}</div>;
  }

  if (records.length === 0) {
    return <div className="text-center text-gray-700 py-8">No records found. Register a service first!</div>;
  }

  return (
    <div className="relative">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">All Registered Vehicle Services</h2>

      <button
        onClick={handleDownloadAllRecords}
        className="mb-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
      >
        Download All Records (CSV)
      </button>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-blue-600 text-white uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Reg. No.</th>
              <th className="py-3 px-6 text-left">Brand</th>
              <th className="py-3 px-6 text-left">Model (Year)</th>
              <th className="py-3 px-6 text-left">Kilometers</th>
              <th className="py-3 px-6 text-left">Gearbox</th>
              <th className="py-3 px-6 text-left">Motive Power</th>
              <th className="py-3 px-6 text-left">Drive Mode</th>
              <th className="py-3 px-6 text-left min-w-[150px]">Brake Percentages</th>
              <th className="py-3 px-6 text-left min-w-[150px]">Scanning Data</th>
              <th className="py-3 px-6 text-left min-w-[220px]">Services Completed / Additional Information</th>
              <th className="py-3 px-6 text-left min-w-[250px]">Engine Services</th>
              <th className="py-3 px-6 text-left min-w-[250px]">Chassis Services</th>
              <th className="py-3 px-6 text-left">Registered On</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="text-gray-700 text-sm font-light">
            {records.map((record) => (
              <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                {/* Reg Num */}
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  {editingRecordId === record.id ? (
                    <input
                      type="text"
                      name="regNumber"
                      value={editFormData.regNumber || ''}
                      onChange={handleEditFormChange}
                      className="w-full sm:w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    record.regNumber
                  )}
                </td>

                {/* Brand */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    <input
                      type="text"
                      name="brand"
                      value={editFormData.brand || ''}
                      onChange={handleEditFormChange}
                      className="w-full sm:w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    record.brand
                  )}
                </td>

                {/* Model (Year) */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    <div className="flex flex-col space-y-1">
                      <input
                        type="text"
                        name="model"
                        value={editFormData.model || ''}
                        onChange={handleEditFormChange}
                        className="w-full sm:w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Model"
                      />
                      <input
                        type="number"
                        name="year"
                        value={editFormData.year || ''}
                        onChange={handleEditFormChange}
                        className="w-full sm:w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Year"
                      />
                    </div>
                  ) : (
                    `${record.model} (${record.year})`
                  )}
                </td>

                {/* Kilometers */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    <input
                      type="number"
                      name="kilometers"
                      value={editFormData.kilometers || ''}
                      onChange={handleEditFormChange}
                      className="w-full sm:w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    `${record.kilometers} km`
                  )}
                </td>

                {/* Gearbox */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    <select
                      name="gearbox"
                      value={editFormData.gearbox || ''}
                      onChange={handleEditFormChange}
                      className="w-full sm:w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="Auto">Auto</option>
                      <option value="Manual">Manual</option>
                    </select>
                  ) : (
                    record.gearbox
                  )}
                </td>

                {/* Motive Power */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    <select
                      name="motivePower"
                      value={editFormData.motivePower || ''}
                      onChange={handleEditFormChange}
                      className="w-full sm:w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Gas">Gas</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="PHEV">PHEV</option>
                      <option value="HEV">HEV</option>
                    </select>
                  ) : (
                    record.motivePower
                  )}
                </td>

                {/* Drive Mode */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    <select
                      name="driveMode"
                      value={editFormData.driveMode || ''}
                      onChange={handleEditFormChange}
                      className="w-full sm:w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="Rear">Rear</option>
                      <option value="Front">Front</option>
                      <option value="4 x 4">4 x 4</option>
                    </select>
                  ) : (
                    record.driveMode
                  )}
                </td>

                {/* Brake Percentages */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    <div className="flex flex-col space-y-1 text-center">
                      <div className="flex items-center justify-center">
                        <span className="text-xs font-medium mr-1">FL:</span>
                        <input
                          type="number"
                          name="brakePercentages.frontLeft"
                          value={editFormData.brakePercentages.frontLeft || ''}
                          onChange={handleEditFormChange}
                          className="w-16 p-1 border border-gray-300 rounded-md text-center text-xs"
                          min="0" max="100" placeholder="%"
                        />
                        <span className="ml-1 text-xs">%</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-xs font-medium mr-1">FR:</span>
                        <input
                          type="number"
                          name="brakePercentages.frontRight"
                          value={editFormData.brakePercentages.frontRight || ''}
                          onChange={handleEditFormChange}
                          className="w-16 p-1 border border-gray-300 rounded-md text-center text-xs"
                          min="0" max="100" placeholder="%"
                        />
                        <span className="ml-1 text-xs">%</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-xs font-medium mr-1">RL:</span>
                        <input
                          type="number"
                          name="brakePercentages.rearLeft"
                          value={editFormData.brakePercentages.rearLeft || ''}
                          onChange={handleEditFormChange}
                          className="w-16 p-1 border border-gray-300 rounded-md text-center text-xs"
                          min="0" max="100" placeholder="%"
                        />
                        <span className="ml-1 text-xs">%</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-xs font-medium mr-1">RR:</span>
                        <input
                          type="number"
                          name="brakePercentages.rearRight"
                          value={editFormData.brakePercentages.rearRight || ''}
                          onChange={handleEditFormChange}
                          className="w-16 p-1 border border-gray-300 rounded-md text-center text-xs"
                          min="0" max="100" placeholder="%"
                        />
                        <span className="ml-1 text-xs">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs">
                      <p>Front Left: {record.brakePercentages?.frontLeft || 'N/A'}%</p>
                      <p>Front Right: {record.brakePercentages?.frontRight || 'N/A'}%</p>
                      <p>Rear Left: {record.brakePercentages?.rearLeft || 'N/A'}%</p>
                      <p>Rear Right: {record.brakePercentages?.rearRight || 'N/A'}%</p>
                    </div>
                  )}
                </td>

                {/* Scanning Data */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    renderEditServiceCheckboxes('vehicleScanning', editFormData.vehicleScanning)
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {record.vehicleScanning && record.vehicleScanning.length > 0 && (
                        <li>
                          {record.vehicleScanning[0].type}
                          {record.vehicleScanning[0].done && <span className="text-green-600 ml-2">(Done)</span>}
                          {record.vehicleScanning[0].urgent && <span className="text-red-600 ml-2">(Urgent)</span>}
                          {record.vehicleScanning[0].later && <span className="text-yellow-600 ml-2">(Later)</span>}
                        </li>
                      )}
                      {(!record.vehicleScanning || record.vehicleScanning.length === 0) && <li>N/A</li>}
                    </ul>
                  )}
                </td>

                {/* Additional Information */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    <textarea
                      name="additionalInfo"
                      value={editFormData.additionalInfo || ''}
                      onChange={handleEditFormChange}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md text-xs"
                      placeholder="Add services completed or any extra notes"
                    />
                  ) : (
                    <div className="text-xs whitespace-pre-line">
                      {record.additionalInfo && record.additionalInfo.trim() !== '' ? record.additionalInfo : 'N/A'}
                    </div>
                  )}
                </td>

                {/* Engine Services */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    renderEditServiceCheckboxes('engineServices', editFormData.engineServices)
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {record.engineServices && record.engineServices.map((service, idx) => (
                        <li key={idx}>
                          {service.type}
                          {service.done && <span className="text-green-600 ml-2">(Done)</span>}
                          {service.urgent && <span className="text-red-600 ml-2">(Urgent)</span>}
                          {service.later && <span className="text-yellow-600 ml-2">(Later)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>

                {/* Chassis Services */}
                <td className="py-3 px-6 text-left">
                  {editingRecordId === record.id ? (
                    renderEditServiceCheckboxes('chassisServices', editFormData.chassisServices)
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {record.chassisServices && record.chassisServices.map((service, idx) => (
                        <li key={idx}>
                          {service.type}
                          {service.done && <span className="text-green-600 ml-2">(Done)</span>}
                          {service.urgent && <span className="text-red-600 ml-2">(Urgent)</span>}
                          {service.later && <span className="text-yellow-600 ml-2">(Later)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>

                {/* Registered On */}
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleString() : 'N/A'}
                </td>

                {/* Actions */}
                <td className="py-3 px-6 text-center whitespace-nowrap">
                  {editingRecordId === record.id ? (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleSave(record.id)}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-200"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(record.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-200"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handlePrintRecord(record)}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-200"
                      >
                        Print
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this record? This action cannot be undone.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
              >
                Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordsList;
