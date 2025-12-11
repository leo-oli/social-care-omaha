import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [userId, setUserId] = useState('');
  const [showUserIdInput, setShowUserIdInput] = useState(true);
  const [currentDomain, setCurrentDomain] = useState(null); // Changed from currentCategory
  const [currentProblem, setCurrentProblem] = useState(null); // Changed from currentSubcategory
  const [currentSymptom, setCurrentSymptom] = useState(null); // Changed from currentSubSubcategory
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState({});

  // ============= OMAHA SYSTEM DATA =============
  // Domains (Categories)
  const omahaDomains = [
    { domain_id: 1, name: 'Environmental', description: 'The surroundings, physical and psychosocial, in which the client lives' },
    { domain_id: 2, name: 'Psychosocial', description: 'Patterns of behavior, communication, relationship, and development' },
    { domain_id: 3, name: 'Physiological', description: 'Functional status of processes that maintain life' },
    { domain_id: 4, name: 'Health-related Behaviors', description: 'Activities that maintain or promote wellness, recover from illness, or cope with illness' }
  ];

  // Problems (Subcategories) - Simplified selection
  const omahaProblems = {
    1: [ // Environmental Domain Problems
      { problem_id: 1, name: 'Income', description: 'Money from employment, investments, or government benefits' },
      { problem_id: 2, name: 'Sanitation', description: 'Conditions associated with cleanliness and hygiene' },
      { problem_id: 3, name: 'Residence', description: 'Place where client lives' },
      { problem_id: 4, name: 'Neighborhood/workplace safety', description: 'Freedom from danger, risk, or injury' }
    ],
    2: [ // Psychosocial Domain Problems
      { problem_id: 5, name: 'Communication with community resources', description: 'Interaction between client and community groups' },
      { problem_id: 6, name: 'Social contact', description: 'Interaction between client and others' },
      { problem_id: 7, name: 'Role change', description: "Adjustment in client's usual responsibilities or activities" },
      { problem_id: 8, name: 'Interpersonal relationship', description: 'Association or connection between client and significant others' }
    ],
    3: [ // Physiological Domain Problems
      { problem_id: 9, name: 'Hearing', description: 'Ability to perceive sound' },
      { problem_id: 10, name: 'Vision', description: 'Ability to see' },
      { problem_id: 11, name: 'Speech and language', description: 'Ability to express and receive verbal information' },
      { problem_id: 12, name: 'Oral health', description: 'Condition of mouth, teeth, gums, and tongue' }
    ],
    4: [ // Health-related Behaviors Domain Problems
      { problem_id: 13, name: 'Nutrition', description: 'Food and fluid consumption' },
      { problem_id: 14, name: 'Sleep and rest patterns', description: 'Periods of suspended motor and sensory activity' },
      { problem_id: 15, name: 'Physical activity', description: 'Bodily movement produced by skeletal muscles' },
      { problem_id: 16, name: 'Personal care', description: 'Hygiene and grooming' }
    ]
  };

  // Symptoms (Sub-subcategories) - Common symptoms for each problem
  const omahaSymptoms = {
    1: [ // Income symptoms
      { symptom_id: 1, name: 'Inadequate income', description: 'Insufficient for basic needs' },
      { symptom_id: 2, name: 'Unpredictable income', description: 'Irregular or uncertain' },
      { symptom_id: 3, name: 'No source of income', description: 'Lacking any financial resources' }
    ],
    2: [ // Sanitation symptoms
      { symptom_id: 4, name: 'Water impurities', description: 'Contaminated or unclean water' },
      { symptom_id: 5, name: 'Waste disposal', description: 'Inappropriate elimination of garbage or sewage' },
      { symptom_id: 6, name: 'Rodents/vermin', description: 'Presence of pests' }
    ],
    3: [ // Residence symptoms
      { symptom_id: 7, name: 'Structural defects', description: 'Problems with building integrity' },
      { symptom_id: 8, name: 'Inadequate heating/cooling', description: 'Poor temperature control' },
      { symptom_id: 9, name: 'Overcrowding', description: 'Insufficient space for occupants' }
    ],
    4: [ // Neighborhood/workplace safety symptoms
      { symptom_id: 10, name: 'Crime', description: 'Violence or theft in area' },
      { symptom_id: 11, name: 'Traffic hazards', description: 'Dangerous road conditions' },
      { symptom_id: 12, name: 'Pollution', description: 'Environmental contaminants' }
    ],
    5: [ // Communication with community resources symptoms
      { symptom_id: 13, name: 'Unaware of resources', description: 'Lack of knowledge about available services' },
      { symptom_id: 14, name: 'Inaccessible resources', description: 'Services not available or reachable' },
      { symptom_id: 15, name: 'Language barrier', description: 'Difficulty communicating due to language differences' }
    ],
    6: [ // Social contact symptoms
      { symptom_id: 16, name: 'Loneliness', description: 'Feeling isolated or alone' },
      { symptom_id: 17, name: 'Limited social network', description: 'Few friends or contacts' },
      { symptom_id: 18, name: 'Transportation difficulties', description: 'Problems getting to social activities' }
    ],
    7: [ // Role change symptoms
      { symptom_id: 19, name: 'Retirement adjustment', description: 'Difficulty adapting to retirement' },
      { symptom_id: 20, name: 'Caregiver stress', description: 'Stress from caring for others' },
      { symptom_id: 21, name: 'Job loss', description: 'Difficulty coping with unemployment' }
    ],
    8: [ // Interpersonal relationship symptoms
      { symptom_id: 22, name: 'Family conflict', description: 'Disagreements with family members' },
      { symptom_id: 23, name: 'Marital problems', description: 'Difficulties in marriage/partnership' },
      { symptom_id: 24, name: 'Social isolation', description: 'Withdrawal from social interactions' }
    ],
    9: [ // Hearing symptoms
      { symptom_id: 25, name: 'Difficulty hearing', description: 'Trouble perceiving sounds' },
      { symptom_id: 26, name: 'Tinnitus', description: 'Ringing in ears' },
      { symptom_id: 27, name: 'Ear pain', description: 'Discomfort in ears' }
    ],
    10: [ // Vision symptoms
      { symptom_id: 28, name: 'Blurred vision', description: 'Difficulty seeing clearly' },
      { symptom_id: 29, name: 'Eye pain', description: 'Discomfort in eyes' },
      { symptom_id: 30, name: 'Difficulty reading', description: 'Trouble with close-up vision' }
    ],
    11: [ // Speech and language symptoms
      { symptom_id: 31, name: 'Slurred speech', description: 'Unclear articulation' },
      { symptom_id: 32, name: 'Difficulty finding words', description: 'Trouble expressing thoughts' },
      { symptom_id: 33, name: 'Stuttering', description: 'Speech fluency problems' }
    ],
    12: [ // Oral health symptoms
      { symptom_id: 34, name: 'Tooth pain', description: 'Dental discomfort' },
      { symptom_id: 35, name: 'Bleeding gums', description: 'Gum problems' },
      { symptom_id: 36, name: 'Difficulty chewing', description: 'Problems with eating' }
    ],
    13: [ // Nutrition symptoms
      { symptom_id: 37, name: 'Poor appetite', description: 'Lack of desire to eat' },
      { symptom_id: 38, name: 'Weight changes', description: 'Unintentional weight gain or loss' },
      { symptom_id: 39, name: 'Food insecurity', description: 'Lack of reliable access to food' }
    ],
    14: [ // Sleep and rest patterns symptoms
      { symptom_id: 40, name: 'Insomnia', description: 'Difficulty falling or staying asleep' },
      { symptom_id: 41, name: 'Excessive sleepiness', description: 'Sleeping too much' },
      { symptom_id: 42, name: 'Fatigue', description: 'Persistent tiredness' }
    ],
    15: [ // Physical activity symptoms
      { symptom_id: 43, name: 'Sedentary lifestyle', description: 'Insufficient physical movement' },
      { symptom_id: 44, name: 'Joint pain', description: 'Discomfort in joints during activity' },
      { symptom_id: 45, name: 'Shortness of breath', description: 'Difficulty breathing with exertion' }
    ],
    16: [ // Personal care symptoms
      { symptom_id: 46, name: 'Poor hygiene', description: 'Inadequate personal cleanliness' },
      { symptom_id: 47, name: 'Difficulty bathing', description: 'Problems with bathing activities' },
      { symptom_id: 48, name: 'Grooming neglect', description: 'Lack of attention to appearance' }
    ]
  };

  // ============= HANDLER FUNCTIONS =============
  const handleRadioChange = (question, value) => {
    setResponses(prev => ({
      ...prev,
      [currentDomain]: {
        ...prev[currentDomain],
        [currentProblem]: {
          ...prev[currentDomain]?.[currentProblem],
          [currentSymptom]: {
            ...prev[currentDomain]?.[currentProblem]?.[currentSymptom],
            [question]: value
          }
        }
      }
    }));
  };

  const handleCheckboxChange = (question, value, checked) => {
    const currentSelections = responses[currentDomain]?.[currentProblem]?.[currentSymptom]?.[question] || [];
    const newSelections = checked 
      ? [...currentSelections, value]
      : currentSelections.filter(item => item !== value);
    
    setResponses(prev => ({
      ...prev,
      [currentDomain]: {
        ...prev[currentDomain],
        [currentProblem]: {
          ...prev[currentDomain]?.[currentProblem],
          [currentSymptom]: {
            ...prev[currentDomain]?.[currentProblem]?.[currentSymptom],
            [question]: newSelections
          }
        }
      }
    }));
  };

  const handleUserIdSubmit = () => {
    const isValidId = /^\d{11}$/.test(userId.trim());
    
    if (isValidId) {
      setShowUserIdInput(false);
    } else {
      alert('ID number should contain 11 digits');
    }
  };

  // ============= EXPORT FUNCTIONS =============
  const formatResponsesForExport = () => {
    let result = `OMAHA SYSTEM ASSESSMENT\n`;
    result += `=======================\n`;
    result += `Client ID: ${userId}\n`;
    result += `Date: ${new Date().toLocaleDateString()}\n\n`;
    
    omahaDomains.forEach(domain => {
      const domainId = domain.domain_id;
      const domainName = domain.name;
      let domainLine = `[${domainName.toUpperCase()} DOMAIN]\n`;
      
      if (responses[domainId]) {
        Object.entries(responses[domainId]).forEach(([problemId, problemData]) => {
          const problem = omahaProblems[domainId]?.find(p => p.problem_id === parseInt(problemId));
          const problemName = problem?.name || `Problem ${problemId}`;
          
          if (problemData) {
            Object.entries(problemData).forEach(([symptomId, symptomData]) => {
              const symptom = omahaSymptoms[parseInt(problemId)]?.find(s => s.symptom_id === parseInt(symptomId));
              const symptomName = symptom?.name || `Symptom ${symptomId}`;
              
              if (symptomData) {
                Object.entries(symptomData).forEach(([question, answer]) => {
                  const questionText = question.includes('Title') ? question.replace('Title', '').trim() : question;
                  const answerText = Array.isArray(answer) ? answer.join(', ') : answer;
                  
                  if (answerText && answerText.length > 0) {
                    domainLine += `  • ${problemName} - ${symptomName}: ${questionText} = ${answerText}\n`;
                  }
                });
              }
            });
          }
        });
      }
      
      result += domainLine + '\n';
    });
    
    return result;
  };

  const exportToTxt = () => {
    const content = formatResponsesForExport();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omaha_assessment_${userId}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    exportToTxt();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all answers?')) {
      setResponses({});
      setCurrentDomain(null);
      setCurrentProblem(null);
      setCurrentSymptom(null);
    }
  };

  // ============= RENDER FUNCTIONS =============
  const renderContent = () => {
    if (showUserIdInput) {
      return (
        <div className="user-id-container">
          <h2>Enter the ID number</h2>
          <div className="user-id-input">
            <input
              type="text"
              value={userId}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                  setUserId(value);
                }
              }}
              placeholder="Enter the ID number (11 digits)"
              className="user-id-field"
              maxLength="11"
            />
            <button className="user-id-submit" onClick={handleUserIdSubmit}>
              Continue →
            </button>
          </div>
          <p className="user-id-note">The ID number has to be 11 digits long</p>
        </div>
      );
    }

    if (!currentDomain) {
      return (
        <div className="categories-container">
          <h2>Select a Domain</h2>
          <p className="user-id-display">ID number: <strong>{userId}</strong></p>
          <div className="categories-grid">
            {omahaDomains.map(domain => (
              <div 
                key={domain.domain_id} 
                className="category-card"
                onClick={() => setCurrentDomain(domain.domain_id)}
              >
                <h3>{domain.name}</h3>
                <p>{domain.description}</p>
                <div className="select-btn">Next</div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (!currentProblem) {
      const domain = omahaDomains.find(d => d.domain_id === currentDomain);
      const domainProblems = omahaProblems[currentDomain] || [];
      
      return (
        <div className="subcategories-container">
          <button className="back-btn" onClick={() => setCurrentDomain(null)}>
            ← Back
          </button>
          <h2>{domain?.name}</h2>
          <p className="category-description">{domain?.description}</p>
          
          <div className="subcategories-grid">
            {domainProblems.map(problem => (
              <div 
                key={problem.problem_id} 
                className="subcategory-card"
                onClick={() => setCurrentProblem(problem.problem_id)}
              >
                <h3>{problem.name}</h3>
                <p>{problem.description}</p>
                <div className="select-btn">Next</div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (!currentSymptom) {
      const domain = omahaDomains.find(d => d.domain_id === currentDomain);
      const problem = omahaProblems[currentDomain]?.find(p => p.problem_id === currentProblem);
      const problemSymptoms = omahaSymptoms[currentProblem] || [];
      
      return (
        <div className="subsubcategories-container">
          <button className="back-btn" onClick={() => setCurrentProblem(null)}>
            ← Back
          </button>
          <h2>{problem?.name}</h2>
          <p className="category-description">{problem?.description}</p>
          
          <div className="subsubcategories-grid">
            {problemSymptoms.map(symptom => (
              <div 
                key={symptom.symptom_id} 
                className="subsubcategory-card"
                onClick={() => setCurrentSymptom(symptom.symptom_id)}
              >
                <h3>{symptom.name}</h3>
                <p>{symptom.description}</p>
                <div className="select-btn">Next</div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      const domain = omahaDomains.find(d => d.domain_id === currentDomain);
      const problem = omahaProblems[currentDomain]?.find(p => p.problem_id === currentProblem);
      const symptom = omahaSymptoms[currentProblem]?.find(s => s.symptom_id === currentSymptom);
      const currentResponses = responses[currentDomain]?.[currentProblem]?.[currentSymptom] || {};
      
      return (
        <div className="questions-container">
          <button className="back-btn" onClick={() => setCurrentSymptom(null)}>
            ← Back
          </button>
          
          <h2>{symptom?.name}</h2>
          <p className="description">{symptom?.description}</p>
          <p className="problem-context">
            <strong>Domain:</strong> {domain?.name} • <strong>Problem:</strong> {problem?.name}
          </p>
          
          <div className="questions-form">
            <div className="question-group">
              <h4>Assessment Ratings:</h4>
              
              <div className="question">
                <label>1. Knowledge Rating</label>
                <p className="question-help">Client's understanding of the symptom</p>
                <div className="radio-options">
                  {['No knowledge', 'Minimal knowledge', 'Basic knowledge', 'Adequate knowledge', 'Superior knowledge'].map(option => (
                    <label key={option} className="radio-label">
                      <input
                        type="radio"
                        name={`knowledge-${currentSymptom}`}
                        value={option}
                        checked={currentResponses['Knowledge Rating'] === option}
                        onChange={(e) => handleRadioChange('Knowledge Rating', e.target.value)}
                      />
                      <span className="radio-text">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="question">
                <label>2. Behavior Rating</label>
                <p className="question-help">Client's actions regarding the symptom</p>
                <div className="radio-options">
                  {['Not appropriate', 'Rarely appropriate', 'Inconsistently appropriate', 'Usually appropriate', 'Consistently appropriate'].map(option => (
                    <label key={option} className="radio-label">
                      <input
                        type="radio"
                        name={`behavior-${currentSymptom}`}
                        value={option}
                        checked={currentResponses['Behavior Rating'] === option}
                        onChange={(e) => handleRadioChange('Behavior Rating', e.target.value)}
                      />
                      <span className="radio-text">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="question">
                <label>3. Status Rating</label>
                <p className="question-help">Severity of the symptom</p>
                <div className="radio-options">
                  {['Extreme signs/symptoms', 'Severe signs/symptoms', 'Moderate signs/symptoms', 'Minimal signs/symptoms', 'No signs/symptoms'].map(option => (
                    <label key={option} className="radio-label">
                      <input
                        type="radio"
                        name={`status-${currentSymptom}`}
                        value={option}
                        checked={currentResponses['Status Rating'] === option}
                        onChange={(e) => handleRadioChange('Status Rating', e.target.value)}
                      />
                      <span className="radio-text">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="question-group">
              <h4>Symptom Details:</h4>
              
              <div className="question">
                <label>4. Contributing Factors</label>
                <p className="question-help">Select all factors that contribute to this symptom</p>
                <div className="checkbox-options">
                  {['Environmental factors', 'Psychological factors', 'Physical factors', 'Social factors', 'Economic factors', 'Cultural factors', 'Medical condition'].map(option => (
                    <label key={option} className="checkbox-label">
                      <input
                        type="checkbox"
                        value={option}
                        checked={Array.isArray(currentResponses['Contributing Factors']) && 
                                 currentResponses['Contributing Factors'].includes(option)}
                        onChange={(e) => handleCheckboxChange('Contributing Factors', option, e.target.checked)}
                      />
                      <span className="checkbox-text">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="question">
                <label>5. Intervention Needs</label>
                <p className="question-help">What types of interventions are needed?</p>
                <div className="checkbox-options">
                  {['Health teaching', 'Treatment procedures', 'Case management', 'Surveillance', 'Referral', 'Counseling', 'Support system enhancement'].map(option => (
                    <label key={option} className="checkbox-label">
                      <input
                        type="checkbox"
                        value={option}
                        checked={Array.isArray(currentResponses['Intervention Needs']) && 
                                 currentResponses['Intervention Needs'].includes(option)}
                        onChange={(e) => handleCheckboxChange('Intervention Needs', option, e.target.checked)}
                      />
                      <span className="checkbox-text">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="question">
                <label>6. Frequency of Symptom</label>
                <div className="radio-options">
                  {['Constant', 'Daily', 'Weekly', 'Monthly', 'Rarely', 'Never'].map(option => (
                    <label key={option} className="radio-label">
                      <input
                        type="radio"
                        name={`frequency-${currentSymptom}`}
                        value={option}
                        checked={currentResponses['Frequency'] === option}
                        onChange={(e) => handleRadioChange('Frequency', e.target.value)}
                      />
                      <span className="radio-text">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Omaha System Health Assessment</h1>
        <p>Patient health assesment and intervention planning</p>
      </header>

      <main className="App-main">
        {renderContent()}
        
        {!showUserIdInput && (
          <div className="action-buttons">
            <button className="export-btn" onClick={handleSubmit}>
              Export
            </button>
            <div className="button-gap"></div>
            <button className="new-data-btn" onClick={() => setShowUserIdInput(true)}>
              Enter another persons data
            </button>
            <div className="button-gap"></div>
            <button className="reset-btn" onClick={handleReset}>
              Reset All Answers
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;