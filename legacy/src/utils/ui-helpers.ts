import { StatusType } from '../types/fit-parser.types';

export class UIHelpers {
  public static showStatus(message: string, type: StatusType = 'info'): void {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
    }
  }

  public static showLoading(message: string): void {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.innerHTML = `<div class="status"><span class="loading"></span>${message}</div>`;
    }
  }

  public static clearStatus(): void {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.innerHTML = '';
    }
  }

  public static selectAllFields(): void {
    const checkboxes = document.querySelectorAll('#fieldsContainer input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(cb => cb.checked = true);
  }

  public static deselectAllFields(): void {
    const checkboxes = document.querySelectorAll('#fieldsContainer input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(cb => cb.checked = false);
  }

  public static getSelectedFields(): string[] {
    const selectedFields: string[] = [];
    const checkboxes = document.querySelectorAll('#fieldsContainer input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>;
    
    checkboxes.forEach(cb => {
      selectedFields.push(cb.value);
    });
    
    return selectedFields;
  }
}