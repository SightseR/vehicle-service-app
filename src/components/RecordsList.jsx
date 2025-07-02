import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// UPDATED: serviceTypes to match the RegistrationForm
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
    'Rear brake repair', 'Rear brake replacement'
  ]
};

// RecordsList Component
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
      snapshot.forEach((doc) => {
        // Ensure brakePercentages are initialized if missing in old records
        const data = doc.data();
        fetchedRecords.push({
          id: doc.id,
          ...data,
          brakePercentages: data.brakePercentages || { frontLeft: '', frontRight: '', rearLeft: '', rearRight: '' }
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
      // NEW: Copy brakePercentages to edit form data
      brakePercentages: { ...record.brakePercentages }
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
    // Handle nested state for brake percentages
    if (name.startsWith('brakePercentages.')) {
      const brakeField = name.split('.')[1];
      setEditFormData(prev => ({
        ...prev,
        brakePercentages: {
          ...prev.brakePercentages,
          [brakeField]: value
        }
      }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEditServiceChange = (category, index, field) => {
    setEditFormData(prev => {
      const updatedServices = [...prev[category]];
      updatedServices[index] = {
        ...updatedServices[index],
        [field]: !updatedServices[index][field]
      };
      return { ...prev, [category]: updatedServices };
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

  // Function to handle printing a single record with the new A4 stacked layout
  const handlePrintRecord = (record) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups for printing.');
      return;
    }

    const formatDate = (timestamp) => {
      return timestamp?.toDate ? timestamp.toDate().toLocaleDateString() : 'N/A';
    };

    const generateServiceRows = (allServiceTypes, recordServices, type) => {
      let rows = '';
      allServiceTypes[type].forEach(serviceType => {
        const service = recordServices.find(s => s.type === serviceType);
        const doneChecked = service?.done ? 'checked' : '';
        const urgentChecked = service?.urgent ? 'checked' : '';
        const laterChecked = service?.later ? 'checked' : '';

        rows += `
          <tr>
            <td class="service-type">${serviceType}</td>
            <td class="checkbox-cell"><div class="checkbox-square ${doneChecked}"></div></td>
            <td class="checkbox-cell"><div class="checkbox-square ${urgentChecked}"></div></td>
            <td class="checkbox-cell"><div class="checkbox-square ${laterChecked}"></div></td>
          </tr>
        `;
      });
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
              body { font-family: 'Inter', sans-serif; margin: 10mm; font-size: 9pt; color: #333; } /* Reduced margin and font size */
              table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; } /* Reduced margin-bottom */
              th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; font-size: 8.5pt; } /* Reduced padding and font size */
              th { background-color: #f0f0f0; font-weight: bold; }
              .header-title { font-size: 13pt; font-weight: bold; text-align: center; margin-bottom: 10px; } /* Reduced font size and margin */
              .date-box { float: right; border: 1px solid #000; padding: 3px; width: 100px; text-align: center; font-size: 8.5pt; } /* Reduced padding, width, and font size */
              .section-title { font-size: 11pt; font-weight: bold; margin-top: 10px; margin-bottom: 3px; border-bottom: 1px solid #000; padding-bottom: 2px; } /* Reduced font size, margins, and padding */
              .info-table td:first-child { font-weight: bold; width: 90px; } /* Adjusted width */
              .checkbox-cell { text-align: center; width: 35px; } /* Adjusted width */
              .service-type { width: 140px; } /* Adjusted width */
              .radio-option { display: inline-block; margin-right: 8px; } /* Reduced margin */

              /* Custom Checkbox Styling for Print using div */
              .checkbox-square {
                width: 14px; /* Slightly smaller */
                height: 14px; /* Slightly smaller */
                border: 1px solid #000;
                display: inline-block;
                position: relative;
                margin: auto;
              }
              .checkbox-square.checked::after {
                content: "✔";
                color: #000;
                font-size: 12px; /* Adjusted size */
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              }

              /* Custom Radio Button Styling for Print using div with visible content */
              .radio-circle {
                  width: 14px; /* Slightly smaller */
                  height: 14px; /* Slightly smaller */
                  border: 1px solid #000;
                  border-radius: 50%;
                  display: inline-block;
                  position: relative;
                  vertical-align: middle;
                  margin-right: 4px; /* Reduced margin */
              }
              .radio-circle.checked::after {
                  content: '●';
                  font-size: 9px; /* Adjusted size */
                  color: #000;
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  line-height: 1;
              }
              /* NEW: Right align brake percentage values */
              .brake-percentage-cell {
                  text-align: right;
              }


              /* Hide actual form controls in print to avoid conflicts */
              @media print {
                  input[type="checkbox"], input[type="radio"] {
                      display: none;
                  }
                  body { margin: 8mm; } /* Further reduced margin for print */
                  @page { size: A4; margin: 8mm; } /* Further reduced page margin */
                  .header-title { margin-bottom: 8px; }
                  .date-box { margin-top: 0; }
                  .flex-container { display: flex; justify-content: space-between; gap: 3mm; } /* Reduced gap */
                  .flex-item { flex: 1; min-width: 0; } /* Ensure flex items can shrink */
              }
          </style>
      </head>
      <body>
          <div style="overflow: hidden;">
              <div class="header-title" style="float: left; width: calc(100% - 110px);">Vehicle Inspection Report</div>
              <div class="date-box">Date: ${formatDate(record.timestamp)}</div>
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
                      Motive Power:
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'Petrol' ? 'checked' : ''}"></div> Petrol</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'Diesel' ? 'checked' : ''}"></div> Diesel</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'Gas' ? 'checked' : ''}"></div> Gas</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'Hybrid' ? 'checked' : ''}"></div> Hybrid</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'PHEV' ? 'checked' : ''}"></div> PHEV</label>
                      <label class="radio-option"><div class="radio-circle ${record.motivePower === 'HEV' ? 'checked' : ''}"></div> HEV</label>
                  </td>
                  <td colspan="2">
                      Drive Mode:
                      <label class="radio-option"><div class="radio-circle ${record.driveMode === 'Rear' ? 'checked' : ''}"></div> Rear</label>
                      <label class="radio-option"><div class="radio-circle ${record.driveMode === 'Front' ? 'checked' : ''}"></div> Front</label>
                      <label class="radio-option"><div class="radio-circle ${record.driveMode === '4 x 4' ? 'checked' : ''}"></div> 4 x 4</label>
                  </td>
              </tr>
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
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Function to handle downloading all records as CSV
  const handleDownloadAllRecords = () => {
    if (records.length === 0) {
      alert("No records to download.");
      return;
    }

    const headers = [
      "Reg Number", "Brand", "Model", "Year", "Kilometers", "Gearbox",
      "Motive Power", "Drive Mode",
      "Brake Front Left (%)", "Brake Front Right (%)", "Brake Rear Left (%)", "Brake Rear Right (%)",
      "Engine Services", "Chassis Services", "Registered On"
    ];

    const csvRows = [];
    csvRows.push(headers.join(',')); // Add header row

    records.forEach(record => {
      // Helper to format service arrays for CSV
      const formatServicesForCsv = (services) => {
        if (!services || services.length === 0) return '';
        return services.map(s => {
          let status = [];
          if (s.done) status.push('Done');
          if (s.urgent) status.push('Urgent');
          if (s.later) status.push('Later');
          return `"${s.type} (${status.join(', ') || 'Pending'})"`; // Wrap with quotes for commas
        }).join('; '); // Use semicolon to separate multiple services within one cell
      };

      const row = [
        `"${record.regNumber}"`, // Wrap in quotes in case of commas
        `"${record.brand}"`,
        `"${record.model}"`,
        record.year,
        record.kilometers,
        record.gearbox,
        record.motivePower,
        record.driveMode,
        record.brakePercentages.frontLeft || '', // New brake percentages
        record.brakePercentages.frontRight || '',
        record.brakePercentages.rearLeft || '',
        record.brakePercentages.rearRight || '',
        formatServicesForCsv(record.engineServices),
        formatServicesForCsv(record.chassisServices),
        `"${record.timestamp?.toDate ? record.timestamp.toDate().toLocaleString() : 'N/A'}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'vehicle_service_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Helper function to render service checkboxes for editing with better layout
  const renderEditServiceCheckboxes = (category, services) => (
    <div className="flex flex-col space-y-1 p-1 bg-gray-50 rounded-md text-xs"> {/* Reduced padding/margin, smaller text */}
      <h4 className="font-semibold text-gray-700 mb-1">
        {category === 'engineServices' ? 'Engine Status:' : 'Chassis Status:'}
      </h4>
      <div className="grid grid-cols-1 gap-x-2 gap-y-1"> {/* Simplified grid for more vertical stacking */}
        {services.map((service, index) => (
          <div key={index} className="flex flex-col border-b border-gray-200 pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0">
            <span className="font-medium text-gray-800 mb-0.5">{service.type}:</span>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5"> {/* Tighter wrapping for checkboxes */}
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={service.done}
                  onChange={() => handleEditServiceChange(category, index, 'done')}
                  className="form-checkbox h-3.5 w-3.5 text-green-600 rounded focus:ring-green-500" // Smaller checkboxes
                />
                <span className="ml-0.5 text-gray-600">Done</span> {/* Smaller margin */}
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
      {/* New button for downloading all records */}
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
              <th className="py-3 px-6 text-left min-w-[150px]">Brake Percentages</th> {/* NEW HEADER */}
              <th className="py-3 px-6 text-left min-w-[250px]">Engine Services</th>
              <th className="py-3 px-6 text-left min-w-[250px]">Chassis Services</th>
              <th className="py-3 px-6 text-left">Registered On</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {records.map((record) => (
              <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                {/* Registration Number */}
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  {editingRecordId === record.id ? (
                    <input
                      type="text"
                      name="regNumber"
                      value={editFormData.regNumber || ''}
                      onChange={handleEditFormChange}
                      className="w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Model"
                      />
                      <input
                        type="number"
                        name="year"
                        value={editFormData.year || ''}
                        onChange={handleEditFormChange}
                        className="w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-24 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                {/* NEW: Brake Percentages */}
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
                {/* Engine Services (now editable with checkboxes) */}
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
                {/* Chassis Services (now editable with checkboxes) */}
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
                        onClick={() => handleCancelEdit}
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
