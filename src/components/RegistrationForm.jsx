import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

function RegistrationForm({ appId, userId, db }) {
  const [formData, setFormData] = useState({
    regNumber: '',
    kilometers: '',
    brand: '',
    model: '',
    year: '',
    gearbox: '',
    motivePower: '',
    driveMode: '',
    engineServices: serviceTypes.engine.map(type => ({ type, done: false, urgent: false, later: false })),
    chassisServices: serviceTypes.chassis.map(type => ({ type, done: false, urgent: false, later: false })),
    // NEW: State for brake percentages
    brakePercentages: {
      frontLeft: '',
      frontRight: '',
      rearLeft: '',
      rearRight: ''
    }
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Handle nested state for brake percentages
    if (name.startsWith('brakePercentages.')) {
      const brakeField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        brakePercentages: {
          ...prev.brakePercentages,
          [brakeField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (category, index, field) => {
    setFormData(prev => {
      const updatedServices = [...prev[category]];
      updatedServices[index] = {
        ...updatedServices[index],
        [field]: !updatedServices[index][field]
      };
      return { ...prev, [category]: updatedServices };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!userId || !db) {
      setMessage('Error: User not authenticated or database not initialized. Please refresh the page.');
      setMessageType('error');
      return;
    }

    try {
      const collectionPath = `artifacts/${appId}/public/data/vehicleServices`;
      const docRef = await addDoc(collection(db, collectionPath), {
        ...formData,
        timestamp: serverTimestamp(),
        userId: userId,
      });
      setMessage('Service registration successful! Document ID: ' + docRef.id);
      setMessageType('success');
      // Reset form data after successful submission
      setFormData({
        regNumber: '',
        kilometers: '',
        brand: '',
        model: '',
        year: '',
        gearbox: '',
        motivePower: '',
        driveMode: '',
        engineServices: serviceTypes.engine.map(type => ({ type, done: false, urgent: false, later: false })),
        chassisServices: serviceTypes.chassis.map(type => ({ type, done: false, urgent: false, later: false })),
        brakePercentages: { // Reset brake percentages
          frontLeft: '',
          frontRight: '',
          rearLeft: '',
          rearRight: ''
        }
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      setMessage('Error saving data: ' + e.message);
      setMessageType('error');
    }
  };

  const renderServiceTable = (category, services) => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-gray-700 mb-3">{category === 'engineServices' ? 'Engine Services' : 'Chassis Services'}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Type</th>
              <th className="py-3 px-6 text-center">Done</th>
              <th className="py-3 px-6 text-center">Urgent</th>
              <th className="py-3 px-6 text-center">Later</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {services.map((service, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6 text-left whitespace-nowrap">{service.type}</td>
                <td className="py-3 px-6 text-center">
                  <input
                    type="checkbox"
                    checked={service.done}
                    onChange={() => handleServiceChange(category, index, 'done')}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="py-3 px-6 text-center">
                  <input
                    type="checkbox"
                    checked={service.urgent}
                    onChange={() => handleServiceChange(category, index, 'urgent')}
                    className="form-checkbox h-5 w-5 text-red-600 rounded focus:ring-red-500"
                  />
                </td>
                <td className="py-3 px-6 text-center">
                  <input
                    type="checkbox"
                    checked={service.later}
                    onChange={() => handleServiceChange(category, index, 'later')}
                    className="form-checkbox h-5 w-5 text-yellow-600 rounded focus:ring-yellow-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Vehicle Inspection Report</h2>

      {message && (
        <div className={`p-3 rounded-lg text-white ${messageType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {message}
        </div>
      )}

      <fieldset className="border border-gray-300 p-4 rounded-lg shadow-sm">
        <legend className="text-lg font-semibold text-gray-700 px-2">Vehicle Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="regNumber" className="block text-sm font-medium text-gray-700">Reg Number</label>
            <input
              type="text"
              id="regNumber"
              name="regNumber"
              value={formData.regNumber}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="kilometers" className="block text-sm font-medium text-gray-700">Kilometers</label>
            <input
              type="number"
              id="kilometers"
              name="kilometers"
              value={formData.kilometers}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700">Brand</label>
            <input
              type="text"
              id="brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700">Model</label>
            <input
              type="text"
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
            <input
              type="number"
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="border border-gray-300 p-4 rounded-lg shadow-sm">
        <legend className="text-lg font-semibold text-gray-700 px-2">Gearbox</legend>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="gearbox"
              value="Auto"
              checked={formData.gearbox === 'Auto'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">Auto</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="gearbox"
              value="Manual"
              checked={formData.gearbox === 'Manual'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">Manual</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="border border-gray-300 p-4 rounded-lg shadow-sm">
        <legend className="text-lg font-semibold text-gray-700 px-2">Motive Power</legend>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="motivePower"
              value="Petrol"
              checked={formData.motivePower === 'Petrol'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">Petrol</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="motivePower"
              value="Diesel"
              checked={formData.motivePower === 'Diesel'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">Diesel</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="motivePower"
              value="Gas"
              checked={formData.motivePower === 'Gas'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">Gas</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="motivePower"
              value="Hybrid"
              checked={formData.motivePower === 'Hybrid'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">Hybrid</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="motivePower"
              value="PHEV"
              checked={formData.motivePower === 'PHEV'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">PHEV</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="motivePower"
              value="HEV"
              checked={formData.motivePower === 'HEV'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">HEV</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="border border-gray-300 p-4 rounded-lg shadow-sm">
        <legend className="text-lg font-semibold text-gray-700 px-2">Drive Mode</legend>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="driveMode"
              value="Rear"
              checked={formData.driveMode === 'Rear'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">Rear</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="driveMode"
              value="Front"
              checked={formData.driveMode === 'Front'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">Front</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="driveMode"
              value="4 x 4"
              checked={formData.driveMode === '4 x 4'}
              onChange={handleRadioChange}
              className="form-radio h-5 w-5 text-blue-600"
              required
            />
            <span className="ml-2 text-gray-700">4 x 4</span>
          </label>
        </div>
      </fieldset>

      

      {renderServiceTable('engineServices', formData.engineServices)}
      {renderServiceTable('chassisServices', formData.chassisServices)}

      {/* NEW: Brake Percentages Table */}
      <fieldset className="border border-gray-300 p-4 rounded-lg shadow-sm">
        <legend className="text-lg font-semibold text-gray-700 px-2">Brake Percentages</legend>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left"></th>
                <th className="py-3 px-6 text-center">Left</th>
                <th className="py-3 px-6 text-center">Right</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6 text-left whitespace-nowrap font-medium">Front</td>
                <td className="py-3 px-6 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      name="brakePercentages.frontLeft"
                      value={formData.brakePercentages.frontLeft}
                      onChange={handleChange}
                      className="w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center"
                      min="0"
                      max="100"
                      placeholder="%"
                    />
                    <span className="ml-2 text-gray-700">%</span>
                  </div>
                </td>
                <td className="py-3 px-6 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      name="brakePercentages.frontRight"
                      value={formData.brakePercentages.frontRight}
                      onChange={handleChange}
                      className="w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center"
                      min="0"
                      max="100"
                      placeholder="%"
                    />
                    <span className="ml-2 text-gray-700">%</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6 text-left whitespace-nowrap font-medium">Rear</td>
                <td className="py-3 px-6 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      name="brakePercentages.rearLeft"
                      value={formData.brakePercentages.rearLeft}
                      onChange={handleChange}
                      className="w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center"
                      min="0"
                      max="100"
                      placeholder="%"
                    />
                    <span className="ml-2 text-gray-700">%</span>
                  </div>
                </td>
                <td className="py-3 px-6 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      name="brakePercentages.rearRight"
                      value={formData.brakePercentages.rearRight}
                      onChange={handleChange}
                      className="w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center"
                      min="0"
                      max="100"
                      placeholder="%"
                    />
                    <span className="ml-2 text-gray-700">%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </fieldset>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
      >
        Register Service
      </button>
    </form>
  );
}

export default RegistrationForm;
