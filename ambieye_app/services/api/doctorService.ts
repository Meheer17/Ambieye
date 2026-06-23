import apiClient from "./apiService";
import { API_CONFIG } from "./config";

export type MedicalInfo = {
  visionwithpg?: string;
  chiefcomplaint?: string;
  presentingillness?: string;
  pastHistory?: string;
  personalHistory?: string;
  familyHistory?: string;
  drugHistory?: string;
  allergyHistory?: string;
  bp?: string;
  pr?: string;
  temp?: string;
  respirationrate?: string;
  notes?: string;
};

export type VisitRecord = {
  date: Date | string;
  pmtvisiontpg?: string;
  pgpower?: string;
  pmt?: string;
  pda?: string;
  adar?: string;
  dryretinoscopy?: string;
  wetretinoscopy?: string;
  bcvanear?: string;
  bcvadistant?: string;
  nct?: string;
  colorvision?: string;
  ar?: string;
  visiondistant?: string;
  visionnear?: string;
  // Prescription
  glassPrescription?: string;
  notes?: string;
};

export type Patient = {
  id: string;
  fullName: string;
  username?: string;
  email: string;
  password?: string;
  role?: string;
  uuid?: string;
  doctor_id?: string;

  phone?: string;
  age?: string;
  gender?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;

  medicalInfo?: MedicalInfo;
  visitRecords?: VisitRecord[];
  lastVisitDate: any;
  createdAt: string;
  updatedAt?: string;
};

export const doctorService = {
  // Get all patients for a doctor
  getPatients: async () => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DOCTOR.PATIENTS,
      );

      return {
        success: true,
        patients: response.data.patients,
        message: "Patients retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error getting patients:", error);
      return {
        success: false,
        patients: [],
        message: error.response?.data?.error || "Failed to retrieve patients",
      };
    }
  },

  // Get patient details by ID
  getPatientById: async (patientId: string) => {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.DOCTOR.PATIENTS}/${patientId}`,
      );

      return {
        success: true,
        patient: response.data.patient,
        message: "Patient details retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error getting patient details:", error);
      return {
        success: false,
        patient: null,
        message:
          error.response?.data?.error || "Failed to retrieve patient details",
      };
    }
  },

  // Update patient medical info
  updatePatientMedicalInfo: async (
    patientId: string,
    medicalInfo: MedicalInfo,
  ) => {
    try {
      const response = await apiClient.post(
        `${API_CONFIG.ENDPOINTS.DOCTOR.PATIENTS}/medicalinfo/${patientId}`,
        { medicalInfo },
      );

      return {
        success: true,
        updatedInfo: response.data.medicalInfo,
        message: "Medical information updated successfully",
      };
    } catch (error: any) {
      console.error("Error updating medical info:", error);
      return {
        success: false,
        message:
          error.response?.data?.error || "Failed to update medical information",
      };
    }
  },

  // Add new patient visit record
  addPatientVisitRecord: async (
    patientId: string,
    visitRecord: VisitRecord,
  ) => {
    try {
      const response = await apiClient.post(
        `${API_CONFIG.ENDPOINTS.DOCTOR.PATIENTS}/visitrecord/${patientId}`,
        { visitRecord },
      );

      return {
        success: true,
        newRecord: response.data.visitRecord,
        message: "Visit record added successfully",
      };
    } catch (error: any) {
      console.error("Error adding visit record:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to add visit record",
      };
    }
  },
};
