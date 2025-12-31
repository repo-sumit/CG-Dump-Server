import React from 'react';

const DropDownRenderer = ({ question, language }) => {
  const translations = question.translations?.[language] || {};
  const options = translations.options || [];
  const optionalDescription = translations.questionDescriptionOptional || '';

  return (
    <div className="dropdown-renderer">
      {optionalDescription && (
        <div className="optional-description">{optionalDescription}</div>
      )}
      <select className="preview-dropdown-select">
        <option value="">Select an option...</option>
        {options.map((option, index) => (
          <option key={index} value={option.text}>
            {option.text}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DropDownRenderer;
