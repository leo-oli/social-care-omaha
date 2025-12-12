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
  
  // Clients
  createClient: (clientData) => axios.post(`${API_BASE_URL}/api/v1/clients`, clientData),
  getClient: (clientId) => axios.get(`${API_BASE_URL}/api/v1/clients/${clientId}`),
  deleteClient: (clientId) => axios.delete(`${API_BASE_URL}/api/v1/clients/${clientId}`),
  
  // Assessments/Problems - Check which one exists
  createAssessment: (assessmentData) => {
    // Try to match with your actual endpoints
    // Based on OpenAPI, you might need to use createClientProblem
    return axios.post(`${API_BASE_URL}/api/v1/clients/${assessmentData.client_id}/problems`, {
      problem_id: assessmentData.problem_id,
      modifier_domain_id: assessmentData.modifier_domain_id,
      modifier_type_id: assessmentData.modifier_type_id
    });
  },
  
  // For symptoms, you'll need to add them separately
  addSymptomToProblem: (clientId, clientProblemId, symptomData) => 
    axios.post(`${API_BASE_URL}/api/v1/clients/${clientId}/problems/${clientProblemId}/symptoms`, symptomData),
  
  // For outcome scores
  createOutcomeScore: (clientId, clientProblemId, scoreData) =>
    axios.post(`${API_BASE_URL}/api/v1/clients/${clientId}/problems/${clientProblemId}/scores`, scoreData),
  
  // For interventions
  createIntervention: (clientId, clientProblemId, interventionData) =>
    axios.post(`${API_BASE_URL}/api/v1/clients/${clientId}/problems/${clientProblemId}/interventions`, interventionData),
  
  // Care Plan
  getCarePlan: (clientId) => axios.get(`${API_BASE_URL}/api/v1/clients/${clientId}/care-plan`),
};