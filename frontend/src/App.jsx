import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api } from './api.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  // Patient information state
  const [patientInfo, setPatientInfo] = useState({
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
  const [showSelectPatient, setShowSelectPatient] = useState(false);
  const [showPatientProblems, setShowPatientProblems] = useState(false);
  const [currentDomain, setCurrentDomain] = useState(null);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState({});
  const [currentPatientId, setCurrentPatientId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [patientProblems, setPatientProblems] = useState({});
  const [patientProblemsList, setPatientProblemsList] = useState([]);
  const [selectedProblemForDetails, setSelectedProblemForDetails] = useState(null);
  const [showProblemDetails, setShowProblemDetails] = useState(false);

  // State for handling duplicate TIN
  const [duplicateTINError, setDuplicateTINError] = useState(null);
  const [existingPatient, setExistingPatient] = useState(null);

  // State for selecting existing patient
  const [searchTIN, setSearchTIN] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);

  // Comparison state
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [availableProblems, setAvailableProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [comparisonData, setComparisonData] = useState({ older: null, newer: null });
  const [showComparisonResult, setShowComparisonResult] = useState(false);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [exportDestination, setExportDestination] = useState('download');

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
        const response = await fetch(`${API_BASE_URL}/api/v1/health`);
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
    fetch(`${API_BASE_URL}/api/v1/static/consent-definitions`)
      .then(response => response.json())
      .then(data => {
        console.log('Consent definitions loaded:', data.length);
        setConsentDefinitions(data);

        // Initialize consents in patientInfo with default false values
        const initialConsents = {};
        data.forEach(consent => {
          initialConsents[consent.consent_definition_id] = false;
        });

        setPatientInfo(prev => ({
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
      fetch(`${API_BASE_URL}/api/v1/static/domains`)
        .then(response => response.json())
        .then(data => {
          console.log('Domains loaded:', data.length);
          setDomains(data);

          // Load modifier types
          return fetch(`${API_BASE_URL}/api/v1/static/modifier-types`);
        })
        .then(response => response.json())
        .then(data => {
          console.log('Modifier types loaded:', data.length);
          setModifierTypes(data);

          // Load modifier domains
          return fetch(`${API_BASE_URL}/api/v1/static/modifier-domains`);
        })
        .then(response => response.json())
        .then(data => {
          console.log('Modifier domains loaded:', data.length);
          setModifierDomains(data);

          // Load intervention categories
          return fetch(`${API_BASE_URL}/api/v1/static/intervention-categories`);
        })
        .then(response => response.json())
        .then(data => {
          console.log('Intervention categories loaded:', data.length);
          setInterventionCategories(data);

          // Load intervention targets
          return fetch(`${API_BASE_URL}/api/v1/static/intervention-targets`);
        })
        .then(response => response.json())
        .then(data => {
          console.log('Intervention targets loaded:', data.length);
          setInterventionTargets(data);

          // Load outcome ratings
          return fetch(`${API_BASE_URL}/api/v1/static/outcome-ratings`);
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
      fetch(`${API_BASE_URL}/api/v1/static/problems?domain_id=${currentDomain}`)
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
      fetch(`${API_BASE_URL}/api/v1/static/symptoms?problem_id=${currentProblem}`)
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
  const handlePatientInfoChange = (field, value) => {
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

    setPatientInfo(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  const handleConsentChange = (consentId, hasConsented) => {
    setPatientInfo(prev => ({
      ...prev,
      consents: {
        ...prev.consents,
        [consentId]: hasConsented
      }
    }));
  };

  // Validation functions
  const validatePatientInfo = () => {
    const errors = [];

    // Name validation (letters only)
    if (!patientInfo.firstName.trim() || !/^[a-zA-Z\s]+$/.test(patientInfo.firstName.trim())) {
      errors.push('First name must contain only letters');
    }

    if (!patientInfo.lastName.trim() || !/^[a-zA-Z\s]+$/.test(patientInfo.lastName.trim())) {
      errors.push('Last name must contain only letters');
    }

    // Birthdate validation - now mandatory
    if (!patientInfo.dateOfBirth) {
      errors.push('Date of birth is required');
    } else {
      const birthDate = new Date(patientInfo.dateOfBirth);
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
    if (patientInfo.phoneNumber && patientInfo.phoneNumber.length > 17) {
      errors.push('Phone number cannot exceed 17 digits');
    }

    // TIN validation (now mandatory and exactly 11 digits)
    if (!patientInfo.tin) {
      errors.push('TIN is required');
    } else if (patientInfo.tin.length !== 11) {
      errors.push('TIN must be exactly 11 digits');
    }

    // Consent validation
    if (consentDefinitions.length > 0) {
      const mandatoryConsents = consentDefinitions.filter(c => c.is_mandatory);
      for (const consent of mandatoryConsents) {
        if (!patientInfo.consents[consent.consent_definition_id]) {
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

  // Handler for "Start Assessment" button - creates new patient and goes to domain selection
  const handleStartAssessment = async () => {
    // Reset error states
    setDuplicateTINError(null);
    setExistingPatient(null);

    // Validate all fields
    const errors = validatePatientInfo();

    if (errors.length > 0) {
      alert('Please fix the following errors:\n' + errors.join('\n'));
      return;
    }

    setLoading(true);

    try {
      // First check if a patient with this TIN already exists
      const existing = await checkExistingPatient(patientInfo.tin);

      if (existing) {
        // Patient with this TIN already exists
        setExistingPatient(existing);
        setDuplicateTINError(`A patient with TIN ${patientInfo.tin} already exists.`);
        setLoading(false);
        return;
      }

      // Prepare patient data for API
      const patientData = {
        first_name: patientInfo.firstName,
        last_name: patientInfo.lastName,
        date_of_birth: patientInfo.dateOfBirth,
        phone_number: patientInfo.phoneNumber || null,
        address: patientInfo.address || null,
        tin: patientInfo.tin,
        consents: Object.entries(patientInfo.consents).map(([consentId, hasConsented]) => ({
          consent_definition_id: parseInt(consentId),
          has_consented: hasConsented
        }))
      };

      // Create patient in backend
      const response = await api.createPatient(patientData);
      const patient = response.data;

      // Store patient ID for subsequent operations
      setCurrentPatientId(patient.patient_id);

      // Set up for domain selection (skip patient problems view)
      setShowUserIdInput(false);
      setShowSelectPatient(false);
      setShowPatientProblems(false);
      // Domain selection will be shown automatically since currentDomain is null

      console.log('Patient created successfully for new assessment:', patient);
    } catch (error) {
      console.error('Error creating patient:', error);

      // Check if this is a TIN uniqueness constraint error
      if (error.response?.data?.detail && error.response.data.detail.includes('UNIQUE constraint failed')) {
        setDuplicateTINError(`A patient with TIN ${patientInfo.tin} already exists.`);
        // Try to get the existing patient details
        const existing = await checkExistingPatient(patientInfo.tin);
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

  // Handler for "Select Existing Patient" button - goes to patient selection page
  const handleSelectExistingPatient = () => {
    // Reset error states
    setDuplicateTINError(null);
    setExistingPatient(null);

    // Show the patient selection view
    setShowSelectPatient(true);
  };


  // Function to use existing patient
  const handleUseExistingPatient = () => {
    console.log('handleUseExistingPatient called with existingPatient:', existingPatient);
    if (existingPatient) {
      setCurrentPatientId(existingPatient.patient_id);

      // Update patient info with existing patient data
      setPatientInfo({
        firstName: existingPatient.first_name,
        lastName: existingPatient.last_name,
        dateOfBirth: existingPatient.date_of_birth,
        phoneNumber: existingPatient.phone_number || '',
        address: existingPatient.address || '',
        tin: existingPatient.tin,
        consents: patientInfo.consents // Keep current consents
      });

      // Reset error states
      setDuplicateTINError(null);
      setExistingPatient(null);

      console.log('About to call handlePatientSelected from handleUseExistingPatient');
      // Use the unified patient selection handler
      handlePatientSelected();
    }
  };

  // Function to enter a different TIN
  const handleEnterDifferentTIN = () => {
    setDuplicateTINError(null);
    setExistingPatient(null);
    setPatientInfo(prev => ({
      ...prev,
      tin: ''
    }));
  };

  // Function to search for patients by TIN
  const handleSearchPatient = async () => {
    if (!searchTIN || searchTIN.length !== 11) {
      setSearchError('Please enter a valid 11-digit TIN');
      return;
    }

    setLoading(true);
    setSearchError(null);

    try {
      const response = await api.getPatients(searchTIN);
      const patients = response.data;

      if (patients.length === 0) {
        setSearchError('No patient found with this TIN');
        setSearchResults([]);
      } else {
        setSearchResults(patients);
        setSearchError(null);
      }
    } catch (error) {
      console.error('Error searching for patient:', error);
      setSearchError('Error searching for patient: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to select a patient from search results
  const handleSelectPatient = (patient) => {
    console.log('handleSelectPatient called with patient:', patient);
    setCurrentPatientId(patient.patient_id);

    // Update patient info with selected patient data
    setPatientInfo({
      firstName: patient.first_name,
      lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth,
      phoneNumber: patient.phone_number || '',
      address: patient.address || '',
      tin: patient.tin,
      consents: patientInfo.consents // Keep current consents
    });

    // Reset search states
    setSearchTIN('');
    setSearchResults([]);
    setSearchError(null);
    setShowSelectPatient(false);

    // For existing patients, always show the problems view
    // This will trigger the useEffect to fetch and display patient problems
    setShowUserIdInput(false);
    setShowPatientProblems(true);
  };

  // Function to go back from select patient view
  const handleBackFromSelectPatient = () => {
    setSearchTIN('');
    setSearchResults([]);
    setSearchError(null);
    setShowSelectPatient(false);
  };

  // Function to fetch patient problems
  const fetchPatientProblems = useCallback(async () => {
    console.log('=== fetchPatientProblems called ===');
    console.log('currentPatientId:', currentPatientId);
    if (!currentPatientId) {
      console.log('No currentPatientId, returning early');
      return [];
    }
    console.log('currentPatientId exists, proceeding with API call');

    setLoading(true);
    try {
      // Use the care plan endpoint instead which includes all related data
      console.log('Calling api.getCarePlan with patient ID:', currentPatientId);
      const response = await api.getCarePlan(currentPatientId);
      console.log('Care plan response:', response);
      console.log('Response data:', response.data);

      let problems = response.data.active_problems || [];
      console.log('Patient problems from care plan:', problems);
      console.log('Number of problems:', problems.length);

      // Fetch scores for each problem to get the actual rating values
      if (problems.length > 0) {
        console.log('Fetching scores for each problem...');

        // Create an array of promises to fetch scores for each problem
        const scorePromises = problems.map(async (problem) => {
          try {
            console.log(`Fetching scores for problem ${problem.patient_problem_id}`);
            const scoresResponse = await api.getProblemScores(currentPatientId, problem.patient_problem_id);
            console.log(`Scores for problem ${problem.patient_problem_id}:`, scoresResponse.data);

            // Get the latest score (first in the array as they're ordered by date_recorded DESC)
            const latestScore = scoresResponse.data.length > 0 ? scoresResponse.data[0] : null;

            // Map rating IDs to labels using the outcomeRatings state
            let outcomeData = {
              status: 'Not recorded',
              knowledge: 'Not recorded',
              behavior: 'Not recorded'
            };

            if (latestScore) {
              console.log('Latest score found:', latestScore);
              // The API already includes rating labels in the score object
              // Use them directly if available, otherwise fall back to mapping
              outcomeData = {
                status: latestScore.status_rating?.rating_status_label || getRatingLabel(latestScore.status_rating?.rating_status_id, 'status'),
                knowledge: latestScore.knowledge_rating?.rating_knowledge_label || getRatingLabel(latestScore.knowledge_rating?.rating_knowledge_id, 'knowledge'),
                behavior: latestScore.behavior_rating?.rating_behavior_label || getRatingLabel(latestScore.behavior_rating?.rating_behavior_id, 'behavior')
              };
              console.log('Mapped outcome data:', outcomeData);
            }

            return {
              ...problem,
              latest_score: latestScore,
              outcomeData: outcomeData
            };
          } catch (error) {
            console.error(`Error fetching scores for problem ${problem.patient_problem_id}:`, error);
            // Return the problem without scores if there's an error
            return {
              ...problem,
              latest_score: null,
              outcomeData: {
                status: 'Not recorded',
                knowledge: 'Not recorded',
                behavior: 'Not recorded'
              }
            };
          }
        });

        // Wait for all score fetches to complete
        problems = await Promise.all(scorePromises);
        console.log('Problems with scores:', problems);
      }

      // Ensure we have an array even if undefined
      setPatientProblemsList(Array.isArray(problems) ? problems : []);
      return Array.isArray(problems) ? problems : [];
    } catch (error) {
      console.error('Error fetching patient problems:', error);
      console.error('Error response:', error.response);
      alert('Error fetching patient problems: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
      setPatientProblemsList([]); // Ensure empty array on error
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentPatientId]);

  // Effect to fetch patient problems when showPatientProblems is true
  useEffect(() => {
    if (showPatientProblems && currentPatientId) {
      console.log('useEffect triggered: showPatientProblems is true and currentPatientId exists');
      fetchPatientProblems();
    }
  }, [showPatientProblems, currentPatientId, fetchPatientProblems]);

  // Function to handle patient selection (both from search and existing patient)
  const handlePatientSelected = () => {
    console.log('handlePatientSelected called');
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
    setShowSelectPatient(false);

    // Check if patient has existing problems
    if (currentPatientId) {
      console.log('Checking if patient has existing problems...');
      fetchPatientProblems().then(problems => {
        if (problems && problems.length > 0) {
          console.log('Patient has existing problems, showing problems view');
          setShowPatientProblems(true);
        } else {
          console.log('Patient has no existing problems, showing domain selection');
          setShowPatientProblems(false);
          // Domain selection will be shown automatically since currentDomain is null
        }
      });
    }
  };

  // Function to handle "Add New Problem" button
  const handleAddNewProblem = () => {
    setShowPatientProblems(false);
    setCurrentDomain(null); // Reset domain to show domain selection
    // Show domain selection (existing flow)
  };

  // Function to handle viewing problem details
  const handleViewProblemDetails = (problem) => {
    setSelectedProblemForDetails(problem);
    setShowProblemDetails(true);
    setShowPatientProblems(false);
  };

  // Function to handle back from problem details
  const handleBackFromProblemDetails = () => {
    setShowProblemDetails(false);
    setSelectedProblemForDetails(null);
    setShowPatientProblems(true);
  };

  // Function to handle updating problem active status
  const handleUpdateProblemStatus = async (problem, isActive) => {
    try {
      await api.updatePatientProblem(currentPatientId, problem.patient_problem_id, { is_active: isActive });
      alert(`Problem marked as ${isActive ? 'active' : 'inactive'}`);
      fetchPatientProblems(); // Refresh the list
    } catch (error) {
      console.error('Error updating problem status:', error);
      alert('Error updating problem status: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    }
  };

  // Function to handle adding new outcome score
  // eslint-disable-next-line no-unused-vars
  const handleAddOutcomeScore = async (problem, scoreData) => {
    try {
      await api.createOutcomeScore(currentPatientId, problem.patient_problem_id, scoreData);
      alert('New assessment score added successfully!');
      fetchPatientProblems(); // Refresh the list
    } catch (error) {
      console.error('Error adding outcome score:', error);
      alert('Error adding assessment score: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    }
  };

  const handleNewAssessment = () => {
    // Clear ALL state
    setPatientInfo({
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
    setShowPatientProblems(false); // Hide patient problems view
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

  // Handler for rating-only assessment (for existing problems)
  const handleSubmitRatingOnly = async () => {
    try {
      const problemData = responses[currentDomain]?.[currentProblem];

      if (!problemData?.ratingStatus || !problemData?.ratingKnowledge || !problemData?.ratingBehavior) {
        alert('Please complete all rating fields (Status, Knowledge, and Behavior)');
        return;
      }

      setLoading(true);

      // Add outcome score to existing problem
      const scoreData = {
        phase_id: 1, // Default phase ID
        rating_knowledge_id: getRatingId(problemData.ratingKnowledge, 'knowledge'),
        rating_behavior_id: getRatingId(problemData.ratingBehavior, 'behavior'),
        rating_status_id: getRatingId(problemData.ratingStatus, 'status')
      };

      await api.createOutcomeScore(currentPatientId, selectedProblemForDetails.patient_problem_id, scoreData);
      console.log('New outcome score added to existing problem');

      alert('Assessment rating saved successfully!');

      // Go back to problem details
      setCurrentSection(null);
      setCurrentProblem(null);
      setShowProblemDetails(true);

    } catch (error) {
      console.error('Error in handleSubmitRatingOnly:', error);
      alert('Error saving assessment rating: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Handler for updating problem (creates new problem with updated ratings)
  const handleSubmitUpdateProblem = async () => {
    try {
      const problemData = responses[currentDomain]?.[currentProblem];

      if (!problemData?.ratingStatus || !problemData?.ratingKnowledge || !problemData?.ratingBehavior) {
        alert('Please complete all rating fields (Status, Knowledge, and Behavior)');
        return;
      }

      setLoading(true);

      // 1. Create a new patient problem with the same details as the existing problem
      const problemCreateData = {
        problem_id: parseInt(currentProblem),
        modifier_domain_id: selectedProblemForDetails.modifier_domain_id,
        modifier_type_id: selectedProblemForDetails.modifier_type_id
      };

      const problemResponse = await api.createPatientProblem(currentPatientId, problemCreateData);
      const newPatientProblem = problemResponse.data;
      console.log('New patient problem created for update:', newPatientProblem);

      // 2. Copy symptoms from the existing problem to the new problem
      if (selectedProblemForDetails.symptoms && selectedProblemForDetails.symptoms.length > 0) {
        for (const symptom of selectedProblemForDetails.symptoms) {
          const symptomData = {
            symptom_id: symptom.symptom_id,
            symptom_comment: symptom.symptom_comment || null
          };
          await api.addSymptomToProblem(currentPatientId, newPatientProblem.patient_problem_id, symptomData);
        }
        console.log('Symptoms copied to new problem');
      }

      // 3. Copy interventions from the existing problem to the new problem
      if (selectedProblemForDetails.interventions && selectedProblemForDetails.interventions.length > 0) {
        for (const intervention of selectedProblemForDetails.interventions) {
          const interventionData = {
            category_id: intervention.category_id,
            target_id: intervention.target_id,
            specific_details: intervention.specific_details || null
          };
          await api.createIntervention(currentPatientId, newPatientProblem.patient_problem_id, interventionData);
        }
        console.log('Interventions copied to new problem');
      }

      // 4. Add the new outcome score to the new problem
      const scoreData = {
        phase_id: 1, // Default phase ID
        rating_knowledge_id: getRatingId(problemData.ratingKnowledge, 'knowledge'),
        rating_behavior_id: getRatingId(problemData.ratingBehavior, 'behavior'),
        rating_status_id: getRatingId(problemData.ratingStatus, 'status')
      };

      await api.createOutcomeScore(currentPatientId, newPatientProblem.patient_problem_id, scoreData);
      console.log('New outcome score added to updated problem');

      // 5. Mark the original problem as inactive
      await api.updatePatientProblem(currentPatientId, selectedProblemForDetails.patient_problem_id, { is_active: false });
      console.log('Original problem marked as inactive');

      alert('Problem updated successfully! A new problem record has been created with updated ratings.');

      // Go back to problems view to see the updated list
      setCurrentSection(null);
      setCurrentProblem(null);
      setShowProblemDetails(false);
      setShowPatientProblems(true);
      fetchPatientProblems(); // Refresh the problems list

    } catch (error) {
      console.error('Error in handleSubmitUpdateProblem:', error);
      alert('Error updating problem: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
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

  // Helper function to get rating label from ID
  const getRatingLabel = (ratingId, type) => {
    if (!outcomeRatings || !outcomeRatings[type]) {
      console.log(`Missing outcomeRatings for type ${type}:`, outcomeRatings);
      return 'Not recorded';
    }

    const rating = outcomeRatings[type].find(r => r[`rating_${type}_id`] === ratingId);
    console.log(`Looking for ${type} rating with ID ${ratingId}:`, rating);
    return rating ? rating[`rating_${type}_label`] : 'Not recorded';
  };

  const exportToJson = async () => {
    // Check if we have at least a name for the file
    if (!patientInfo.firstName.trim() && !patientInfo.lastName.trim()) {
      alert('Please enter patient information before exporting');
      return;
    }

    // If we have a patient ID, show export modal
    if (currentPatientId) {
      setShowExportModal(true);
    } else {
      alert('No patient data to export. Please complete an assessment first.');
    }
  };

  const handleExportConfirm = async () => {
    try {
      setLoading(true);
      setShowExportModal(false);

      // Get the care plan from backend
      const response = await api.exportPatientData(currentPatientId, exportFormat, exportDestination);
      console.log('Export data:', response.data);

      if (exportDestination === 'group_office') {
        if (response.data && response.data.status === 'success') {
          alert(`Successfully exported to Group Office! Note ID: ${response.data.note_id}`);
        } else {
          alert('Export to Group Office completed, but status is unknown.');
        }
        return;
      }

      let blob, fileName, mimeType;

      if (exportFormat === 'json') {
        const jsonData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
        blob = new Blob([jsonData], { type: 'application/json' });
        fileName = `patient_data_${patientInfo.firstName}_${patientInfo.lastName}_${Date.now()}.json`;
        mimeType = 'application/json';
      } else if (exportFormat === 'txt') {
        const textData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
        blob = new Blob([textData], { type: 'text/plain' });
        fileName = `patient_data_${patientInfo.firstName}_${patientInfo.lastName}_${Date.now()}.txt`;
        mimeType = 'text/plain';
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`Patient data exported as ${exportFormat.toUpperCase()} successfully!`);

    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCancel = () => {
    setShowExportModal(false);
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

      // Create a local function to get rating labels using the fetched data directly
      const getRatingLabelFromData = (ratingId, type) => {
        if (!outcomeRatings || !outcomeRatings[type]) {
          console.log(`Missing outcomeRatings for type ${type}:`, outcomeRatings);
          return 'Not recorded';
        }

        const rating = outcomeRatings[type].find(r => r[`rating_${type}_id`] === ratingId);
        console.log(`Looking for ${type} rating with ID ${ratingId}:`, rating);
        return rating ? rating[`rating_${type}_label`] : 'Not recorded';
      };

      // Get care plan which includes all problems with their details
      const response = await api.getCarePlan(currentPatientId);
      const problems = response.data.active_problems || [];
      console.log('Problems from API:', problems);

      // Extract all scores with their dates for each problem
      const problemScores = [];

      // First fetch scores for each problem to get actual rating values
      if (problems.length > 0) {
        console.log('Fetching scores for comparison problems...');

        // Create an array of promises to fetch scores for each problem
        const scorePromises = problems.map(async (problem) => {
          try {
            console.log(`Fetching scores for comparison problem ${problem.patient_problem_id}`);
            const scoresResponse = await api.getProblemScores(currentPatientId, problem.patient_problem_id);
            console.log(`Scores for comparison problem ${problem.patient_problem_id}:`, scoresResponse.data);

            // Get the latest score (first in the array as they're ordered by date_recorded DESC)
            const latestScore = scoresResponse.data.length > 0 ? scoresResponse.data[0] : null;

            // Map rating IDs to labels using the local function with fetched outcomeRatings data
            let outcomeData = {
              status: 'Not recorded',
              knowledge: 'Not recorded',
              behavior: 'Not recorded'
            };

            if (latestScore) {
              console.log('Latest score found:', latestScore);
              // The API already includes the rating labels in the score object
              // Use them directly if available, otherwise fall back to mapping
              outcomeData = {
                status: latestScore.status_rating?.rating_status_label || getRatingLabelFromData(latestScore.status_rating?.rating_status_id, 'status'),
                knowledge: latestScore.knowledge_rating?.rating_knowledge_label || getRatingLabelFromData(latestScore.knowledge_rating?.rating_knowledge_id, 'knowledge'),
                behavior: latestScore.behavior_rating?.rating_behavior_label || getRatingLabelFromData(latestScore.behavior_rating?.rating_behavior_id, 'behavior')
              };
              console.log('Mapped outcome data:', outcomeData);
            }

            return {
              ...problem,
              latest_score: latestScore,
              outcomeData: outcomeData
            };
          } catch (error) {
            console.error(`Error fetching scores for comparison problem ${problem.patient_problem_id}:`, error);
            // Return problem without scores if there's an error
            return {
              ...problem,
              latest_score: null,
              outcomeData: {
                status: 'Not recorded',
                knowledge: 'Not recorded',
                behavior: 'Not recorded'
              }
            };
          }
        });

        // Wait for all score fetches to complete
        const problemsWithScores = await Promise.all(scorePromises);
        console.log('Problems with scores for comparison:', problemsWithScores);

        // Now process the problems with their scores
        problemsWithScores.forEach(problem => {
          console.log('Processing problem for comparison:', problem);
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

          // Use the outcomeData that was created when fetching scores
          const outcomeData = problem.outcomeData || {
            status: 'Not recorded',
            knowledge: 'Not recorded',
            behavior: 'Not recorded'
          };

          console.log('Using outcomeData for comparison:', outcomeData);

          const dateRecorded = problem.latest_score?.date_recorded || problem.created_at || new Date().toISOString();

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
            date_recorded: dateRecorded,
            score_data: outcomeData, // Use the outcomeData directly
            problem_data: syntheticProblemData
          });
        });
      }

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
            Patient: <strong>{patientInfo.firstName} {patientInfo.lastName}</strong>
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

                  <h4>Problem Rating Scale for Outcomes</h4>
                  <p><strong>Status:</strong> {comparisonData.older.score_data?.status || 'Not recorded'}</p>
                  <p><strong>Knowledge:</strong> {comparisonData.older.score_data?.knowledge || 'Not recorded'}</p>
                  <p><strong>Behavior:</strong> {comparisonData.older.score_data?.behavior || 'Not recorded'}</p>

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

                  <h4>Problem Rating Scale for Outcomes</h4>
                  <p><strong>Status:</strong> {comparisonData.newer.score_data?.status || 'Not recorded'}</p>
                  <p><strong>Knowledge:</strong> {comparisonData.newer.score_data?.knowledge || 'Not recorded'}</p>
                  <p><strong>Behavior:</strong> {comparisonData.newer.score_data?.behavior || 'Not recorded'}</p>

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
            Patient: <strong>{patientInfo.firstName} {patientInfo.lastName}</strong>
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

    if (showSelectPatient) {
      return (
        <div className="select-patient-container">
          <button className="back-btn" onClick={handleBackFromSelectPatient}>
            ← Back
          </button>
          <h2>Select Existing Patient</h2>
          <div className="search-patient-form">
            <div className="form-group">
              <label>Enter Patient TIN</label>
              <input
                type="text"
                value={searchTIN}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setSearchTIN(value);
                }}
                placeholder="12345678901"
                className="form-field"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength="11"
              />
              <small className="form-hint">Enter exactly 11 digits</small>
            </div>

            <button
              className="search-patient-btn"
              onClick={handleSearchPatient}
              disabled={loading || !searchTIN || searchTIN.length !== 11}
            >
              {loading ? 'Searching...' : 'Search Patient'}
            </button>

            {searchError && (
              <div className="search-error">
                <p>{searchError}</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="search-results">
                <h3>Search Results</h3>
                {searchResults.map(patient => (
                  <div key={patient.patient_id} className="patient-result-card">
                    <div className="patient-info">
                      <p><strong>Name:</strong> {patient.first_name} {patient.last_name}</p>
                      <p><strong>TIN:</strong> {patient.tin}</p>
                      <p><strong>Date of Birth:</strong> {patient.date_of_birth}</p>
                      <p><strong>Phone:</strong> {patient.phone_number || 'Not provided'}</p>
                      <p><strong>Address:</strong> {patient.address || 'Not provided'}</p>
                    </div>
                    <button
                      className="select-patient-result-btn"
                      onClick={() => handleSelectPatient(patient)}
                    >
                      Select This Patient
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (showPatientProblems) {
      console.log('=== PATIENT PROBLEMS VIEW RENDERING ===');
      console.log('showPatientProblems is true');
      console.log('currentPatientId:', currentPatientId);
      console.log('patientProblemsList:', patientProblemsList);
      console.log('patientProblemsList length:', patientProblemsList.length);
      return (
        <div className="patient-problems-container">
          <button className="back-btn" onClick={handleNewAssessment}>
            ← Back to Patient Selection
          </button>
          <h2>Patient Problems</h2>
          <p className="user-id-display">
            Patient: <strong>{patientInfo.firstName} {patientInfo.lastName}</strong>
            {patientInfo.dateOfBirth && ` • DOB: ${patientInfo.dateOfBirth}`}
          </p>

          <div className="problems-actions">
            <button
              className="add-problem-btn"
              onClick={handleAddNewProblem}
            >
              Add New Problem →
            </button>
          </div>

          {loading ? (
            <div className="loading-container">
              <h3>Loading patient problems...</h3>
            </div>
          ) : (
            <div className="patient-problems-list">
              {patientProblemsList.length > 0 ? (
                <div className="problems-grid">
                  {patientProblemsList.map(problem => (
                    <div key={problem.patient_problem_id} className="problem-tile" onClick={() => handleViewProblemDetails(problem)}>
                      <h3>{problem.problem?.problem_name || 'Unknown Problem'}</h3>
                      <p className="problem-date">
                        Created: {new Date(problem.created_at).toLocaleDateString()}
                      </p>
                      <div className="problem-info">
                        <p><strong>Domain:</strong> {problem.modifier_domain?.modifier_domain_name || 'Unknown'}</p>
                        <p><strong>Type:</strong> {problem.modifier_type?.modifier_type_name || 'Unknown'}</p>
                        <p><strong>Status:</strong>
                          <span className={`problem-status ${problem.is_active ? 'active' : 'inactive'}`}>
                            {problem.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                        {problem.latest_score && (
                          <div className="latest-score">
                            <p><strong>Latest Assessment:</strong> {new Date(problem.latest_score.date_recorded).toLocaleDateString()}</p>
                            <p><strong>Status:</strong> {problem.latest_score.status_rating?.rating_status_label || 'Not recorded'}</p>
                            <p><strong>Knowledge:</strong> {problem.latest_score.knowledge_rating?.rating_knowledge_label || 'Not recorded'}</p>
                            <p><strong>Behavior:</strong> {problem.latest_score.behavior_rating?.rating_behavior_label || 'Not recorded'}</p>
                          </div>
                        )}
                      </div>
                      <div className="problem-actions">
                        <button
                          className="view-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProblemDetails(problem);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-problems">
                  <p>No problems found for this patient.</p>
                  <button
                    className="add-first-problem-btn"
                    onClick={handleAddNewProblem}
                  >
                    Add First Problem →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (showProblemDetails && selectedProblemForDetails) {
      return (
        <div className="problem-details-container">
          <button className="back-btn" onClick={handleBackFromProblemDetails}>
            ← Back to Problems
          </button>
          <h2>Problem Details</h2>
          <p className="user-id-display">
            Patient: <strong>{patientInfo.firstName} {patientInfo.lastName}</strong>
          </p>

          <div className="problem-details-content">
            <div className="problem-header">
              <h3>{selectedProblemForDetails.problem?.problem_name || 'Unknown Problem'}</h3>
              <div className="problem-meta">
                <p><strong>Domain:</strong> {selectedProblemForDetails.modifier_domain?.modifier_domain_name || 'Unknown'}</p>
                <p><strong>Type:</strong> {selectedProblemForDetails.modifier_type?.modifier_type_name || 'Unknown'}</p>
                <p><strong>Status:</strong>
                  <span className={`problem-status ${selectedProblemForDetails.is_active ? 'active' : 'inactive'}`}>
                    {selectedProblemForDetails.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <p><strong>Created:</strong> {new Date(selectedProblemForDetails.created_at).toLocaleDateString()}</p>
                {selectedProblemForDetails.latest_score && (
                  <div className="latest-score-details">
                    <h4>Latest Assessment</h4>
                    <p><strong>Date:</strong> {new Date(selectedProblemForDetails.latest_score.date_recorded).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> {selectedProblemForDetails.latest_score.status_rating?.rating_status_label || 'Not recorded'}</p>
                    <p><strong>Knowledge:</strong> {selectedProblemForDetails.latest_score.knowledge_rating?.rating_knowledge_label || 'Not recorded'}</p>
                    <p><strong>Behavior:</strong> {selectedProblemForDetails.latest_score.behavior_rating?.rating_behavior_label || 'Not recorded'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="problem-actions-section">
              {selectedProblemForDetails.is_active && (
                <div className="action-group">
                  <h4>Update Problem</h4>
                  <p>Add new status, knowledge, and behavior ratings for this problem:</p>
                  <button
                    className="add-assessment-btn"
                    onClick={() => {
                      // Set up for rating-only update flow
                      const setupUpdateAssessment = async () => {
                        try {
                          // Use existing problem details instead of fetching fresh data
                          const problemDetails = selectedProblemForDetails;

                          if (problemDetails) {
                            setSelectedProblemDetails(problemDetails);
                            setCurrentDomain(problemDetails.problem?.domain_id);
                            setCurrentProblem(problemDetails.problem_id);
                            setCurrentSection('update-problem-rating'); // Go directly to rating section
                            setShowProblemDetails(false);
                          }
                        } catch (error) {
                          console.error('Error setting up update assessment:', error);
                          alert('Error setting up update assessment: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
                        }
                      };

                      setupUpdateAssessment();
                    }}
                  >
                    Update Problem
                  </button>
                </div>
              )}

              <div className="action-group">
                <h4>Problem Status</h4>
                <p>Mark this problem as active or inactive:</p>
                <div className="status-buttons">
                  {selectedProblemForDetails.is_active ? (
                    <button
                      className="mark-inactive-btn"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to mark this problem as inactive?')) {
                          handleUpdateProblemStatus(selectedProblemForDetails, false);
                        }
                      }}
                    >
                      Mark as Inactive
                    </button>
                  ) : (
                    <button
                      className="mark-active-btn"
                      onClick={() => handleUpdateProblemStatus(selectedProblemForDetails, true)}
                    >
                      Mark as Active
                    </button>
                  )}
                </div>
              </div>

              {!selectedProblemForDetails.is_active && (
                <div className="inactive-notice">
                  <p><strong>Note:</strong> This problem is inactive. You cannot add new assessments to inactive problems.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (showUserIdInput) {
      return (
        <div className="user-id-container">
          <h2>Enter Patient Information</h2>
          <div className="patient-info-form">
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={patientInfo.firstName}
                  onChange={(e) => handlePatientInfoChange('firstName', e.target.value)}
                  placeholder="Petras"
                  className="form-field"
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={patientInfo.lastName}
                  onChange={(e) => handlePatientInfoChange('lastName', e.target.value)}
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
                  value={patientInfo.dateOfBirth}
                  onChange={(e) => handlePatientInfoChange('dateOfBirth', e.target.value)}
                  className="form-field"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={patientInfo.phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    handlePatientInfoChange('phoneNumber', value);
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
                  value={patientInfo.address}
                  onChange={(e) => handlePatientInfoChange('address', e.target.value)}
                  placeholder="Enter full address"
                  className="form-field address-field"
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>TIN (Tax Identification Number) *</label>
                <input
                  type="text"
                  value={patientInfo.tin}
                  onChange={(e) => handlePatientInfoChange('tin', e.target.value)}
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
                          checked={patientInfo.consents[consent.consent_definition_id] || false}
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

            <div className="button-row">
              <button className="user-id-submit" onClick={handleStartAssessment}>
                Start Assessment →
              </button>
              <button
                className="select-patient-btn"
                onClick={handleSelectExistingPatient}
              >
                Select Existing Patient →
              </button>
            </div>

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
            Patient: <strong>{patientInfo.firstName} {patientInfo.lastName}</strong>
            {patientInfo.dateOfBirth && ` • DOB: ${patientInfo.dateOfBirth}`}
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
              <div className="left-buttons">
                <button className="nav-btn back-btn" onClick={() => {
                  setCurrentSection(null);
                  setCurrentProblem(null);
                  setShowPatientProblems(true);
                  setShowProblemDetails(false);
                }}>
                  ← Back to Problems
                </button>
              </div>
              <button className="nav-btn patient-problems-btn" onClick={() => {
                setCurrentSection(null);
                setCurrentProblem(null);
                setShowPatientProblems(true);
                setShowProblemDetails(false);
              }}>
                to Patient Problems
              </button>
              <div className="right-buttons">
                <button className="nav-btn next-btn" onClick={() => setCurrentSection('intervention')}>
                  Continue to Intervention Scheme →
                </button>
              </div>
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
              <div className="left-buttons">
                <button className="nav-btn back-btn" onClick={() => setCurrentSection('classification')}>
                  ← Back to Classification
                </button>
              </div>
              <button className="nav-btn patient-problems-btn" onClick={() => {
                setCurrentSection(null);
                setCurrentProblem(null);
                setShowPatientProblems(true);
                setShowProblemDetails(false);
              }}>
                to Patient Problems
              </button>
              <div className="right-buttons">
                <button className="nav-btn next-btn" onClick={() => setCurrentSection('rating')}>
                  Continue to Rating Scale →
                </button>
              </div>
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
              <button className="nav-btn patient-problems-btn" onClick={() => {
                setCurrentSection(null);
                setCurrentProblem(null);
                setShowPatientProblems(true);
                setShowProblemDetails(false);
              }}>
                ← to Patient Problems
              </button>
              <div className="right-buttons">
                <button className="nav-btn back-btn" onClick={() => setCurrentSection('intervention')}>
                  ← Back to Intervention Scheme
                </button>
                <button className="nav-btn done-btn" onClick={() => setCurrentSection('intervention')}>
                  Done Selecting Targets
                </button>
              </div>
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
                <p className="question-help">Patient's understanding of the problem (1-5 scale)</p>
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
                <p className="question-help">Appropriateness of patient's behavior (1-5 scale)</p>
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
              <div className="left-buttons">
                <button className="nav-btn back-btn" onClick={() => setCurrentSection('intervention')}>
                  ← Back to Intervention
                </button>
              </div>
              <button className="nav-btn patient-problems-btn" onClick={() => {
                setCurrentSection(null);
                setCurrentProblem(null);
                setShowPatientProblems(true);
                setShowProblemDetails(false);
              }}>
                to Patient Problems
              </button>
              <div className="right-buttons">
                <button className="nav-btn next-btn" onClick={handleSubmit}>
                  Complete Assessment
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ============ SECTION 4: UPDATE PROBLEM ASSESSMENT ============
      else if (currentSection === 'update-problem') {
        // Get problem data for selected problem
        const updateProblemData = responses[currentDomain]?.[currentProblem] || {};

        return (
          <div className="questions-container">
            <button className="back-btn" onClick={() => {
              setCurrentSection(null);
              setCurrentProblem(null);
              setShowUserIdInput(false); // Make sure we don't go back to patient selection
              setShowPatientProblems(true); // Go back to patient problems page
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
              {/* 1.1 Domain Modifiers (Radio) - Pre-filled from existing problem */}
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
                        checked={updateProblemData.modifierDomain === modDomain.modifier_domain_id ||
                          selectedProblemForDetails?.modifier_domain_id === modDomain.modifier_domain_id}
                        onChange={(e) => handleRadioChange('modifierDomain', parseInt(e.target.value))}
                      />
                      <span className="radio-text">{modDomain.modifier_domain_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 1.2 Type Modifiers (Radio) - Pre-filled from existing problem */}
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
                        checked={updateProblemData.modifierType === modType.modifier_type_id ||
                          selectedProblemForDetails?.modifier_type_id === modType.modifier_type_id}
                        onChange={(e) => handleRadioChange('modifierType', parseInt(e.target.value))}
                      />
                      <span className="radio-text">{modType.modifier_type_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 1.3 Signs and Symptoms (Checkboxes) - Pre-filled from existing problem */}
              <div className="question-group">
                <h4>1.3 Signs and Symptoms</h4>
                <p className="question-help">Select all applicable symptoms for this problem</p>
                <div className="checkbox-options">
                  {symptoms.length > 0 ? (
                    symptoms.map(symptom => (
                      <label key={symptom.symptom_id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={(updateProblemData.selectedSymptoms || []).includes(symptom.symptom_id) ||
                            (selectedProblemForDetails?.symptoms || []).some(s => s.symptom_id === symptom.symptom_id)}
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
              <button className="nav-btn patient-problems-btn" onClick={() => {
                setCurrentSection(null);
                setCurrentProblem(null);
                setShowPatientProblems(true);
                setShowProblemDetails(false);
              }}>
                to Patient Problems
              </button>
              <div className="right-buttons">
                <button className="nav-btn next-btn" onClick={() => setCurrentSection('update-problem-intervention')}>
                  Continue to Intervention Scheme →
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ============ SECTION 4b: UPDATE PROBLEM INTERVENTION ============
      else if (currentSection === 'update-problem-intervention') {
        const updateProblemData = responses[currentDomain]?.[currentProblem] || {};

        return (
          <div className="questions-container">
            <button className="back-btn" onClick={() => {
              setCurrentSection(null);
              setCurrentProblem(null);
              setShowUserIdInput(false); // Make sure we don't go back to patient selection
              setShowPatientProblems(true); // Go back to patient problems page
            }}>
              ← Back to Problems
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
              {/* 2.1 Intervention Categories (Checkboxes) - Pre-filled from existing problem */}
              <div className="question-group">
                <h4>2.1 Intervention Categories</h4>
                <p className="question-help">Select applicable intervention categories</p>
                <div className="checkbox-options">
                  {interventionCategories.map(category => (
                    <label key={category.category_id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(updateProblemData.interventionCategories || []).includes(category.category_id) ||
                          (selectedProblemForDetails?.interventions || []).some(i => i.category_id === category.category_id)}
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
                    onClick={() => setCurrentSection('update-problem-targets')}
                  >
                    Select Intervention Targets →
                  </button>

                  {(updateProblemData.interventionTargets || []).length > 0 && (
                    <div className="selected-summary">
                      <p><strong>Selected:</strong> {updateProblemData.interventionTargets.length} target(s)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="navigation-buttons">
              <button className="nav-btn patient-problems-btn" onClick={() => {
                setCurrentSection(null);
                setCurrentProblem(null);
                setShowPatientProblems(true);
                setShowProblemDetails(false);
              }}>
                to Patient Problems
              </button>
              <div className="right-buttons">
                <button className="nav-btn back-btn" onClick={() => setCurrentSection('update-problem')}>
                  ← Back to Classification
                </button>
                <button className="nav-btn next-btn" onClick={() => setCurrentSection('update-problem-rating')}>
                  Continue to Rating Scale →
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ============ SECTION 4c: UPDATE PROBLEM TARGETS ============
      else if (currentSection === 'update-problem-targets') {
        const updateProblemData = responses[currentDomain]?.[currentProblem] || {};
        const selectedTargets = updateProblemData.interventionTargets || [];

        return (
          <div className="targets-container">
            <button className="back-btn" onClick={() => {
              setCurrentSection(null);
              setCurrentProblem(null);
              setShowUserIdInput(false); // Make sure we don't go back to patient selection
              setShowPatientProblems(true); // Go back to patient problems page
            }}>
              ← Back to Problems
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
                    checked={selectedTargets.includes(target.target_id) ||
                      (selectedProblemForDetails?.interventions || []).some(i => i.target_id === target.target_id)}
                    onChange={(e) => handleCheckboxChange('interventionTargets', target.target_id, e.target.checked)}
                  />
                  <span className="target-checkbox-text">{target.target_name}</span>
                </label>
              ))}
            </div>

            <div className="navigation-buttons">
              <button className="nav-btn patient-problems-btn" onClick={() => {
                setCurrentSection(null);
                setCurrentProblem(null);
                setShowPatientProblems(true);
                setShowProblemDetails(false);
              }}>
                to Patient Problems
              </button>
              <div className="right-buttons">
                <button className="nav-btn back-btn" onClick={() => setCurrentSection('update-problem-intervention')}>
                  ← Back to Intervention Scheme
                </button>
                <button className="nav-btn done-btn" onClick={() => setCurrentSection('update-problem-intervention')}>
                  Done Selecting Targets
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ============ SECTION 4d: UPDATE PROBLEM RATING ============
      else if (currentSection === 'update-problem-rating') {
        const updateProblemData = responses[currentDomain]?.[currentProblem] || {};

        return (
          <div className="questions-container">
            <button className="back-btn" onClick={() => {
              setCurrentSection(null);
              setCurrentProblem(null);
              setShowPatientProblems(true); // Go back to patient problems page
            }}>
              ← Back to Problems
            </button>

            <h2>Assessment for {selectedProblemDetails?.problem_name}</h2>
            <p className="problem-context">
              <strong>Domain:</strong> {domain?.domain_name}
            </p>

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
                        checked={updateProblemData.ratingStatus === rating.rating_status_label}
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
                <p className="question-help">Patient's understanding of problem (1-5 scale)</p>
                <div className="radio-options">
                  {outcomeRatings?.knowledge?.map(rating => (
                    <label key={rating.rating_knowledge_id} className="radio-label">
                      <input
                        type="radio"
                        name="knowledge-rating"
                        value={rating.rating_knowledge_label}
                        checked={updateProblemData.ratingKnowledge === rating.rating_knowledge_label}
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
                <p className="question-help">Appropriateness of patient's behavior (1-5 scale)</p>
                <div className="radio-options">
                  {outcomeRatings?.behavior?.map(rating => (
                    <label key={rating.rating_behavior_id} className="radio-label">
                      <input
                        type="radio"
                        name="behavior-rating"
                        value={rating.rating_behavior_label}
                        checked={updateProblemData.ratingBehavior === rating.rating_behavior_label}
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
              <button className="nav-btn patient-problems-btn" onClick={() => {
                setCurrentSection(null);
                setCurrentProblem(null);
                setShowPatientProblems(true);
                setShowProblemDetails(false);
              }}>
                to Patient Problems
              </button>
              <div className="right-buttons">
                <button className="nav-btn back-btn" onClick={() => setCurrentSection('update-problem-intervention')}>
                  ← Back to Intervention
                </button>
                <button className="nav-btn next-btn" onClick={handleSubmitUpdateProblem}>
                  Update Problem
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ============ SECTION 5: RATING-ONLY FOR EXISTING PROBLEMS ============
      else if (currentSection === 'rating-only') {
        return (
          <div className="questions-container">
            <button className="back-btn" onClick={() => {
              setCurrentSection(null);
              setCurrentProblem(null);
              setShowProblemDetails(true);
            }}>
              ← Back to Problem Details
            </button>

            <h2>Assessment for {selectedProblemDetails?.problem_name}</h2>
            <p className="problem-context">
              <strong>Domain:</strong> {domain?.domain_name}
            </p>

            <div className="section-header">
              <h3>PROBLEM RATING SCALE FOR OUTCOMES</h3>
              <div className="progress-indicator">
                <span className="progress-step active"></span>
              </div>
            </div>

            <div className="questions-form">
              {/* Status Rating (Radio) */}
              <div className="question-group">
                <h4>Status</h4>
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

              {/* Knowledge Rating (Radio) */}
              <div className="question-group">
                <h4>Knowledge</h4>
                <p className="question-help">Patient's understanding of the problem (1-5 scale)</p>
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

              {/* Behavior Rating (Radio) */}
              <div className="question-group">
                <h4>Behavior</h4>
                <p className="question-help">Appropriateness of patient's behavior (1-5 scale)</p>
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
              <button className="nav-btn patient-problems-btn" onClick={() => {
                setCurrentSection(null);
                setCurrentProblem(null);
                setShowPatientProblems(true);
                setShowProblemDetails(false);
              }}>
                to Patient Problems
              </button>
              <div className="right-buttons">
                <button className="nav-btn next-btn" onClick={handleSubmitRatingOnly}>
                  Save Assessment
                </button>
              </div>
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
              Export Patient Data to File
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
              Reset All Checkboxes
            </button>
          </div>
        )}

        {showComparisonView && (
          <div className="action-buttons">
            <button className="export-btn" onClick={exportToJson}>
              Export Patient Data to File
            </button>
            <div className="button-gap"></div>
            <button className="new-data-btn" onClick={handleNewAssessment}>
              New Assessment
            </button>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Export Patient Data</h3>
              <div className="export-sections">
                <div className="export-section">
                  <h4>Select export format:</h4>
                  <div className="export-options">
                    <label className="export-option">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="txt"
                        checked={exportFormat === 'txt'}
                        onChange={(e) => setExportFormat(e.target.value)}
                      />
                      <span>.txt (Text File)</span>
                    </label>
                    <label className="export-option">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="json"
                        checked={exportFormat === 'json'}
                        onChange={(e) => setExportFormat(e.target.value)}
                      />
                      <span>.json (JSON File)</span>
                    </label>
                  </div>
                </div>
                <div className="export-section">
                  <h4>Select destination:</h4>
                  <div className="export-options">
                    <label className="export-option">
                      <input
                        type="radio"
                        name="exportDestination"
                        value="download"
                        checked={exportDestination === 'download'}
                        onChange={(e) => setExportDestination(e.target.value)}
                      />
                      <span>Download to device</span>
                    </label>
                    <label className="export-option">
                      <input
                        type="radio"
                        name="exportDestination"
                        value="group_office"
                        checked={exportDestination === 'group_office'}
                        onChange={(e) => setExportDestination(e.target.value)}
                      />
                      <span>Group office</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={handleExportCancel}>
                  Cancel
                </button>
                <button className="confirm-btn" onClick={handleExportConfirm}>
                  Export
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="App-footer">
        <p>
          <a href="https://github.com/leo-oli/social-care-omaha" target="_blank" rel="noopener noreferrer">
            Source Code on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;