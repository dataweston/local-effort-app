import React from 'react';

export const VennDiagram = () => {
  const svgStyle = {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: '10px',
  };
  const circleStyle = { mixBlendMode: 'multiply' };
  const labelStyle = { fontSize: '10px', fontWeight: 'bold', fill: '#000', textAnchor: 'middle' };
  const centerLabelStyle = { ...labelStyle, fontSize: '8px', fill: '#FFFFFF' };
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" style={svgStyle}>
      <circle cx="115" cy="120" r="50" fill="#fde047" style={circleStyle} />
      <circle cx="185" cy="120" r="50" fill="#67e8f9" style={circleStyle} />
      <circle cx="150" cy="70" r="50" fill="#fca5a5" style={circleStyle} />
      <text x="100" y="130" style={labelStyle}>
        Cost Efficiency
      </text>
      <text x="200" y="130" style={labelStyle}>
        Local Ingredients
      </text>
      <text x="150" y="55" style={labelStyle}>
        Perfect Nutrition
      </text>
      <text x="150" y="105" style={centerLabelStyle}>
        Foundation
      </text>
      <text x="150" y="115" style={centerLabelStyle}>
        Meal Plan
      </text>
    </svg>
  );
};
