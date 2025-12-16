import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Backend URL

export const api = {
  // Static data
  getDomains: () => {
    console.log('Fetching domains from:', `${API_BASE_URL}/api/v1/static/domains`);
    return axios.get(`${API_BASE_URL}/api/v1/static/domains`)
      .then(response => {
        console.log('Domains response:', response.data);
        return response;
      })
      .catch(error => {
        console.error('Error fetching domains:', error);
        throw error;
      });
  },
  getProblems: (domainId) => axios.get(`${API_BASE_URL}/api/v1/static/problems?domain_id=${domainId}`),
  getModifierTypes: () => axios.get(`${API_BASE_URL}/api/v1/static/modifier-types`),
  getModifierDomains: () => axios.get(`${API_BASE_URL}/api/v1/static/modifier-domains`),
  getInterventionTargets: () => axios.get(`${API_BASE_URL}/api/v1/static/intervention-targets`),
  getInterventionCategories: () => axios.get(`${API_BASE_URL}/api/v1/static/intervention-categories`),
  getSymptoms: (problemId) => axios.get(`${API_BASE_URL}/api/v1/static/symptoms?problem_id=${problemId}`),
  getOutcomePhases: () => axios.get(`${API_BASE_URL}/api/v1/static/outcome-phases`),
  getOutcomeRatings: () => axios.get(`${API_BASE_URL}/api/v1/static/outcome-ratings`),
  getConsentDefinitions: () => axios.get(`${API_BASE_URL}/api/v1/static/consent-definitions`),
  
  // Patients (using correct endpoint names)
  createPatient: (patientData) => axios.post(`${API_BASE_URL}/api/v1/patients`, patientData),
  getPatients: (tin = null) => {
    const url = tin ? `${API_BASE_URL}/api/v1/patients?tin=${tin}` : `${API_BASE_URL}/api/v1/patients`;
    return axios.get(url);
  },
  verifyPatientWithTinAndDob: (tin, dateOfBirth) => {
    return axios.get(`${API_BASE_URL}/api/v1/patients/verify?tin=${tin}&date_of_birth=${dateOfBirth}`);
  },
  getPatient: (patientId) => axios.get(`${API_BASE_URL}/api/v1/patients/${patientId}`),
  updatePatient: (patientId, patientData) => axios.put(`${API_BASE_URL}/api/v1/patients/${patientId}`, patientData),
  deletePatient: (patientId) => axios.delete(`${API_BASE_URL}/api/v1/patients/${patientId}`),
  
  // Patient Problems
  createPatientProblem: (patientId, problemData) =>
    axios.post(`${API_BASE_URL}/api/v1/patients/${patientId}/problems`, problemData),
  getPatientProblems: (patientId) =>
    axios.get(`${API_BASE_URL}/api/v1/patients/${patientId}/problems`),
  updatePatientProblem: (patientId, patientProblemId, problemData) =>
    axios.patch(`${API_BASE_URL}/api/v1/patients/${patientId}/problems/${patientProblemId}`, problemData),
  
  // Patient Problem Symptoms
  addSymptomToProblem: (patientId, patientProblemId, symptomData) =>
    axios.post(`${API_BASE_URL}/api/v1/patients/${patientId}/problems/${patientProblemId}/symptoms`, symptomData),
  
  // Patient Problem Interventions
  createIntervention: (patientId, patientProblemId, interventionData) =>
    axios.post(`${API_BASE_URL}/api/v1/patients/${patientId}/problems/${patientProblemId}/interventions`, interventionData),
  
  // Patient Problem Scores (Outcome Scores)
  createOutcomeScore: (patientId, patientProblemId, scoreData) =>
    axios.post(`${API_BASE_URL}/api/v1/patients/${patientId}/problems/${patientProblemId}/scores`, scoreData),
  getProblemScores: (patientId, patientProblemId) =>
    axios.get(`${API_BASE_URL}/api/v1/patients/${patientId}/problems/${patientProblemId}/scores`),
  
  // Care Plan
  getCarePlan: (patientId) => axios.get(`${API_BASE_URL}/api/v1/patients/${patientId}/care-plan`),
  
  // Export functionality
  exportPatientData: (patientId, exportFormat = 'json', destination = 'download') =>
    axios.get(`${API_BASE_URL}/api/v1/patients/${patientId}/export?export_format=${exportFormat}&destination=${destination}`),
  
  // Health check
  healthCheck: () => axios.get(`${API_BASE_URL}/api/v1/health`),
};