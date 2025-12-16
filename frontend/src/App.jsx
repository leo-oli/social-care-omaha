import React, { useState, useEffect } from 'react';
import './App.css';
import { api } from './api.js';

function App() {
  // Client information state
  const [clientInfo, setClientInfo] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    address: '',
    tin: '',
    consents: {}
  });
  
  // Backend health state
  const [backendHealth, setBackendHealth] = useState({
    isOnline: false,
    status: 'Checking...',
    lastChecked: null
  });
  
  const [showUserIdInput, setShowUserIdInput] = useState(true);
  const [currentDomain, setCurrentDomain] = useState(null);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState({});
  const [currentPatientId, setCurrentPatientId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [patientProblems, setPatientProblems] = useState({});
  
  // State for handling duplicate TIN
  const [duplicateTINError, setDuplicateTINError] = useState(null);
  const [existingPatient, setExistingPatient] = useState(null);
  
  // Comparison state
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [availableProblems, setAvailableProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [comparisonData, setComparisonData] = useState({ older: null, newer: null });
  const [showComparisonResult, setShowComparisonResult] = useState(false);
  
  // Data from API
  const [domains, setDomains] = useState([]);
  const [problems, setProblems] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [interventionCategories, setInterventionCategories] = useState([]);
  const [interventionTargets, setInterventionTargets] = useState([]);
  const [modifierTypes, setModifierTypes] = useState([]);
  const [modifierDomains, setModifierDomains] = useState([]);
  const [outcomeRatings, setOutcomeRatings] = useState(null);
  const [consentDefinitions, setConsentDefinitions] = useState([]);
  
  const [selectedProblemDetails, setSelectedProblemDetails] = useState(null);


  // ============ BACKEND HEALTH CHECK ============
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/health');
        if (response.ok) {
          setBackendHealth({
            isOnline: true,
            status: 'Backend running',
            lastChecked: new Date()
          });
        } else {
          throw new Error('Health check failed');
        }
      } catch (error) {
        setBackendHealth({
          isOnline: false,
          status: 'Backend not running',
          lastChecked: new Date()
        });
      }
    };
    
    // Check health immediately
    checkBackendHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // ============ FETCH CONSENT DEFINITIONS ============
  useEffect(() => {
    // Fetch consent definitions immediately when component mounts
    fetch('http://localhost:8000/api/v1/static/consent-definitions')
      .then(response => response.json())
      .then(data => {
        console.log('Consent definitions loaded:', data.length);
        setConsentDefinitions(data);
        
        // Initialize consents in clientInfo with default false values
        const initialConsents = {};
        data.forEach(consent => {
          initialConsents[consent.consent_definition_id] = false;
        });
        
        setClientInfo(prev => ({
          ...prev,
          consents: initialConsents
        }));
      })
      .catch(error => {
        console.error('Error loading consent definitions:', error);
      });
  }, []);

  // ============ FETCH ALL STATIC DATA ============
  useEffect(() => {
    console.log('Effect: showUserIdInput changed to', showUserIdInput);
    
    if (!showUserIdInput) {
      console.log('Fetching ALL static data...');
      setLoading(true);
      
      // Load domains
      fetch('http://localhost:8000/api/v1/static/domains')
        .then(response => response.json())
        .then(data => {
          console.log('Domains loaded:', data.length);
          setDomains(data);
          
          // Load modifier types
          return fetch('http://localhost:8000/api/v1/static/modifier-types');
        })
        .then(response => response.json())
        .then(data => {
          console.log('Modifier types loaded:', data.length);
          setModifierTypes(data);
          
          // Load modifier domains
          return fetch('http://localhost:8000/api/v1/static/modifier-domains');
        })
        .then(response => response.json())
        .then(data => {
          console.log('Modifier domains loaded:', data.length);
          setModifierDomains(data);
          
          // Load intervention categories
          return fetch('http://localhost:8000/api/v1/static/intervention-categories');
        })
        .then(response => response.json())
        .then(data => {
          console.log('Intervention categories loaded:', data.length);
          setInterventionCategories(data);
          
          // Load intervention targets
          return fetch('http://localhost:8000/api/v1/static/intervention-targets');
        })
        .then(response => response.json())
        .then(data => {
          console.log('Intervention targets loaded:', data.length);
          setInterventionTargets(data);
          
          // Load outcome ratings
          return fetch('http://localhost:8000/api/v1/static/outcome-ratings');
        })
        .then(response => response.json())
        .then(data => {
          console.log('Outcome ratings loaded:', data);
          setOutcomeRatings(data);
          
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading data:', error);
          setLoading(false);
        });
    }
  }, [showUserIdInput]);

  // Fetch problems when domain is selected
  useEffect(() => {
    if (currentDomain) {
      setLoading(true);
      fetch(`http://localhost:8000/api/v1/static/problems?domain_id=${currentDomain}`)
        .then(response => response.json())
        .then(data => {
          console.log('Problems loaded for domain', currentDomain, ':', data.length);
          
          // Set current problems for display
          setProblems(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading problems:', error);
          setLoading(false);
        });
    }
  }, [currentDomain]);

  // Fetch symptoms when problem is selected
  useEffect(() => {
    if (currentProblem) {
      fetch(`http://localhost:8000/api/v1/static/symptoms?problem_id=${currentProblem}`)
        .then(response => response.json())
        .then(data => {
          console.log('Symptoms loaded:', data.length);
          setSymptoms(data);
        })
        .catch(error => console.error('Error loading symptoms:', error));
      
      const selectedProblem = problems.find(p => p.problem_id === currentProblem);
      setSelectedProblemDetails(selectedProblem);
      setCurrentSection('classification');
    }
  }, [currentProblem, problems]);

  // ============ HANDLER FUNCTIONS ============
  const handleClientInfoChange = (field, value) => {
    let processedValue = value;
    
    // Apply field-specific validation and formatting
    if (field === 'firstName' || field === 'lastName') {
      // Only allow letters and spaces
      processedValue = value.replace(/[^a-zA-Z\s]/g, '');
    } else if (field === 'phoneNumber') {
      // Only allow digits, max 17
      processedValue = value.replace(/\D/g, '').slice(0, 17);
    } else if (field === 'tin') {
      // Only allow digits, max 11
      processedValue = value.replace(/\D/g, '').slice(0, 11);
    }
    
    setClientInfo(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };
  
  const handleConsentChange = (consentId, hasConsented) => {
    setClientInfo(prev => ({
      ...prev,
      consents: {
        ...prev.consents,
        [consentId]: hasConsented
      }
    }));
  };
  
  // Validation functions
  const validateClientInfo = () => {
    const errors = [];
    
    // Name validation (letters only)
    if (!clientInfo.firstName.trim() || !/^[a-zA-Z\s]+$/.test(clientInfo.firstName.trim())) {
      errors.push('First name must contain only letters');
    }
    
    if (!clientInfo.lastName.trim() || !/^[a-zA-Z\s]+$/.test(clientInfo.lastName.trim())) {
      errors.push('Last name must contain only letters');
    }
    
    // Birthdate validation - now mandatory
    if (!clientInfo.dateOfBirth) {
      errors.push('Date of birth is required');
    } else {
      const birthDate = new Date(clientInfo.dateOfBirth);
      const today = new Date();
      const maxAgeDate = new Date();
      maxAgeDate.setFullYear(today.getFullYear() - 150);
      
      if (birthDate > today) {
        errors.push('Birth date cannot be in the future');
      } else if (birthDate < maxAgeDate) {
        errors.push('Birth date cannot be more than 150 years ago');
      }
    }
    
    // Phone number validation (up to 17 digits)
    if (clientInfo.phoneNumber && clientInfo.phoneNumber.length > 17) {
      errors.push('Phone number cannot exceed 17 digits');
    }
    
    // TIN validation (now mandatory and exactly 11 digits)
    if (!clientInfo.tin) {
      errors.push('TIN is required');
    } else if (clientInfo.tin.length !== 11) {
      errors.push('TIN must be exactly 11 digits');
    }
    
    // Consent validation
    if (consentDefinitions.length > 0) {
      const mandatoryConsents = consentDefinitions.filter(c => c.is_mandatory);
      for (const consent of mandatoryConsents) {
        if (!clientInfo.consents[consent.consent_definition_id]) {
          errors.push(`You must consent to: ${consent.consent_title}`);
        }
      }
    }
    
    return errors;
  };

  const handleRadioChange = (field, value) => {
    setResponses(prev => ({
      ...prev,
      [currentDomain]: {
        ...prev[currentDomain],
        [currentProblem]: {
          ...prev[currentDomain]?.[currentProblem],
          [field]: value
        }
      }
    }));
  };

  const handleCheckboxChange = (field, id, isChecked) => {
    setResponses(prev => {
      const currentSelections = prev[currentDomain]?.[currentProblem]?.[field] || [];
      const newSelections = isChecked
        ? [...currentSelections, id]
        : currentSelections.filter(itemId => itemId !== id);
      
      return {
        ...prev,
        [currentDomain]: {
          ...prev[currentDomain],
          [currentProblem]: {
            ...prev[currentDomain]?.[currentProblem],
            [field]: newSelections
          }
        }
      };
    });
  };

  // Function to check if a patient with the given TIN already exists
  const checkExistingPatient = async (tin) => {
    try {
      const response = await api.getPatients(tin);
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Error checking existing patient:', error);
      return null;
    }
  };

  const handleUserIdSubmit = async () => {
    // Reset error states
    setDuplicateTINError(null);
    setExistingPatient(null);
    
    // Validate all fields
    const errors = validateClientInfo();
    
    if (errors.length > 0) {
      alert('Please fix the following errors:\n' + errors.join('\n'));
      return;
    }
    
    setLoading(true);
    
    try {
      // First check if a patient with this TIN already exists
      const existing = await checkExistingPatient(clientInfo.tin);
      
      if (existing) {
        // Patient with this TIN already exists
        setExistingPatient(existing);
        setDuplicateTINError(`A patient with TIN ${clientInfo.tin} already exists.`);
        setLoading(false);
        return;
      }
      
      // Prepare patient data for API
      const patientData = {
        first_name: clientInfo.firstName,
        last_name: clientInfo.lastName,
        date_of_birth: clientInfo.dateOfBirth,
        phone_number: clientInfo.phoneNumber || null,
        address: clientInfo.address || null,
        tin: clientInfo.tin,
        consents: Object.entries(clientInfo.consents).map(([consentId, hasConsented]) => ({
          consent_definition_id: parseInt(consentId),
          has_consented: hasConsented
        }))
      };
      
      // Create patient in backend
      const response = await api.createPatient(patientData);
      const patient = response.data;
      
      // Store patient ID for subsequent operations
      setCurrentPatientId(patient.patient_id);
      
      // Clear all previous responses and data
      setResponses({});
      setPatientProblems({});
      setCurrentDomain(null);
      setCurrentProblem(null);
      setCurrentSection(null);
      setSelectedProblemDetails(null);
      setSymptoms([]);
      setProblems([]);
      setShowUserIdInput(false);
      
      console.log('Patient created successfully:', patient);
    } catch (error) {
      console.error('Error creating patient:', error);
      
      // Check if this is a TIN uniqueness constraint error
      if (error.response?.data?.detail && error.response.data.detail.includes('UNIQUE constraint failed')) {
        setDuplicateTINError(`A patient with TIN ${clientInfo.tin} already exists.`);
        // Try to get the existing patient details
        const existing = await checkExistingPatient(clientInfo.tin);
        if (existing) {
          setExistingPatient(existing);
        }
      } else {
        alert('Error creating patient: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Function to use existing patient
  const handleUseExistingPatient = () => {
    if (existingPatient) {
      setCurrentPatientId(existingPatient.patient_id);
      
      // Update client info with existing patient data
      setClientInfo({
        firstName: existingPatient.first_name,
        lastName: existingPatient.last_name,
        dateOfBirth: existingPatient.date_of_birth,
        phoneNumber: existingPatient.phone_number || '',
        address: existingPatient.address || '',
        tin: existingPatient.tin,
        consents: clientInfo.consents // Keep current consents
      });
      
      // Reset error states
      setDuplicateTINError(null);
      setExistingPatient(null);
      
      // Clear all previous responses and data
      setResponses({});
      setPatientProblems({});
      setCurrentDomain(null);
      setCurrentProblem(null);
      setCurrentSection(null);
      setSelectedProblemDetails(null);
      setSymptoms([]);
      setProblems([]);
      setShowUserIdInput(false);
    }
  };
  
  // Function to enter a different TIN
  const handleEnterDifferentTIN = () => {
    setDuplicateTINError(null);
    setExistingPatient(null);
    setClientInfo(prev => ({
      ...prev,
      tin: ''
    }));
  };

  const handleNewAssessment = () => {
    // Clear ALL state
    setClientInfo({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phoneNumber: '',
      address: '',
      tin: '',
      consents: {}
    });
    setResponses({});
    setCurrentDomain(null);
    setCurrentProblem(null);
    setCurrentSection(null);
    setSelectedProblemDetails(null);
    setSymptoms([]);
    setProblems([]);
    setCurrentPatientId(null);
    setPatientProblems({});
    // Reset comparison state
    setShowComparisonView(false);
    setShowComparisonResult(false);
    setSelectedProblems([]);
    setAvailableProblems([]);
    setComparisonData({ older: null, newer: null });
    // Don't clear static data, just show user input
    setShowUserIdInput(true);
  };

  const handleSubmit = async () => {
    try {
      const problemData = responses[currentDomain]?.[currentProblem];
      
      if (!problemData?.modifierDomain || !problemData?.modifierType) {
        alert('Please complete Problem Classification (Domain and Type Modifiers)');
        return;
      }
      
      if (!problemData?.ratingStatus || !problemData?.ratingKnowledge || !problemData?.ratingBehavior) {
        alert('Please complete Problem Rating Scale for Outcomes');
        return;
      }
      
      setLoading(true);
      
      // 1. Create patient problem
      const problemCreateData = {
        problem_id: parseInt(currentProblem),
        modifier_domain_id: problemData.modifierDomain,
        modifier_type_id: problemData.modifierType
      };
      
      const problemResponse = await api.createPatientProblem(currentPatientId, problemCreateData);
      const patientProblem = problemResponse.data;
      console.log('Patient problem created:', patientProblem);
      
      // Store the patient problem ID for later use
      setPatientProblems(prev => ({
        ...prev,
        [`${currentDomain}_${currentProblem}`]: patientProblem.patient_problem_id
      }));
      
      // 2. Add symptoms to the problem
      if (problemData.selectedSymptoms && problemData.selectedSymptoms.length > 0) {
        for (const symptomId of problemData.selectedSymptoms) {
          const symptomData = {
            symptom_id: symptomId,
            symptom_comment: null
          };
          await api.addSymptomToProblem(currentPatientId, patientProblem.patient_problem_id, symptomData);
        }
        console.log('Symptoms added to problem');
      }
      
      // 3. Add interventions to the problem
      if (problemData.interventionCategories && problemData.interventionCategories.length > 0) {
        for (const categoryId of problemData.interventionCategories) {
          // For each category, we need to associate with targets
          if (problemData.interventionTargets && problemData.interventionTargets.length > 0) {
            for (const targetId of problemData.interventionTargets) {
              const interventionData = {
                category_id: categoryId,
                target_id: targetId,
                specific_details: null
              };
              await api.createIntervention(currentPatientId, patientProblem.patient_problem_id, interventionData);
            }
          }
        }
        console.log('Interventions added to problem');
      }
      
      // 4. Add outcome score to the problem
      const scoreData = {
        phase_id: 1, // Default phase ID, you might want to make this configurable
        rating_knowledge_id: getRatingId(problemData.ratingKnowledge, 'knowledge'),
        rating_behavior_id: getRatingId(problemData.ratingBehavior, 'behavior'),
        rating_status_id: getRatingId(problemData.ratingStatus, 'status')
      };
      
      await api.createOutcomeScore(currentPatientId, patientProblem.patient_problem_id, scoreData);
      console.log('Outcome score added to problem');
      
      alert('Assessment completed and saved successfully!');
      
      // Go back to problems menu
      setCurrentSection(null);
      setCurrentProblem(null);
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Error saving assessment: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to get rating ID from label
  const getRatingId = (label, type) => {
    if (!outcomeRatings || !outcomeRatings[type]) return 1;
    
    const rating = outcomeRatings[type].find(r => r[`rating_${type}_label`] === label);
    return rating ? rating[`rating_${type}_id`] : 1;
  };

  const exportToJson = async () => {
    // Check if we have at least a name for the file
    if (!clientInfo.firstName.trim() && !clientInfo.lastName.trim()) {
      alert('Please enter client information before exporting');
      return;
    }
    
    // If we have a patient ID, try to export from backend
    if (currentPatientId) {
      try {
        setLoading(true);
        
        // Get the care plan as JSON from backend
        const response = await api.exportPatientData(currentPatientId, 'json', 'download');
        console.log('Export data:', response.data);
        
        // Create and download JSON file
        const jsonData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `patient_data_${clientInfo.firstName}_${clientInfo.lastName}_${Date.now()}.json`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Patient data exported as JSON successfully!');
        
      } catch (error) {
        console.error('Error exporting JSON from backend:', error);
        alert('Error exporting JSON: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    } else {
      alert('No patient data to export. Please complete an assessment first.');
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all answers?')) {
      setResponses({});
      setCurrentDomain(null);
      setCurrentProblem(null);
      setCurrentSection(null);
      setSelectedProblemDetails(null);
      setSymptoms([]);
    }
  };

  // ============ COMPARISON FUNCTIONS ============
  const handleFetchProblemsForComparison = async () => {
    if (!currentPatientId) {
      alert('No patient selected. Please start an assessment first.');
      return;
    }

    setLoading(true);
    try {
      // Get outcome ratings first to make them available in comparison function
      const outcomeRatingsResponse = await api.getOutcomeRatings();
      const outcomeRatings = outcomeRatingsResponse.data;
      console.log('Outcome ratings loaded:', outcomeRatings);
      
      // Get care plan which includes all problems with their details
      const response = await api.getCarePlan(currentPatientId);
      const problems = response.data.active_problems || [];
      console.log('Problems from API:', problems);
      
      // Extract all scores with their dates for each problem
      const problemScores = [];
      problems.forEach(problem => {
        console.log('Processing problem:', problem);
        console.log('Problem structure:', JSON.stringify(problem, null, 2));
        
        // Handle both care plan and export JSON structures
        // For care plan API: problem.modifier_domain.modifier_domain_name
        // For export JSON: problem.domain
        const domainName = problem.modifier_domain?.modifier_domain_name ||
                         problem.domain ||
                         problem.modifier_domain ||
                         'Unknown';
        // For care plan API: problem.modifier_type.modifier_type_name
        // For export JSON: problem.type
        const modifierTypeName = problem.modifier_type?.modifier_type_name ||
                               problem.type ||
                               problem.modifier_type ||
                               'Unknown';
        const problemName = problem.problem_name ||
                           problem.problem?.problem_name ||
                           'Unknown Problem';
        
        // Check for different possible outcome data structures
        let outcomeData = null;
        let dateRecorded = null;
        
        // Try to find outcome data in different locations
        if (problem.latest_outcome) {
          console.log('Found latest_outcome:', problem.latest_outcome);
          outcomeData = {
            status: problem.latest_outcome.status,
            knowledge: problem.latest_outcome.knowledge,
            behavior: problem.latest_outcome.behavior
          };
          dateRecorded = problem.latest_outcome.date_recorded;
        } else if (problem.latest_score) {
          console.log('Found latest_score:', problem.latest_score);
          // Check if latest_score has rating IDs but no rating objects
          if (problem.latest_score.rating_status_id && !problem.latest_score.status_rating) {
            // We have rating IDs but no rating objects - need to map IDs to labels
            // Use the outcomeRatings data that was loaded earlier
            const statusRating = outcomeRatings?.status?.find(r => r.rating_status_id === problem.latest_score.rating_status_id);
            const knowledgeRating = outcomeRatings?.knowledge?.find(r => r.rating_knowledge_id === problem.latest_score.rating_knowledge_id);
            const behaviorRating = outcomeRatings?.behavior?.find(r => r.rating_behavior_id === problem.latest_score.rating_behavior_id);
            
            outcomeData = {
              status: statusRating?.rating_status_label || 'Not recorded',
              knowledge: knowledgeRating?.rating_knowledge_label || 'Not recorded',
              behavior: behaviorRating?.rating_behavior_label || 'Not recorded'
            };
          } else {
            // Use rating objects if available
            outcomeData = {
              status: problem.latest_score.status_rating?.rating_status_label || 'Not recorded',
              knowledge: problem.latest_score.knowledge_rating?.rating_knowledge_label || 'Not recorded',
              behavior: problem.latest_score.behavior_rating?.rating_behavior_label || 'Not recorded'
            };
          }
          dateRecorded = problem.latest_score.date_recorded;
        }
        
        // Also check for scores array (from export JSON)
        if (!outcomeData && problem.scores && problem.scores.length > 0) {
          console.log('Found scores array:', problem.scores);
          const latestScore = problem.scores[0]; // Assuming first is latest
          outcomeData = {
            status: latestScore.status || 'Not recorded',
            knowledge: latestScore.knowledge || 'Not recorded',
            behavior: latestScore.behavior || 'Not recorded'
          };
          dateRecorded = latestScore.date_recorded || dateRecorded;
        }
        
        // Handle symptoms from both structures
        const symptoms = problem.symptoms ||
                       problem.selected_symptoms ||
                       [];
        
        // Handle interventions from both structures
        const interventions = problem.all_interventions ||
                           problem.interventions ||
                           [];
        
        // Create a synthetic domain field for easier access in comparison
        const syntheticProblemData = {
          ...problem,
          domain: domainName, // Add domain directly for comparison display
          modifier_domain: domainName,
          modifier_type: modifierTypeName,
          // Add symptoms and interventions in the expected format
          selected_symptoms: symptoms,
          interventions: interventions
        };
        
        problemScores.push({
          patient_problem_id: problem.patient_problem_id || Math.random(),
          problem_name: problemName,
          date_recorded: dateRecorded || problem.created_at || new Date().toISOString(),
          score_data: outcomeData || {
            status: 'Not recorded',
            knowledge: 'Not recorded',
            behavior: 'Not recorded'
          },
          problem_data: syntheticProblemData
        });
      });
      
      console.log('Final problemScores:', problemScores);
      
      // Sort by date (newest first)
      problemScores.sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded));
      
      setAvailableProblems(problemScores);
      setShowComparisonView(true);
    } catch (error) {
      console.error('Error fetching problems for comparison:', error);
      alert('Error fetching assessment data: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleProblemSelection = (problem) => {
    if (selectedProblems.length >= 2) {
      alert('You can only select 2 problems for comparison.');
      return;
    }

    if (selectedProblems.some(p => p.patient_problem_id === problem.patient_problem_id && p.date_recorded === problem.date_recorded)) {
      // Deselect if already selected
      setSelectedProblems(selectedProblems.filter(p => !(p.patient_problem_id === problem.patient_problem_id && p.date_recorded === problem.date_recorded)));
    } else {
      // Select if not already selected
      setSelectedProblems([...selectedProblems, problem]);
    }
  };

  const handleCompareSelected = () => {
    if (selectedProblems.length !== 2) {
      alert('Please select exactly 2 problems to compare.');
      return;
    }

    // Sort by date to determine older/newer
    const sorted = [...selectedProblems].sort((a, b) => new Date(a.date_recorded) - new Date(b.date_recorded));
    
    setComparisonData({
      older: sorted[0],
      newer: sorted[1]
    });
    setShowComparisonResult(true);
  };

  const handleCloseComparison = () => {
    setShowComparisonView(false);
    setShowComparisonResult(false);
    setSelectedProblems([]);
    setAvailableProblems([]);
    setComparisonData({ older: null, newer: null });
  };

  // ============ RENDER FUNCTIONS ============
  const renderContent = () => {
    // Comparison view
    if (showComparisonResult) {
      return (
        <div className="comparison-view-container">
          <button className="back-btn" onClick={handleCloseComparison}>
            ← Back to Problem Selection
          </button>
          <h2>Problem Assessment Comparison</h2>
          <p className="user-id-display">
            Client: <strong>{clientInfo.firstName} {clientInfo.lastName}</strong>
          </p>
          
          <div className="comparison-columns">
            {/* Older Assessment Column */}
            <div className="comparison-column older-assessment">
              <div className="column-header older-header">
                <h3>Older Assessment</h3>
                <p className="assessment-date">
                  {new Date(comparisonData.older.date_recorded).toLocaleString()}
                </p>
                <p className="problem-name">{comparisonData.older.problem_name}</p>
              </div>
              <div className="assessment-content">
                <div className="problem-details">
                  <h4>Problem Classification</h4>
                  <p><strong>Domain modifier:</strong> {comparisonData.older.problem_data?.domain || 'Unknown'}</p>
                  <p><strong>Type modifier:</strong> {comparisonData.older.problem_data?.modifier_type || 'Unknown'}</p>
                  
                  <h4>Signs & Symptoms</h4>
                  {comparisonData.older.problem_data?.selected_symptoms && comparisonData.older.problem_data.selected_symptoms.length > 0 ? (
                    <ul>
                      {comparisonData.older.problem_data.selected_symptoms.map((symptom, index) => (
                        <li key={index}>
                          {symptom.description ||
                           symptom.symptom?.symptom_description ||
                           'Unknown symptom'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No symptoms recorded</p>
                  )}
                  
                  <h4>Interventions</h4>
                  {comparisonData.older.problem_data?.interventions && comparisonData.older.problem_data.interventions.length > 0 ? (
                    <ul>
                      {comparisonData.older.problem_data.interventions.map((intervention, index) => (
                        <li key={index}>
                          {intervention.category?.category_name || intervention.category} - {intervention.target?.target_name || intervention.target}
                          {(intervention.specific_details || intervention.details) && <p>Details: {intervention.specific_details || intervention.details}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No interventions recorded</p>
                  )}
                  
                </div>
              </div>
            </div>
            
            {/* Newer Assessment Column */}
            <div className="comparison-column newer-assessment">
              <div className="column-header newer-header">
                <h3>Newer Assessment</h3>
                <p className="assessment-date">
                  {new Date(comparisonData.newer.date_recorded).toLocaleString()}
                </p>
                <p className="problem-name">{comparisonData.newer.problem_name}</p>
              </div>
              <div className="assessment-content">
                <div className="problem-details">
                  <h4>Problem Classification</h4>
                  <p><strong>Domain modifier:</strong> {comparisonData.newer.problem_data?.domain || 'Unknown'}</p>
                  <p><strong>Type modifier:</strong> {comparisonData.newer.problem_data?.modifier_type || 'Unknown'}</p>
                  
                  <h4>Signs & Symptoms</h4>
                  {comparisonData.newer.problem_data?.selected_symptoms && comparisonData.newer.problem_data.selected_symptoms.length > 0 ? (
                    <ul>
                      {comparisonData.newer.problem_data.selected_symptoms.map((symptom, index) => (
                        <li key={index}>
                          {symptom.description ||
                           symptom.symptom?.symptom_description ||
                           'Unknown symptom'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No symptoms recorded</p>
                  )}
                  
                  <h4>Interventions</h4>
                  {comparisonData.newer.problem_data?.interventions && comparisonData.newer.problem_data.interventions.length > 0 ? (
                    <ul>
                      {comparisonData.newer.problem_data.interventions.map((intervention, index) => (
                        <li key={index}>
                          {intervention.category?.category_name || intervention.category} - {intervention.target?.target_name || intervention.target}
                          {(intervention.specific_details || intervention.details) && <p>Details: {intervention.specific_details || intervention.details}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No interventions recorded</p>
                  )}
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Problem selection for comparison
    if (showComparisonView) {
      return (
        <div className="comparison-container">
          <button className="back-btn" onClick={handleCloseComparison}>
            ← Back to Assessment
          </button>
          <h2>Select Problems to Compare</h2>
          <p className="user-id-display">
            Client: <strong>{clientInfo.firstName} {clientInfo.lastName}</strong>
          </p>
          <p className="selection-info">
            Selected: {selectedProblems.length} of 2 problems
          </p>
          
          {loading ? (
            <div className="loading-container">
              <h3>Loading assessment data...</h3>
            </div>
          ) : (
            <div className="comparison-content">
              <div className="problems-grid">
                {availableProblems.map((problem, index) => (
                  <div
                    key={index}
                    className={`problem-tile ${selectedProblems.some(p => p.patient_problem_id === problem.patient_problem_id && p.date_recorded === problem.date_recorded) ? 'selected' : ''}`}
                    onClick={() => handleProblemSelection(problem)}
                  >
                    <h3>{problem.problem_name}</h3>
                    <p className="problem-date">
                      {new Date(problem.date_recorded).toLocaleString()}
                    </p>
                    <div className="problem-info">
                      <p><strong>Domain:</strong> {problem.problem_data?.domain || 'Unknown'}</p>
                      <p><strong>Modifier:</strong> {problem.problem_data?.modifier_domain?.modifier_domain_name || problem.problem_data?.modifier_domain || 'Unknown'} - {problem.problem_data?.modifier_type?.modifier_type_name || problem.problem_data?.modifier_type || 'Unknown'}</p>
                    </div>
                    {selectedProblems.some(p => p.patient_problem_id === problem.patient_problem_id && p.date_recorded === problem.date_recorded) && (
                      <div className="selected-indicator">✓ Selected</div>
                    )}
                  </div>
                ))}
              </div>
              
              {availableProblems.length === 0 && (
                <p>No assessment data found for this patient.</p>
              )}
              
              {selectedProblems.length === 2 && (
                <div className="comparison-actions">
                  <button
                    className="compare-btn"
                    onClick={handleCompareSelected}
                  >
                    Compare Selected Problems
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (showUserIdInput) {
      return (
        <div className="user-id-container">
          <h2>Enter Client Information</h2>
          <div className="client-info-form">
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={clientInfo.firstName}
                  onChange={(e) => handleClientInfoChange('firstName', e.target.value)}
                  placeholder="Petras"
                  className="form-field"
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={clientInfo.lastName}
                  onChange={(e) => handleClientInfoChange('lastName', e.target.value)}
                  placeholder="Petravičius"
                  className="form-field"
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  value={clientInfo.dateOfBirth}
                  onChange={(e) => handleClientInfoChange('dateOfBirth', e.target.value)}
                  className="form-field"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={clientInfo.phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    handleClientInfoChange('phoneNumber', value);
                  }}
                  placeholder="37012312345"
                  className="form-field"
                  pattern="[0-9]*"
                  inputMode="numeric"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={clientInfo.address}
                  onChange={(e) => handleClientInfoChange('address', e.target.value)}
                  placeholder="Enter full address"
                  className="form-field address-field"
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>TIN (Tax Identification Number) *</label>
                <input
                  type="text"
                  value={clientInfo.tin}
                  onChange={(e) => handleClientInfoChange('tin', e.target.value)}
                  placeholder="12345678901"
                  className="form-field"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength="11"
                  required
                />
                <small className="form-hint">Exactly 11 digits required</small>
              </div>
            </div>
            
            {/* Consent checkboxes */}
            {consentDefinitions.length > 0 && (
              <div className="form-row">
                <div className="form-group full-width">
                  <h4>Data Processing Consents</h4>
                  <div className="consent-options">
                    {consentDefinitions.map(consent => (
                      <label key={consent.consent_definition_id} className="consent-label">
                        <input
                          type="checkbox"
                          checked={clientInfo.consents[consent.consent_definition_id] || false}
                          onChange={(e) => handleConsentChange(consent.consent_definition_id, e.target.checked)}
                          className="consent-checkbox"
                        />
                        <span className="consent-text">
                          <strong>{consent.consent_title}</strong>
                          {consent.is_mandatory && <span className="mandatory-indicator"> *</span>}
                          {consent.consent_description && (
                            <p className="consent-description">{consent.consent_description}</p>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="form-notes">
              <p>* Required fields</p>
            </div>
            
            <button className="user-id-submit" onClick={handleUserIdSubmit}>
              Start Assessment →
            </button>
            
            {/* Duplicate TIN Error Handling */}
            {duplicateTINError && (
              <div className="duplicate-tin-error">
                <h3>⚠️ Duplicate TIN Detected</h3>
                <p>{duplicateTINError}</p>
                
                {existingPatient && (
                  <div className="existing-patient-info">
                    <h4>Existing Patient Information:</h4>
                    <p><strong>Name:</strong> {existingPatient.first_name} {existingPatient.last_name}</p>
                    <p><strong>Date of Birth:</strong> {existingPatient.date_of_birth}</p>
                    <p><strong>Phone:</strong> {existingPatient.phone_number || 'Not provided'}</p>
                    <p><strong>Address:</strong> {existingPatient.address || 'Not provided'}</p>
                  </div>
                )}
                
                <div className="duplicate-tin-actions">
                  <button
                    className="use-existing-patient-btn"
                    onClick={handleUseExistingPatient}
                  >
                    Use Existing Patient
                  </button>
                  <button
                    className="enter-different-tin-btn"
                    onClick={handleEnterDifferentTIN}
                  >
                    Enter Another Patient's Information
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="user-id-note">This will create an assessment record</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="loading-container">
          <h2>Loading...</h2>
          <p>Please wait while we fetch the data.</p>
        </div>
      );
    }

    if (!currentDomain) {
      return (
        <div className="categories-container">
          <h2>Select a Domain</h2>
          <p className="user-id-display">
            Client: <strong>{clientInfo.firstName} {clientInfo.lastName}</strong>
            {clientInfo.dateOfBirth && ` • DOB: ${clientInfo.dateOfBirth}`}
          </p>
          
          <div className="categories-grid">
            {domains.map(domain => (
              <div 
                key={domain.domain_id} 
                className="category-card"
                onClick={() => setCurrentDomain(domain.domain_id)}
              >
                <h3>{domain.domain_name}</h3>
                <p className="domain-description">{domain.domain_description}</p>
                <div className="select-btn">Select</div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (!currentProblem) {
      const domain = domains.find(d => d.domain_id === currentDomain);
      
      return (
        <div className="subcategories-container">
          <button className="back-btn" onClick={() => setCurrentDomain(null)}>
            ← Back to Domains
          </button>
          <h2>{domain?.domain_name} Domain</h2>
          
          <div className="subcategories-grid">
            {problems.map(problem => (
              <div 
                key={problem.problem_id} 
                className="subcategory-card"
                onClick={() => setCurrentProblem(problem.problem_id)}
              >
                <h3>{problem.problem_name}</h3>
                <p className="problem-description">{problem.problem_description}</p>
                <div className="select-btn">Assess Problem</div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      const domain = domains.find(d => d.domain_id === currentDomain);
      const problemData = responses[currentDomain]?.[currentProblem] || {};
      
      // ============ SECTION 1: PROBLEM CLASSIFICATION ============
      if (currentSection === 'classification') {
        return (
          <div className="questions-container">
            <button className="back-btn" onClick={() => {
              setCurrentSection(null);
              setCurrentProblem(null);
            }}>
              ← Back to Problems
            </button>
            
            <h2>Assessment for {selectedProblemDetails?.problem_name}</h2>
            <p className="problem-context">
              <strong>Domain:</strong> {domain?.domain_name}
            </p>
            
            <div className="section-header">
              <h3>1. PROBLEM CLASSIFICATION SCHEME</h3>
              <div className="progress-indicator">
                <span className="progress-step active"></span>
                <span className="progress-line"></span>
                <span className="progress-step"></span>
                <span className="progress-line"></span>
                <span className="progress-step"></span>
              </div>
            </div>
            
            <div className="questions-form">
              {/* 1.1 Domain Modifiers (Radio) */}
              <div className="question-group">
                <h4>1.1 Domain Modifiers</h4>
                <p className="question-help">Who is affected by this problem? (Select one)</p>
                <div className="radio-options">
                  {modifierDomains.map(modDomain => (
                    <label key={modDomain.modifier_domain_id} className="radio-label">
                      <input
                        type="radio"
                        name="domain-modifier"
                        value={modDomain.modifier_domain_id}
                        checked={problemData.modifierDomain === modDomain.modifier_domain_id}
                        onChange={(e) => handleRadioChange('modifierDomain', parseInt(e.target.value))}
                      />
                      <span className="radio-text">{modDomain.modifier_domain_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* 1.2 Type Modifiers (Radio) */}
              <div className="question-group">
                <h4>1.2 Type Modifiers</h4>
                <p className="question-help">What is the nature of this problem? (Select one)</p>
                <div className="radio-options">
                  {modifierTypes.map(modType => (
                    <label key={modType.modifier_type_id} className="radio-label">
                      <input
                        type="radio"
                        name="type-modifier"
                        value={modType.modifier_type_id}
                        checked={problemData.modifierType === modType.modifier_type_id}
                        onChange={(e) => handleRadioChange('modifierType', parseInt(e.target.value))}
                      />
                      <span className="radio-text">{modType.modifier_type_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* 1.3 Signs and Symptoms (Checkboxes) */}
              <div className="question-group">
                <h4>1.3 Signs and Symptoms</h4>
                <p className="question-help">Select all applicable symptoms for this problem</p>
                <div className="checkbox-options">
                  {symptoms.length > 0 ? (
                    symptoms.map(symptom => (
                      <label key={symptom.symptom_id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={(problemData.selectedSymptoms || []).includes(symptom.symptom_id)}
                          onChange={(e) => handleCheckboxChange('selectedSymptoms', symptom.symptom_id, e.target.checked)}
                        />
                        <span className="checkbox-text">{symptom.symptom_description}</span>
                      </label>
                    ))
                  ) : (
                    <p className="no-data">
                      No symptoms data available.
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="navigation-buttons">
              <button className="nav-btn next-btn" onClick={() => setCurrentSection('intervention')}>
                Continue to Intervention Scheme →
              </button>
            </div>
          </div>
        );
      }
      
      // ============ SECTION 2: INTERVENTION SCHEME ============
      else if (currentSection === 'intervention') {
        return (
          <div className="questions-container">
            <button className="back-btn" onClick={() => setCurrentSection('classification')}>
              ← Back to Classification
            </button>
            
            <h2>Assessment for {selectedProblemDetails?.problem_name}</h2>
            
            <div className="section-header">
              <h3>2. INTERVENTION SCHEME</h3>
              <div className="progress-indicator">
                <span className="progress-step completed"></span>
                <span className="progress-line"></span>
                <span className="progress-step active"></span>
                <span className="progress-line"></span>
                <span className="progress-step"></span>
              </div>
            </div>
            
            <div className="questions-form">
              {/* 2.1 Intervention Categories (Checkboxes) */}
              <div className="question-group">
                <h4>2.1 Intervention Categories</h4>
                <p className="question-help">Select applicable intervention categories</p>
                <div className="checkbox-options">
                  {interventionCategories.map(category => (
                    <label key={category.category_id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(problemData.interventionCategories || []).includes(category.category_id)}
                        onChange={(e) => handleCheckboxChange('interventionCategories', category.category_id, e.target.checked)}
                      />
                      <span className="checkbox-text">{category.category_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* 2.2 Intervention Targets */}
              <div className="question-group">
                <h4>2.2 Intervention Targets</h4>
                <p className="question-help">Select intervention targets</p>
                <div className="targets-preview">
                  <p>There are {interventionTargets.length} intervention targets available.</p>
                  <button 
                    className="nav-btn targets-btn"
                    onClick={() => setCurrentSection('targets')}
                  >
                    Select Intervention Targets →
                  </button>
                  
                  {(problemData.interventionTargets || []).length > 0 && (
                    <div className="selected-summary">
                      <p><strong>Selected:</strong> {problemData.interventionTargets.length} target(s)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="navigation-buttons">
              <button className="nav-btn back-btn" onClick={() => setCurrentSection('classification')}>
                ← Back to Classification
              </button>
              <button className="nav-btn next-btn" onClick={() => setCurrentSection('rating')}>
                Continue to Rating Scale →
              </button>
            </div>
          </div>
        );
      }
      
      // ============ SECTION 2b: INTERVENTION TARGETS ============
      else if (currentSection === 'targets') {
        const selectedTargets = problemData.interventionTargets || [];
        
        return (
          <div className="targets-container">
            <button className="back-btn" onClick={() => setCurrentSection('intervention')}>
              ← Back to Intervention Scheme
            </button>
            
            <h2>Intervention Targets for {selectedProblemDetails?.problem_name}</h2>
            <p className="selection-info">
              Selected: {selectedTargets.length} of {interventionTargets.length} targets
            </p>
            
            <div className="targets-grid">
              {interventionTargets.map(target => (
                <label key={target.target_id} className="target-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedTargets.includes(target.target_id)}
                    onChange={(e) => handleCheckboxChange('interventionTargets', target.target_id, e.target.checked)}
                  />
                  <span className="target-checkbox-text">{target.target_name}</span>
                </label>
              ))}
            </div>
            
            <div className="navigation-buttons">
              <button className="nav-btn back-btn" onClick={() => setCurrentSection('intervention')}>
                ← Back to Intervention Scheme
              </button>
              <button className="nav-btn done-btn" onClick={() => setCurrentSection('intervention')}>
                Done Selecting Targets
              </button>
            </div>
          </div>
        );
      }
      
      // ============ SECTION 3: PROBLEM RATING SCALE ============
      else if (currentSection === 'rating') {
        return (
          <div className="questions-container">
            <button className="back-btn" onClick={() => setCurrentSection('intervention')}>
              ← Back to Intervention
            </button>
            
            <h2>Assessment for {selectedProblemDetails?.problem_name}</h2>
            
            <div className="section-header">
              <h3>3. PROBLEM RATING SCALE FOR OUTCOMES</h3>
              <div className="progress-indicator">
                <span className="progress-step completed"></span>
                <span className="progress-line"></span>
                <span className="progress-step completed"></span>
                <span className="progress-line"></span>
                <span className="progress-step active"></span>
              </div>
            </div>
            
            <div className="questions-form">
              {/* 3.1 Status Rating (Radio) */}
              <div className="question-group">
                <h4>3.1 Status</h4>
                <p className="question-help">Severity of signs and symptoms (1-5 scale)</p>
                <div className="radio-options">
                  {outcomeRatings?.status?.map(rating => (
                    <label key={rating.rating_status_id} className="radio-label">
                      <input
                        type="radio"
                        name="status-rating"
                        value={rating.rating_status_label}
                        checked={problemData.ratingStatus === rating.rating_status_label}
                        onChange={(e) => handleRadioChange('ratingStatus', e.target.value)}
                      />
                      <span className="radio-text">{rating.rating_status_label}</span>
                    </label>
                  )) || (
                    // Fallback if data not loaded yet
                    <p>Loading status ratings...</p>
                  )}
                </div>
              </div>
              
              {/* 3.2 Knowledge Rating (Radio) */}
              <div className="question-group">
                <h4>3.2 Knowledge</h4>
                <p className="question-help">Client's understanding of the problem (1-5 scale)</p>
                <div className="radio-options">
                  {outcomeRatings?.knowledge?.map(rating => (
                    <label key={rating.rating_knowledge_id} className="radio-label">
                      <input
                        type="radio"
                        name="knowledge-rating"
                        value={rating.rating_knowledge_label}
                        checked={problemData.ratingKnowledge === rating.rating_knowledge_label}
                        onChange={(e) => handleRadioChange('ratingKnowledge', e.target.value)}
                      />
                      <span className="radio-text">{rating.rating_knowledge_label}</span>
                    </label>
                  )) || (
                    <p>Loading knowledge ratings...</p>
                  )}
                </div>
              </div>
              
              {/* 3.3 Behavior Rating (Radio) */}
              <div className="question-group">
                <h4>3.3 Behavior</h4>
                <p className="question-help">Appropriateness of client's behavior (1-5 scale)</p>
                <div className="radio-options">
                  {outcomeRatings?.behavior?.map(rating => (
                    <label key={rating.rating_behavior_id} className="radio-label">
                      <input
                        type="radio"
                        name="behavior-rating"
                        value={rating.rating_behavior_label}
                        checked={problemData.ratingBehavior === rating.rating_behavior_label}
                        onChange={(e) => handleRadioChange('ratingBehavior', e.target.value)}
                      />
                      <span className="radio-text">{rating.rating_behavior_label}</span>
                    </label>
                  )) || (
                    <p>Loading behavior ratings...</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="navigation-buttons">
              <button className="nav-btn back-btn" onClick={() => setCurrentSection('intervention')}>
                ← Back to Intervention
              </button>
              <button className="nav-btn next-btn" onClick={handleSubmit}>
                Complete Assessment
              </button>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Omaha System Health Assessment</h1>
        <p>Complete problem assessment with classification, intervention, and rating scales</p>
        
        {/* Backend Health Check Indicator */}
        <div className="health-check-container">
          <div
            className={`health-indicator ${backendHealth.isOnline ? 'online' : 'offline'}`}
            title={backendHealth.status}
          ></div>
          <p className="health-status">{backendHealth.status}</p>
        </div>
      </header>

      <main className="App-main">
        {renderContent()}
        
        {!showUserIdInput && !currentProblem && !showComparisonView && (
          <div className="action-buttons">
            <button className="export-btn" onClick={exportToJson}>
              Export Patient Data (JSON)
            </button>
            <div className="button-gap"></div>
            <button className="comparison-btn" onClick={handleFetchProblemsForComparison}>
              Compare Assessments
            </button>
            <div className="button-gap"></div>
            <button className="new-data-btn" onClick={handleNewAssessment}>
              New Assessment
            </button>
            <div className="button-gap"></div>
            <button className="reset-btn" onClick={handleReset}>
              Reset All
            </button>
          </div>
        )}
        
        {showComparisonView && (
          <div className="action-buttons">
            <button className="new-data-btn" onClick={handleNewAssessment}>
              New Assessment
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;