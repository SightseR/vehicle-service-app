# Vehicle Service App

## Overview

The **Vehicle Service App** is a web application built with **React** and **Firebase** to manage vehicle service records. Users can register vehicle inspections, view and manage records, print service details as A4-sized PDFs, and download all records as a CSV file. It's ideal for automotive service centers or individual vehicle owners looking to keep track of service history.

---

## Features

- **Register Vehicle Service**  
  Input vehicle details (e.g., registration number, brand, model, year, kilometers, gearbox, motive power, drive mode), engine/chassis services with statuses (Done, Urgent, Later), and brake percentages.

- **View Records**  
  Display all registered services in a table with options to edit, delete, or print individual records.

- **Edit Records**  
  Modify existing vehicle service records.

- **Delete Records**  
  Remove records with confirmation to prevent accidental deletion.

- **Print Records**  
  Generate an A4 printable PDF report for each service entry.

- **Download All Records**  
  Export all service records as a CSV file.

- **Real-time Data Sync**  
  Uses Firebase Firestore for real-time data updates.

- **Anonymous Authentication**  
  Supports anonymous sign-in or custom token auth via Firebase.

---

## Technologies Used

- **React** – Frontend framework  
- **Firebase**
  - Firestore – Real-time NoSQL database
  - Authentication – Anonymous or custom token-based
- **Tailwind CSS** – Styling  
- **Vite** – Development & build tool

---

## Project Structure

```
vehicle-service-app/
├── src/
│   ├── components/
│   │   ├── RegistrationForm.jsx    # Form for new services
│   │   └── RecordsList.jsx         # List & manage existing records
│   ├── App.jsx                     # Main app with Firebase init
│   ├── firebaseConfig.js           # Firebase config
│   ├── main.jsx                    # App entry point
│   ├── index.css                   # Tailwind styles
│   └── vite.config.js              # Vite config
├── .env                            # Firebase credentials
├── package.json                    # Dependencies & scripts
└── README.md                       # This file
```

---

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd vehicle-service-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable **Firestore** and **Authentication** (Anonymous or Custom Token)
   - Add the following in a `.env` file:
     ```env
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
     VITE_FIREBASE_APP_ID=your-app-id
     VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
     ```

4. **Run the Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   App will run at [http://localhost:5173](http://localhost:5173)

5. **Build for Production**
   ```bash
   npm run build
   # or
   yarn build
   ```

---

## Usage

### Register a Service

- Go to **Register Service**
- Fill in vehicle details, select gearbox/motive power/drive mode
- Add engine and chassis services (Done, Urgent, Later)
- Input front/rear brake percentages
- Submit to save to Firestore

### View & Manage Records

- Go to **View Records**
- Use:
  - **Edit** – Modify a record
  - **Delete** – Confirm and remove record
  - **Print** – Generate an A4 PDF report
  - **Download All Records (CSV)** – Export full dataset

### Print a Record

- Click **Print** on any record
- Browser opens print dialog (PDF or direct print supported)

---

## Firebase Firestore Structure

Firestore Path:
```
artifacts/{appId}/public/data/vehicleServices/{documentId}
```

Document Fields:
```json
{
  "regNumber": "ABC123",
  "kilometers": 120000,
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2015,
  "gearbox": "Manual",
  "motivePower": "Petrol",
  "driveMode": "Front",
  "engineServices": [ { "type": "Oil Change", "done": true, ... } ],
  "chassisServices": [ { "type": "Suspension", "urgent": true, ... } ],
  "brakePercentages": {
    "frontLeft": 75,
    "frontRight": 80,
    "rearLeft": 70,
    "rearRight": 65
  },
  "timestamp": <Firestore server timestamp>,
  "userId": "firebase-uid"
}
```

---

## Notes

- Tailwind CSS is configured via `index.css`
- Allow browser pop-ups for printing
- CSV includes services as `"Type (Status)"`
- Canvas environments must pass `__firebase_config` and optionally `__initial_auth_token`

---

## Troubleshooting

| Issue                    | Solution |
|-------------------------|----------|
| Firebase Init Error     | Check `.env` or environment config |
| No Records Displayed    | Ensure Firestore rules allow access and `userId` is correctly set |
| Print Window Blocked    | Allow pop-ups in browser |
| CORS Errors             | Ensure Firebase config and domain setup is correct |

---

## 📄 License

Distributed under the MIT License. © 2025 [Kasun Akalanka](mailto:k3akalanka@gmail.com).
