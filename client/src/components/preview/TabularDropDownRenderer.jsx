import React from 'react';

const TabularDropDownRenderer = ({ question, language, onAnswer }) => {
  const translations = question.translations?.[language] || {};
  const options = (translations.options && translations.options.length > 0)
    ? translations.options
    : (question.options || []);
  const tableHeaderValue = translations.tableHeaderValue || question.tableHeaderValue || '';
  const tableQuestionValue = translations.tableQuestionValue || question.tableQuestionValue || '';

  const parseHeaders = (value) => {
    if (!value) return [];
    const delimiter = value.includes('|') ? '|' : ',';
    return value.split(delimiter).map((header) => header.trim()).filter(Boolean);
  };
  
  // Parse table headers and questions
  const tableHeaders = parseHeaders(tableHeaderValue);
  const tableQuestions = tableQuestionValue?.split('\n')
    .map(line => {
      const [key, value] = line.split(':');
      return { key: key?.trim(), value: value?.trim() };
    })
    .filter(q => q.key && q.value) || [];

  return (
    <div className="tabular-dropdown-renderer">
      <table className="preview-table">
        <thead>
          <tr>
            <th></th>
            {tableHeaders.map((header, idx) => (
              <th key={idx}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableQuestions.map((tq, idx) => (
            <tr key={idx}>
              <td className="row-label">{tq.value}</td>
              {tableHeaders.map((_, colIdx) => (
                <td key={colIdx}>
                  <select
                    className="preview-dropdown"
                    onChange={() => onAnswer?.(question.questionId, { value: true, answered: true })}
                  >
                    <option value="">Select...</option>
                    {options.map((opt, optIdx) => (
                      <option key={optIdx} value={opt.text}>
                        {opt.text}
                      </option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TabularDropDownRenderer;
