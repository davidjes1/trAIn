import { ParsedFitData, AvailableFields } from '../types/fit-parser.types';

export class FieldAnalyzer {
  public static analyzeFields(data: ParsedFitData): AvailableFields {
    const availableFields: AvailableFields = {};
    
    const sections = ['records', 'sessions', 'laps', 'events', 'deviceInfos', 'device_infos'];
    
    sections.forEach(section => {
      const sectionData = (data as any)[section];
      
      if (sectionData && Array.isArray(sectionData) && sectionData.length > 0) {
        const sampleItem = sectionData[0];
        const fields = Object.keys(sampleItem).filter(key => 
          sampleItem[key] !== null && 
          sampleItem[key] !== undefined &&
          typeof sampleItem[key] !== 'function' // Exclude functions
        );
        
        if (fields.length > 0) {
          availableFields[section] = fields;
        }
      }
    });

    // Handle special case for activity (might be an object, not array)
    if (data.activity && !Array.isArray(data.activity)) {
      const fields = Object.keys(data.activity).filter(key => 
        (data.activity as any)[key] !== null && 
        (data.activity as any)[key] !== undefined &&
        typeof (data.activity as any)[key] !== 'function' &&
        key !== 'sessions' // Exclude nested arrays
      );
      
      if (fields.length > 0) {
        availableFields['activity'] = fields;
      }
    }

    return availableFields;
  }

  public static displayFieldsSelection(availableFields: AvailableFields): void {
    const fieldsContainer = document.getElementById('fieldsContainer');
    const fieldsSection = document.getElementById('fieldsSection');
    
    if (!fieldsContainer || !fieldsSection) return;
    
    fieldsContainer.innerHTML = '';
    
    Object.keys(availableFields).forEach(section => {
      const fieldGroup = document.createElement('div');
      fieldGroup.className = 'field-group';
      
      const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);
      fieldGroup.innerHTML = `<h3>${sectionTitle} (${availableFields[section].length} fields)</h3>`;
      
      availableFields[section].forEach(field => {
        const fieldItem = document.createElement('div');
        fieldItem.className = 'field-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${section}_${field}`;
        checkbox.value = `${section}.${field}`;
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = field;
        
        fieldItem.appendChild(checkbox);
        fieldItem.appendChild(label);
        fieldGroup.appendChild(fieldItem);
      });
      
      fieldsContainer.appendChild(fieldGroup);
    });
    
    fieldsSection.style.display = 'block';
  }
}