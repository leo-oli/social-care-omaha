import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Backend URL

export const api = {
  // Static data
  getDomains: () => axios.get(`${API_BASE_URL}/api/v1/static/domains`),
  getProblems: (domainId) => axios.get(`${API_BASE_URL}/api/v1/static/problems`, { params: { domain_id: domainId } }),
  getSymptoms: (problemId) => axios.get(`${API_BASE_URL}/api/v1/static/problems/${problemId}/symptoms`),
  
  // Clients
  createClient: (clientData) => axios.post(`${API_BASE_URL}/api/v1/clients`, clientData),
  getClients: () => axios.get(`${API_BASE_URL}/api/v1/clients`),
  
  // Problems & Scores
  createProblem: (clientId, problemData) => axios.post(`${API_BASE_URL}/api/v1/clients/${clientId}/problems`, problemData),
  createScore: (clientId, problemId, scoreData) => axios.post(`${API_BASE_URL}/api/v1/clients/${clientId}/problems/${problemId}/scores`, scoreData),
  
  // Interventions
  createIntervention: (clientId, problemId, interventionData) => axios.post(`${API_BASE_URL}/api/v1/clients/${clientId}/problems/${problemId}/interventions`, interventionData),
  
  // Care Plan
  getCarePlan: (clientId) => axios.get(`${API_BASE_URL}/api/v1/clients/${clientId}/care-plan`),
  
  // Export
  exportClient: (clientId, format = 'txt') => axios.get(`${API_BASE_URL}/api/v1/clients/${clientId}/export`, { params: { format }, responseType: 'blob' })
};