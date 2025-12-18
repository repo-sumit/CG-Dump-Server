import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { surveyAPI } from '../services/api';
import { useValidation } from '../hooks/useValidation';

const SurveyForm = () => {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const isEdit = Boolean(surveyId);
  const { errors, validateSurvey, setErrors } = useValidation();

  const [formData, setFormData] = useState({
    surveyId: '',
    surveyName: '',
    surveyDescription: '',
    availableMediums: [],
    hierarchicalAccessLevel: '',
    public: 'Yes',
    inSchool: 'Yes',
    acceptMultipleEntries: 'Yes',
    launchDate: '',
    closeDate: '',
    mode: 'New Data',
    visibleOnReportBot: 'No',
    isActive: 'Yes',
    downloadResponse: 'No',
    geoFencing: 'No',
    geoTagging: 'No',
    testSurvey: 'No'
  });

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (isEdit) {
      loadSurvey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
      const data = await surveyAPI.getById(surveyId);
      // Convert availableMediums string to array if needed
      if (typeof data.availableMediums === 'string') {
        data.availableMediums = data.availableMediums ? data.availableMediums.split(',') : [];
      }
      setFormData(data);
      // Set hierarchy levels for display
      if (data.hierarchicalAccessLevel) {
        setHierarchyLevels(data.hierarchicalAccessLevel.split(',').filter(l => l.trim()));
      }
    } catch (err) {
      alert('Failed to load survey');
      navigate('/');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleMediumsChange = (e) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      availableMediums: options
    }));
  };

  const [hierarchyInput, setHierarchyInput] = useState('');
  const [hierarchyLevels, setHierarchyLevels] = useState([]);

  const handleAddHierarchyLevel = () => {
    if (hierarchyInput && /^\d+$/.test(hierarchyInput)) {
      if (!hierarchyLevels.includes(hierarchyInput)) {
        const newLevels = [...hierarchyLevels, hierarchyInput];
        setHierarchyLevels(newLevels);
        setFormData(prev => ({
          ...prev,
          hierarchicalAccessLevel: newLevels.join(',')
        }));
        setHierarchyInput('');
      } else {
        alert('This hierarchy level already exists');
      }
    } else {
      alert('Please enter a valid numeric value');
    }
  };

  const handleRemoveHierarchyLevel = (level) => {
    const newLevels = hierarchyLevels.filter(l => l !== level);
    setHierarchyLevels(newLevels);
    setFormData(prev => ({
      ...prev,
      hierarchicalAccessLevel: newLevels.join(',')
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateSurvey(formData)) {
      return;
    }

    try {
      setLoading(true);
      // Convert availableMediums array to comma-separated string for backend
      const dataToSend = {
        ...formData,
        availableMediums: Array.isArray(formData.availableMediums) 
          ? formData.availableMediums.join(',') 
          : formData.availableMediums
      };
      
      if (isEdit) {
        await surveyAPI.update(surveyId, dataToSend);
        alert('Survey updated successfully');
        navigate('/');
      } else {
        const response = await surveyAPI.create(dataToSend);
        alert('Survey created successfully');
        // Redirect to Question Master after creating survey
        navigate(`/surveys/${response.surveyId}/questions`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.errors 
        ? err.response.data.errors.join(', ')
        : err.response?.data?.error || 'Failed to save survey';
      setSubmitError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>{isEdit ? 'Edit Survey' : 'Create New Survey'}</h2>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/')}
        >
          Back to Surveys
        </button>
      </div>

      {submitError && <div className="error-message">{submitError}</div>}

      <form onSubmit={handleSubmit} className="survey-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="surveyId">
              Survey ID <span className="required">*</span>
            </label>
            <input
              type="text"
              id="surveyId"
              name="surveyId"
              value={formData.surveyId}
              onChange={handleChange}
              disabled={isEdit}
              placeholder="e.g., UK_SEC_INF_01"
              className={errors.surveyId ? 'error' : ''}
            />
            {errors.surveyId && <span className="error-text">{errors.surveyId}</span>}
            <small>Format: [Name][Number] e.g., SEC_INF_01</small>
          </div>

          <div className="form-group">
            <label htmlFor="surveyName">
              Survey Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="surveyName"
              name="surveyName"
              value={formData.surveyName}
              onChange={handleChange}
              placeholder="e.g., Secondary Schools Infrastructure Survey"
              className={errors.surveyName ? 'error' : ''}
              maxLength="99"
            />
            {errors.surveyName && <span className="error-text">{errors.surveyName}</span>}
            <small>{formData.surveyName.length}/99 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="surveyDescription">
              Survey Description <span className="required">*</span>
            </label>
            <textarea
              id="surveyDescription"
              name="surveyDescription"
              value={formData.surveyDescription}
              onChange={handleChange}
              rows="4"
              placeholder="Describe the purpose of this survey"
              className={errors.surveyDescription ? 'error' : ''}
              maxLength="256"
            />
            {errors.surveyDescription && <span className="error-text">{errors.surveyDescription}</span>}
            <small>{formData.surveyDescription.length}/256 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="availableMediums">Available Mediums (Languages)</label>
            <select
              id="availableMediums"
              multiple
              value={formData.availableMediums}
              onChange={handleMediumsChange}
              size="8"
              style={{ minHeight: '120px' }}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Gujarati">Gujarati</option>
              <option value="Marathi">Marathi</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
              <option value="Bengali">Bengali</option>
              <option value="Bodo">Bodo</option>
            </select>
            <small>Hold Ctrl/Cmd to select multiple languages</small>
          </div>

          <div className="form-group">
            <label htmlFor="hierarchicalAccessLevel">Hierarchical Access Level</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={hierarchyInput}
                onChange={(e) => setHierarchyInput(e.target.value)}
                placeholder="Enter numeric value (e.g., 12)"
                style={{ flex: 1 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHierarchyLevel();
                  }
                }}
              />
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleAddHierarchyLevel}
              >
                Add Level
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {hierarchyLevels.map(level => (
                <span key={level} style={{ 
                  padding: '0.25rem 0.75rem', 
                  backgroundColor: '#e0e0e0', 
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {level}
                  <button 
                    type="button"
                    onClick={() => handleRemoveHierarchyLevel(level)}
                    style={{ 
                      border: 'none', 
                      background: 'none', 
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      lineHeight: '1'
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <small>Numeric values only, no duplicates allowed</small>
          </div>
        </div>

        <div className="form-section">
          <h3>Settings</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="public">Public</label>
              <select
                id="public"
                name="public"
                value={formData.public}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="inSchool">In School</label>
              <select
                id="inSchool"
                name="inSchool"
                value={formData.inSchool}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="acceptMultipleEntries">Accept Multiple Entries</label>
              <select
                id="acceptMultipleEntries"
                name="acceptMultipleEntries"
                value={formData.acceptMultipleEntries}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="isActive">Is Active?</label>
              <select
                id="isActive"
                name="isActive"
                value={formData.isActive}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="testSurvey">Test Survey</label>
              <select
                id="testSurvey"
                name="testSurvey"
                value={formData.testSurvey}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="mode">Mode</label>
              <select
                id="mode"
                name="mode"
                value={formData.mode}
                onChange={handleChange}
              >
                <option value="None">None</option>
                <option value="New Data">New Data</option>
                <option value="Correction">Correction</option>
                <option value="Delete Data">Delete Data</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Dates</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="launchDate">Launch Date</label>
              <input
                type="text"
                id="launchDate"
                name="launchDate"
                value={formData.launchDate}
                onChange={handleChange}
                placeholder="DD/MM/YYYY HH:MM:SS"
                className={errors.launchDate ? 'error' : ''}
              />
              {errors.launchDate && <span className="error-text">{errors.launchDate}</span>}
              <small>Format: DD/MM/YYYY HH:MM:SS (e.g., 28/01/2025 00:00:00)</small>
            </div>

            <div className="form-group">
              <label htmlFor="closeDate">Close Date</label>
              <input
                type="text"
                id="closeDate"
                name="closeDate"
                value={formData.closeDate}
                onChange={handleChange}
                placeholder="DD/MM/YYYY HH:MM:SS"
                className={errors.closeDate ? 'error' : ''}
              />
              {errors.closeDate && <span className="error-text">{errors.closeDate}</span>}
              <small>Format: DD/MM/YYYY HH:MM:SS (e.g., 31/03/2025 23:59:00)</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Features</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="visibleOnReportBot">Visible on Report Bot</label>
              <select
                id="visibleOnReportBot"
                name="visibleOnReportBot"
                value={formData.visibleOnReportBot}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="downloadResponse">Download Response</label>
              <select
                id="downloadResponse"
                name="downloadResponse"
                value={formData.downloadResponse}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="geoFencing">Geo Fencing</label>
              <select
                id="geoFencing"
                name="geoFencing"
                value={formData.geoFencing}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="geoTagging">Geo Tagging</label>
              <select
                id="geoTagging"
                name="geoTagging"
                value={formData.geoTagging}
                onChange={handleChange}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEdit ? 'Update Survey' : 'Create Survey')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SurveyForm;
