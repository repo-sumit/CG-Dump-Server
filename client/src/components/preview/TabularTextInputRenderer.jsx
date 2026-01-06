import React from 'react';
{}
const TabularTextInputRenderer = ({ question, language, onAnswer }) => {
  const translations = question.translations?.[language] || {};
  const tableHeaderValue = translations.tableHeaderValue || question.tableHeaderValue || '';
  const tableQuestionValue = translations.tableQuestionValue || question.tableQuestionValue || '';

  const parseHeaders = (value) => {
    if (!value) return [];
    const delimiter = value.includes('|') ? '|' : ',';
    return value.split(delimiter).map((header) => header.trim()).filter(Boolean);
  };

  // Parse table headers and questions
  const tableHeaders = ['Option No', 'Text Input'];
  const tableQuestions = tableQuestionValue?.split('\n')
    .map(line => {
      const [key, value] = line.split(':');
      return { key: key?.trim(), value: value?.trim() };
    })
    .filter(q => q.key && q.value) || [];

  return (
    <div className="tabular-text-input-renderer">
      <table className="preview-table">
        <thead>
          <tr>
            <th></th>
            <th>{tableHeaders[0]}</th>
            <th>{tableHeaders[1]}</th>
          </tr>
        </thead>
        <tbody>
          {tableQuestions.map((tq, idx) => (
            <tr key={idx}>
              <td className="row-label">{tq.value}</td>
              <td>
                <input 
                  type="text" 
                  className="preview-text-input"
                  placeholder="Enter text"
                  onChange={() => onAnswer?.(question.questionId, { value: true, answered: true })}
                />
              </td>
              <td>
                <input 
                  type="text" 
                  className="preview-text-input"
                  placeholder="Enter text"
                  onChange={() => onAnswer?.(question.questionId, { value: true, answered: true })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TabularTextInputRenderer;
