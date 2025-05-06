# Ambieye - Ophthalmology Practice Management Solution

<div align="center">
  <img src="https://via.placeholder.com/200x200.png?text=Ambieye" alt="Ambieye Logo" width="200" />
  <p><em>Empowering eye care professionals with intelligent patient management</em></p>
</div>

## 🔍 Overview

Ambieye is a comprehensive dual-application platform designed specifically for ophthalmologists and patients. It consists of two distinct mobile applications: one for doctors and one for patients. The platform streamlines patient management, medical record keeping, and patient-doctor communication through a secure, intuitive interface.

For doctors, the app enables efficient tracking of patient conditions, detailed medical history maintenance, comprehensive visit documentation, and patient query responses—all from their mobile device. For patients, the app provides easy access to their eye care information and includes interactive games designed for vision therapy and assessment.

## 💻 Tech Stack

### Frontend
- **React Native / Expo** - Cross-platform mobile application framework
- **TypeScript** - Type-safe JavaScript for robust code
- **Expo Router** - File-based routing system for seamless navigation
- **React Navigation** - Navigation and screen management
- **React Native Animated Numbers** - Smooth number transitions for statistics
- **Expo Vector Icons** - Rich icon library (Feather, FontAwesome, Ionicons)

### Backend
- **Golang** - High-performance backend server implementation
- **MongoDB** - NoSQL database for flexible data storage
- **RESTful API** - Custom API client with endpoint configuration
- **AsyncStorage** - Local data persistence
- **JWT Authentication** - Secure login and session management

### Development Tools
- **ESLint/Prettier** - Code quality and formatting
- **Git/GitHub** - Version control
- **Expo EAS** - Build and deployment

## ✨ Features

### For Doctors
- **Dashboard Overview** - At-a-glance summary of patients and pending queries
- **Patient Management** - Comprehensive patient profiles with medical histories
- **Visit Records** - Detailed documentation of examinations, treatments, and all necessary clinical details
- **Query Resolution** - Secure communication channel for patient questions
- **Real-time Updates** - Stay updated with patient activities and urgent matters
- **Examination Tools** - Specialized tools for recording ophthalmological data

### For Patients
- **Medical History Access** - View personal eye care records and treatment history
- **Vision Therapy Games** - Interactive games designed for vision assessment and therapy
- **Doctor Communication** - Submit queries and receive responses from doctors
- **Medication Reminders** - Notifications for eye drops and medications
- **Visual Progress Tracking** - Monitor vision improvement over time

### Technical Features
- **Responsive Design** - Optimized for various screen sizes and orientations
- **Offline Support** - Essential functionality available without network connection
- **Pull-to-Refresh** - Easy data synchronization
- **Error Handling** - Graceful error states with recovery options
- **Data Visualization** - Clean presentation of medical information
- **Animation** - Subtle animations for enhanced user experience

## 🏗️ Architecture

Ambieye follows a modular architecture with:

- **Services Layer** - API integration and business logic
- **Hooks Layer** - Reusable state and effect management
- **UI Components** - Reusable visual elements
- **Screens** - Full application views
- **Navigation** - Screen management and routing
- **Utils** - Helper functions and utilities

## 🚀 Getting Started

### Prerequisites
- Golang
- Node.js (v16+)
- npm or yarn
- Expo CLI
- iOS Simulator / Android Emulator or physical device

### Installation

```bash
# Clone the repository
git clone https://github.com/your-organization/ambieye.git
cd ambieye/mobile_client

# Install dependencies
npm install
# or
yarn install

# Start the development server
npx expo start
```

### Running on Device

- **iOS**: Press 'i' in the terminal or scan the QR code using the Camera app
- **Android**: Press 'a' in the terminal or scan the QR code using the Expo Go app

## 📱 Application Screens

- **Authentication** - Secure login for doctors
- **Doctor Dashboard** - Overview of practice metrics and recent activities
- **Patients Dashboard** - Overview of the progress in the eye treatment
- **Patient List** - Complete directory of patients
- **Patient Details** - Comprehensive patient information and medical history
- **Visit Records** - Documentation of patient examinations
- **Query Management** - Patient questions and doctor responses
- **Profile Settings** - Doctor profile and application preferences

## 🔒 Security

- End-to-end encryption for patient data
- Role-based access control
- Secure authentication with token management
- Data privacy compliance features

## 🔄 Workflow

1. Doctor logs in to access their personalized dashboard
2. Dashboard displays summary of patients and pending queries
3. Doctor can review patient details or respond to urgent queries
4. New visit records can be added during patient consultations
5. Patient medical history is accessible for informed decision making
6. Queries can be prioritized and answered securely