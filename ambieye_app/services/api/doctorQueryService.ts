import apiClient from "./apiService";
import { API_CONFIG } from "./config";

export type DoctorQuery = {
  id: string;
  patientId: string;
  patientName: string;
  question: string;
  response?: string;
  status: "pending" | "answered" | "closed";
  createdAt: string;
  updatedAt: string;
  answeredAt?: string;
  urgency?: "low" | "medium" | "high";
};

export const doctorQueryService = {
  // Get all queries for the doctor
  getAllQueries: async (status?: string, includeAll: boolean = false) => {
    try {
      let url = `${API_CONFIG.ENDPOINTS.DOCTOR.QUERIES}?includeAll=${includeAll}`;
      if (status) {
        url += `&status=${status}`;
      }
      
      const response = await apiClient.get(url);
      return {
        success: true,
        queries: response.data.queries,
        pagination: response.data.pagination
      };
    } catch (error: any) {
      console.error("Error fetching doctor queries:", error);
      return {
        success: false,
        queries: [],
        message: error.response?.data?.error || "Failed to fetch queries"
      };
    }
  },
  
  // Get a specific query by ID
  getQueryById: async (queryId: string) => {
    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.QUERIES}/${queryId}`);
      return {
        success: true,
        query: response.data.query,
        patient: response.data.patient,
        doctor: response.data.doctor
      };
    } catch (error: any) {
      console.error("Error fetching query details:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to fetch query details"
      };
    }
  },
  
  
  
  // Answer a query
  answerQuery: async (queryId: string, response: string) => {
    try {
      const apiResponse = await apiClient.put(`${API_CONFIG.ENDPOINTS.QUERIES}/${queryId}/answer`, {
        response
      });
      
      return {
        success: true,
        message: apiResponse.data.message || "Query answered successfully"
      };
    } catch (error: any) {
      console.error("Error answering query:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to answer query"
      };
    }
  }
};