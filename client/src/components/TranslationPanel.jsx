import React, { useState } from 'react';
import { getNativeScript } from '../schemas/languageMappings';

const TranslationPanel = ({ 
  languages, 
  translations, 
  onChange, 
  questionType,
  fieldConfig 
}) => {
  const [activeLanguage, setActiveLanguage] = useState(languages[0] || 'English');

  const handleTranslationChange = (language, field, value) => {
    const updatedTranslations = {
      ...translations,
      [language]: {
        ...(translations[language] || {}),
        [field]: value
      }
    };
    onChange(updatedTranslations);
  };

  const handleOptionChange = (language, index, field, value) => {
    const currentOptions = translations[language]?.options || [];
    const updatedOptions = [...currentOptions];
    
    if (!updatedOptions[index]) {
      updatedOptions[index] = { text: '', textInEnglish: '', children: '' };
    }
    updatedOptions[index][field] = value;
    
    handleTranslationChange(language, 'options', updatedOptions);
  };

  const addOption = (language) => {
    const currentOptions = translations[language]?.options || [];
    const maxOptions = fieldConfig?.maxOptions || 15;
    
    if (currentOptions.length >= maxOptions) {
      alert(`Maximum ${maxOptions} options allowed`);
      return;
    }
    
    handleTranslationChange(language, 'options', [
      ...currentOptions,
      { text: '', textInEnglish: '', children: '' }
    ]);
  };

  const removeOption = (language, index) => {
    const currentOptions = translations[language]?.options || [];
    const updatedOptions = currentOptions.filter((_, i) => i !== index);
    handleTranslationChange(language, 'options', updatedOptions);
  };

  const getCompletionStatus = (language) => {
    const translation = translations[language];
    if (!translation) return '0%';
    
    let totalFields = 1; // questionDescription is always required
    let filledFields = translation.questionDescription ? 1 : 0;
    
    if (fieldConfig?.showTableFields) {
      totalFields += 2; // tableHeaderValue and tableQuestionValue
      if (translation.tableHeaderValue) filledFields++;
      if (translation.tableQuestionValue) filledFields++;
    }
    
    if (fieldConfig?.showOptions) {
      const options = translation.options || [];
      if (options.length > 0) {
        filledFields++; // At least some options entered
      }
      totalFields++;
    }
    
    return `${Math.round((filledFields / totalFields) * 100)}%`;
  };

  return (
    <div className="translation-panel">
      <div className="translation-tabs">
        {languages.map(lang => (
          <button
            key={lang}
            type="button"
            className={`translation-tab ${activeLanguage === lang ? 'active' : ''}`}
            onClick={() => setActiveLanguage(lang)}
          >
            {lang} ({getNativeScript(lang)})
            <span className="completion-badge">{getCompletionStatus(lang)}</span>
          </button>
        ))}
      </div>

      <div className="translation-content">
        {languages.map(lang => (
          <div
            key={lang}
            className={`translation-section ${activeLanguage === lang ? 'active' : ''}`}
            style={{ display: activeLanguage === lang ? 'block' : 'none' }}
          >
            <h4>Translation for {lang} ({getNativeScript(lang)})</h4>
            
            <div className="form-group">
              <label>
                Question Description in {lang} <span className="required">*</span>
              </label>
              <textarea
                value={translations[lang]?.questionDescription || ''}
                onChange={(e) => handleTranslationChange(lang, 'questionDescription', e.target.value)}
                rows="3"
                placeholder={`Enter question text in ${lang}`}
                required
              />
            </div>

            {fieldConfig?.showTableFields && (
              <>
                <div className="form-group">
                  <label>
                    Table Header Value in {lang} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={translations[lang]?.tableHeaderValue || ''}
                    onChange={(e) => handleTranslationChange(lang, 'tableHeaderValue', e.target.value)}
                    placeholder={`Comma-separated headers in ${lang}`}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Table Question Value in {lang} <span className="required">*</span>
                  </label>
                  <textarea
                    value={translations[lang]?.tableQuestionValue || ''}
                    onChange={(e) => handleTranslationChange(lang, 'tableQuestionValue', e.target.value)}
                    rows="4"
                    placeholder={`Format: a:Question 1\nb:Question 2`}
                  />
                </div>
              </>
            )}

            {fieldConfig?.showOptions && (
              <div className="options-section">
                <h5>Options in {lang}</h5>
                {(translations[lang]?.options || []).map((option, index) => (
                  <div key={index} className="option-group">
                    <div className="option-header">
                      <h6>Option {index + 1}</h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => removeOption(lang, index)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Option Text in {lang}</label>
                        <input
                          type="text"
                          value={option.text || ''}
                          onChange={(e) => handleOptionChange(lang, index, 'text', e.target.value)}
                          placeholder={`Option text in ${lang}`}
                        />
                      </div>
                      {lang !== 'English' && (
                        <div className="form-group">
                          <label>Option Text in English</label>
                          <input
                            type="text"
                            value={option.textInEnglish || ''}
                            onChange={(e) => handleOptionChange(lang, index, 'textInEnglish', e.target.value)}
                            placeholder="English translation"
                          />
                        </div>
                      )}
                      {fieldConfig?.showOptionChildren && (
                        <div className="form-group">
                          <label>Child Questions (comma-separated)</label>
                          <input
                            type="text"
                            value={option.children || ''}
                            onChange={(e) => handleOptionChange(lang, index, 'children', e.target.value)}
                            placeholder="e.g., Q1.1,Q1.2"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => addOption(lang)}
                  disabled={(translations[lang]?.options || []).length >= (fieldConfig?.maxOptions || 15)}
                >
                  Add Option ({(translations[lang]?.options || []).length}/{fieldConfig?.maxOptions || 15})
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranslationPanel;
