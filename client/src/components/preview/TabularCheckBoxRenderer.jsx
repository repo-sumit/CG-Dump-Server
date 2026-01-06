import React, { useState } from 'react';

const TabularCheckBoxRenderer = ({ question, language, onAnswer }) => {
  const [selections, setSelections] = useState({});
  const translations = question.translations?.[language] || {};
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

  const handleCheckboxChange = (rowIdx, colIdx) => {
    const key = `${rowIdx}-${colIdx}`;
    setSelections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    onAnswer?.(question.questionId, { value: true, answered: true });
  };

  return (
    <div className="tabular-checkbox-renderer">
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
          {tableQuestions.map((tq, rowIdx) => (
            <tr key={rowIdx}>
              <td className="row-label">{tq.value}</td>
              {tableHeaders.map((_, colIdx) => (
                <td key={colIdx}>
                  <input
                    type="checkbox"
                    checked={selections[`${rowIdx}-${colIdx}`] || false}
                    onChange={() => handleCheckboxChange(rowIdx, colIdx)}
                    className="preview-checkbox"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TabularCheckBoxRenderer;
