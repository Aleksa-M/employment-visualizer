// CanadaMap.js
import React from 'react';
import './CanadaMap.css';

const provinces = [
  { name: 'British Columbia', id: 'BC', path: 'M20,60 L50,60 L50,90 L20,90 Z' },
  { name: 'Alberta', id: 'AB', path: 'M55,60 L85,60 L85,90 L55,90 Z' },
  { name: 'Saskatchewan', id: 'SK', path: 'M90,60 L120,60 L120,90 L90,90 Z' },
  { name: 'Manitoba', id: 'MB', path: 'M125,60 L155,60 L155,90 L125,90 Z' },
  { name: 'Ontario', id: 'ON', path: 'M160,60 L200,60 L200,90 L160,90 Z' },
  { name: 'Quebec', id: 'QC', path: 'M205,60 L245,60 L245,90 L205,90 Z' },
  { name: 'Nova Scotia', id: 'NS', path: 'M260,80 L270,80 L270,90 L260,90 Z' },
  { name: 'New Brunswick', id: 'NB', path: 'M250,70 L260,70 L260,80 L250,80 Z' },
  { name: 'Newfoundland', id: 'NL', path: 'M280,60 L290,60 L290,70 L280,70 Z' },
  { name: 'Yukon', id: 'YT', path: 'M5,30 L35,30 L35,60 L5,60 Z' },
  { name: 'Northwest Territories', id: 'NT', path: 'M40,30 L70,30 L70,60 L40,60 Z' },
  { name: 'Nunavut', id: 'NU', path: 'M75,30 L140,30 L140,60 L75,60 Z' }
];

export default function CanadaMap() {
  const handleClick = (provinceName) => {
    alert(`You clicked: ${provinceName}`);
  };

  return (
    <svg width="800" height="400" viewBox="0 0 300 120" className="canada-map">
      {provinces.map((province) => (
        <path
          key={province.id}
          d={province.path}
          className="province"
          onClick={() => handleClick(province.name)}
        />
      ))}
    </svg>
  );
}