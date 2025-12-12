import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Client information state
  const [clientInfo, setClientInfo] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    address: ''
  });
  
  const [showUserIdInput, setShowUserIdInput] = useState(true);
  const [currentDomain, setCurrentDomain] = useState(null);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState({});
  
  // Data from API
  const [domains, setDomains] = useState([]);
  const [problems, setProblems] = useState([]); 
  const [allProblems, setAllProblems] = useState({}); 
  const [symptoms, setSymptoms] = useState([]);
  const [allSymptoms, setAllSymptoms] = useState({});
  const [interventionCategories, setInterventionCategories] = useState([]);
  const [interventionTargets, setInterventionTargets] = useState([]);
  const [modifierTypes, setModifierTypes] = useState([]);
  const [modifierDomains, setModifierDomains] = useState([]);
  const [outcomeRatings, setOutcomeRatings] = useState(null);
  
  const [selectedProblemDetails, setSelectedProblemDetails] = useState(null);

  // Helper function to format phone number for display
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)} x${cleaned.slice(10)}`;
    }
  };

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
          
          // Store in allProblems by domain
          setAllProblems(prev => ({
            ...prev,
            [currentDomain]: data
          }));
          
          // Also set current problems for display
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
          
          // Store symptoms by problem_id for export
          setAllSymptoms(prev => ({
            ...prev,
            [currentProblem]: data
          }));
        })
        .catch(error => console.error('Error loading symptoms:', error));
      
      const selectedProblem = problems.find(p => p.problem_id === currentProblem);
      setSelectedProblemDetails(selectedProblem);
      setCurrentSection('classification');
    }
  }, [currentProblem, problems]);

  // ============ HANDLER FUNCTIONS ============
  const handleClientInfoChange = (field, value) => {
    setClientInfo(prev => ({
      ...prev,
      [field]: value
    }));
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

  const handleUserIdSubmit = () => {
    // Check if all required fields are filled
    if (!clientInfo.firstName.trim() || !clientInfo.lastName.trim()) {
      alert('Please enter at least first name and last name');
      return;
    }
    
    // Clear all previous responses and data
    setResponses({});
    setCurrentDomain(null);
    setCurrentProblem(null);
    setCurrentSection(null);
    setSelectedProblemDetails(null);
    setSymptoms([]);
    setProblems([]);
    setAllSymptoms({});
    setShowUserIdInput(false);
  };

  const handleNewAssessment = () => {
    // Clear ALL state
    setClientInfo({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phoneNumber: '',
      address: ''
    });
    setResponses({});
    setCurrentDomain(null);
    setCurrentProblem(null);
    setCurrentSection(null);
    setSelectedProblemDetails(null);
    setSymptoms([]);
    setProblems([]);
    setAllProblems({});
    setAllSymptoms({});
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
      
      
      // Go back to problems menu instead of exporting
      setCurrentSection(null);
      setCurrentProblem(null);
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Error: ' + (error.message || 'Unknown error'));
    }
  };

  // ============ EXPORT FUNCTION ============
  const formatResponsesForExport = () => {
    let result = `OMAHA SYSTEM ASSESSMENT\n`;
    result += `========================================\n`;
    result += `CLIENT INFORMATION\n`;
    result += `========================================\n`;
    result += `First Name: ${clientInfo.firstName}\n`;
    result += `Last Name: ${clientInfo.lastName}\n`;
    result += `Date of Birth: ${clientInfo.dateOfBirth || 'Not provided'}\n`;
    result += `Phone Number: ${formatPhoneNumber(clientInfo.phoneNumber) || 'Not provided'}\n`;
    result += `Address:\n${clientInfo.address || 'Not provided'}\n`;
    result += `========================================\n`;
    result += `Date: ${new Date().toLocaleDateString()}\n`;
    result += `Time: ${new Date().toLocaleTimeString()}\n`;
    result += `========================================\n\n`;
    
    // If no responses, return empty
    if (Object.keys(responses).length === 0) {
      result += `No assessment data recorded yet.\n`;
      return result;
    }
    
    // Go through EACH domain that has responses
    Object.entries(responses).forEach(([domainId, domainData]) => {
      // Find the domain name
      const domain = domains.find(d => d.domain_id === parseInt(domainId));
      if (!domain) {
        return;
      }
      
      result += `\n[${domain.domain_name.toUpperCase()} DOMAIN]\n`;
      result += `${'='.repeat(domain.domain_name.length + 10)}\n\n`;
      
      // Check if this domain has any problems
      if (!domainData || Object.keys(domainData).length === 0) {
        result += `No problems assessed for this domain.\n`;
        return;
      }
      
      // Go through EACH problem in this domain
      Object.entries(domainData).forEach(([problemId, problemData]) => {
        // Find the problem in our problems array
        let problem = null;
        
        // Try to find the problem from allProblems
        if (allProblems[domainId]) {
          problem = allProblems[domainId].find(p => p.problem_id === parseInt(problemId));
        }
        
        if (!problem) {
          result += `PROBLEM: [ID: ${problemId}]\n`;
          result += `${'-'.repeat(10)}\n`;
        } else {
          result += `PROBLEM: ${problem.problem_name}\n`;
          result += `${'-'.repeat(problem.problem_name.length + 9)}\n`;
        }
        
        // 1. Problem Classification Scheme
        result += `1. PROBLEM CLASSIFICATION SCHEME\n`;
        
        // Domain Modifier
        const selectedDomainModifier = modifierDomains.find(
          d => d.modifier_domain_id === problemData.modifierDomain
        );
        result += `   1.1 Domain Modifier: ${selectedDomainModifier?.modifier_domain_name || 'Not selected'}\n`;
        
        // Type Modifier
        const selectedTypeModifier = modifierTypes.find(
          t => t.modifier_type_id === problemData.modifierType
        );
        result += `   1.2 Type Modifier: ${selectedTypeModifier?.modifier_type_name || 'Not selected'}\n`;
        
        // Symptoms
        result += `   1.3 Signs and Symptoms:\n`;
        if (problemData.selectedSymptoms?.length > 0) {
          // Get symptoms for this specific problem from allSymptoms
          const problemSymptoms = allSymptoms[problemId] || [];
          
          problemData.selectedSymptoms.forEach(symptomId => {
            const symptom = problemSymptoms.find(s => s.symptom_id === symptomId);
            if (symptom) {
              result += `      • ${symptom.symptom_description}\n`;
            } else {
              result += `      • Symptom ID: ${symptomId}\n`;
            }
          });
        } else {
          result += `      None selected\n`;
        }
        
        // 2. Intervention Scheme
        result += `\n2. INTERVENTION SCHEME\n`;
        
        // Intervention Categories (checkboxes)
        result += `   2.1 Intervention Categories:\n`;
        if (problemData.interventionCategories?.length > 0) {
          problemData.interventionCategories.forEach(categoryId => {
            const category = interventionCategories.find(c => c.category_id === categoryId);
            if (category) {
              result += `      • ${category.category_name}\n`;
            } else {
              result += `      • [Category ID: ${categoryId}]\n`;
            }
          });
        } else {
          result += `      None selected\n`;
        }
        
        // Intervention Targets
        result += `   2.2 Intervention Targets:\n`;
        if (problemData.interventionTargets?.length > 0) {
          problemData.interventionTargets.forEach(targetId => {
            const target = interventionTargets.find(t => t.target_id === targetId);
            if (target) {
              result += `      • ${target.target_name}\n`;
            } else {
              result += `      • [Target ID: ${targetId}]\n`;
            }
          });
        } else {
          result += `      None selected\n`;
        }
        
        // 3. Problem Rating Scale
        result += `\n3. PROBLEM RATING SCALE FOR OUTCOMES\n`;
        result += `   3.1 Status: ${problemData.ratingStatus || 'Not rated'}\n`;
        result += `   3.2 Knowledge: ${problemData.ratingKnowledge || 'Not rated'}\n`;
        result += `   3.3 Behavior: ${problemData.ratingBehavior || 'Not rated'}\n`;
        
        result += `\n${'='.repeat(50)}\n\n`;
      });
    });
    
    // Add summary
    result += `\nSUMMARY\n`;
    result += `${'='.repeat(50)}\n`;
    
    let totalProblems = 0;
    Object.entries(responses).forEach(([domainId, domainData]) => {
      const domain = domains.find(d => d.domain_id === parseInt(domainId));
      if (domain) {
        const problemCount = Object.keys(domainData).length;
        totalProblems += problemCount;
        result += `${domain.domain_name}: ${problemCount} problem(s)\n`;
      }
    });
    
    result += `\nTotal Problems Assessed: ${totalProblems}\n`;
    result += `Total Domains: ${Object.keys(responses).length}\n`;
    
    return result;
  };

  const exportToTxt = () => {
    const content = formatResponsesForExport();
    
    // Check if we have at least a name for the file
    if (!clientInfo.firstName.trim() && !clientInfo.lastName.trim()) {
      alert('Please enter client information before exporting');
      return;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `omaha_assessment_${clientInfo.firstName}_${clientInfo.lastName}_${Date.now()}.txt`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  // ============ RENDER FUNCTIONS ============
  const renderContent = () => {
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
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={clientInfo.dateOfBirth}
                  onChange={(e) => handleClientInfoChange('dateOfBirth', e.target.value)}
                  className="form-field"
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
            
            <div className="form-notes">
              <p>* Required fields</p>
            </div>
            
            <button className="user-id-submit" onClick={handleUserIdSubmit}>
              Start Assessment →
            </button>
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
      </header>

      <main className="App-main">
        {renderContent()}
        
        {!showUserIdInput && !currentProblem && (
          <div className="action-buttons">
            <button className="export-btn" onClick={exportToTxt}>
              Export All Data
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
      </main>
    </div>
  );
}

export default App;