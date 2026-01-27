# Xogta Qorshaynta

District-level planning and financial data collection system for the Somali Region.

## Features
- **Custom Authentication**: Region -> District login flow.
- **District Dashboard**: Data entry with strict Cash/Bank validation.
- **Admin Dashboard**: Real-time reporting and filtering.
- **Realtime Database**: Firebase backend.

## Prerequisites
- Node.js (v16+)
- NPM

## How to Run

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start Development Server**
    ```bash
    npm run dev
    ```

3.  **Open Browser**
    Navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## Usage
- **First Time**: Click "Initialize Database" on the login screen to seed demo data.
- **Admin Login**: `admin` / `adminpassword`
- **District Login**: Select Region (e.g. Fafan) -> District (e.g. Jigjiga). Password: `password123`.
