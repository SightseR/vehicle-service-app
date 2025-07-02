// src/components/RecordsList.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Import db from firebaseConfig

function RecordsList({ appId, userId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setError('User not authenticated. Cannot fetch records.');
      setLoading(false);
      return;
    }

    const collectionPath = `artifacts/${appId}/public/data/vehicleServices`;
    const q = query(collection(db, collectionPath)); // Removed orderBy to avoid index issues. Data will be sorted in JS.

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecords = [];
      snapshot.forEach((doc) => {
        fetchedRecords.push({ id: doc.id, ...doc.data() });
      });

      // Sort records by timestamp in descending order (newest first)
      fetchedRecords.sort((a, b) => {
        // Handle cases where timestamp might be a Firebase Timestamp object or null/undefined
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

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [appId, userId]); // Re-run effect if appId or userId changes

  if (loading) {
    return <div className="text-center text-gray-700">Loading records...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Error: {error}</div>;
  }

  if (records.length === 0) {
    return <div className="text-center text-gray-700">No records found. Register a service first!</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">All Registered Vehicle Services</h2>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-blue-600 text-white uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left rounded-tl-lg">Reg. No.</th>
              <th className="py-3 px-6 text-left">Brand</th>
              <th className="py-3 px-6 text-left">Model</th>
              <th className="py-3 px-6 text-left">Kilometers</th>
              <th className="py-3 px-6 text-left">Gearbox</th>
              <th className="py-3 px-6 text-left">Motive Power</th>
              <th className="py-3 px-6 text-left">Drive Mode</th>
              <th className="py-3 px-6 text-left">Engine Services</th>
              <th className="py-3 px-6 text-left">Chassis Services</th>
              <th className="py-3 px-6 text-left rounded-tr-lg">Registered On</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {records.map((record) => (
              <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6 text-left whitespace-nowrap">{record.regNumber}</td>
                <td className="py-3 px-6 text-left">{record.brand}</td>
                <td className="py-3 px-6 text-left">{record.model} ({record.year})</td>
                <td className="py-3 px-6 text-left">{record.kilometers} km</td>
                <td className="py-3 px-6 text-left">{record.gearbox}</td>
                <td className="py-3 px-6 text-left">{record.motivePower}</td>
                <td className="py-3 px-6 text-left">{record.driveMode}</td>
                <td className="py-3 px-6 text-left">
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
                </td>
                <td className="py-3 px-6 text-left">
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
                </td>
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleString() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecordsList;