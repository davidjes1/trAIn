// Workout Filter and Search Component
import { ActivityMetrics } from '@/core/models';

export interface FilterOptions {
  searchTerm: string;
  sports: string[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
  durationRange: {
    min: number | null;
    max: number | null;
  };
  loadRange: {
    min: number | null;
    max: number | null;
  };
  sortBy: 'date' | 'duration' | 'distance' | 'load';
  sortOrder: 'asc' | 'desc';
}

export class WorkoutFilter {
  private container: HTMLElement;
  private activities: ActivityMetrics[] = [];
  private filteredActivities: ActivityMetrics[] = [];
  private filters: FilterOptions;
  private onFilterChange?: (filtered: ActivityMetrics[]) => void;

  constructor(container: HTMLElement, callbacks: { onFilterChange?: (filtered: ActivityMetrics[]) => void } = {}) {
    this.container = container;
    this.onFilterChange = callbacks.onFilterChange;
    this.filters = this.getDefaultFilters();
    this.initialize();
  }

  private getDefaultFilters(): FilterOptions {
    return {
      searchTerm: '',
      sports: [],
      dateRange: { start: null, end: null },
      durationRange: { min: null, max: null },
      loadRange: { min: null, max: null },
      sortBy: 'date',
      sortOrder: 'desc'
    };
  }

  private initialize(): void {
    this.render();
    this.attachEventListeners();
  }

  /**
   * Update activities and apply filters
   */
  public updateActivities(activities: ActivityMetrics[]): void {
    this.activities = activities;
    this.applyFilters();
  }

  /**
   * Render filter UI
   */
  private render(): void {
    const availableSports = this.getAvailableSports();

    this.container.innerHTML = `
      <div class="workout-filter-container">
        <div class="filter-header">
          <h3>🔍 Search & Filter Workouts</h3>
          <button class="btn btn-ghost btn-small" id="clear-filters">Clear All</button>
        </div>

        <div class="filter-grid">
          <!-- Search -->
          <div class="filter-group filter-search">
            <label for="workout-search">Search</label>
            <input
              type="text"
              id="workout-search"
              class="input"
              placeholder="Search workouts..."
              value="${this.filters.searchTerm}"
            />
          </div>

          <!-- Sport Filter -->
          <div class="filter-group filter-sport">
            <label>Sport Type</label>
            <div class="sport-chips">
              ${availableSports.map(sport => `
                <label class="chip-label">
                  <input
                    type="checkbox"
                    name="sport-filter"
                    value="${sport}"
                    ${this.filters.sports.includes(sport) ? 'checked' : ''}
                  />
                  <span class="chip">${sport}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Date Range -->
          <div class="filter-group filter-date">
            <label>Date Range</label>
            <div class="date-range-inputs">
              <input
                type="date"
                id="date-start"
                class="input input-small"
                value="${this.filters.dateRange.start || ''}"
                placeholder="Start date"
              />
              <span class="range-separator">to</span>
              <input
                type="date"
                id="date-end"
                class="input input-small"
                value="${this.filters.dateRange.end || ''}"
                placeholder="End date"
              />
            </div>
          </div>

          <!-- Duration Range -->
          <div class="filter-group filter-duration">
            <label>Duration (minutes)</label>
            <div class="range-inputs">
              <input
                type="number"
                id="duration-min"
                class="input input-small"
                placeholder="Min"
                value="${this.filters.durationRange.min || ''}"
                min="0"
              />
              <span class="range-separator">to</span>
              <input
                type="number"
                id="duration-max"
                class="input input-small"
                placeholder="Max"
                value="${this.filters.durationRange.max || ''}"
                min="0"
              />
            </div>
          </div>

          <!-- Training Load Range -->
          <div class="filter-group filter-load">
            <label>Training Load</label>
            <div class="range-inputs">
              <input
                type="number"
                id="load-min"
                class="input input-small"
                placeholder="Min"
                value="${this.filters.loadRange.min || ''}"
                min="0"
              />
              <span class="range-separator">to</span>
              <input
                type="number"
                id="load-max"
                class="input input-small"
                placeholder="Max"
                value="${this.filters.loadRange.max || ''}"
                min="0"
              />
            </div>
          </div>

          <!-- Sort Options -->
          <div class="filter-group filter-sort">
            <label for="sort-by">Sort By</label>
            <div class="sort-controls">
              <select id="sort-by" class="input">
                <option value="date" ${this.filters.sortBy === 'date' ? 'selected' : ''}>Date</option>
                <option value="duration" ${this.filters.sortBy === 'duration' ? 'selected' : ''}>Duration</option>
                <option value="distance" ${this.filters.sortBy === 'distance' ? 'selected' : ''}>Distance</option>
                <option value="load" ${this.filters.sortBy === 'load' ? 'selected' : ''}>Training Load</option>
              </select>
              <button class="btn btn-ghost btn-icon" id="sort-order" aria-label="Toggle sort order">
                ${this.filters.sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>
        </div>

        <!-- Results Summary -->
        <div class="filter-results" id="filter-results">
          <span class="results-count">Showing <strong>0</strong> of <strong>0</strong> workouts</span>
        </div>
      </div>
    `;
  }

  /**
   * Get list of available sports from activities
   */
  private getAvailableSports(): string[] {
    const sports = new Set<string>();
    this.activities.forEach(activity => {
      if (activity.sport) {
        sports.add(activity.sport);
      }
    });
    return Array.from(sports).sort();
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Search input
    const searchInput = this.container.querySelector('#workout-search') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.filters.searchTerm = (e.target as HTMLInputElement).value;
      this.applyFilters();
    });

    // Sport checkboxes
    const sportCheckboxes = this.container.querySelectorAll('input[name="sport-filter"]');
    sportCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.filters.sports = Array.from(
          this.container.querySelectorAll('input[name="sport-filter"]:checked')
        ).map(cb => (cb as HTMLInputElement).value);
        this.applyFilters();
      });
    });

    // Date range
    const dateStart = this.container.querySelector('#date-start') as HTMLInputElement;
    const dateEnd = this.container.querySelector('#date-end') as HTMLInputElement;
    dateStart?.addEventListener('change', (e) => {
      this.filters.dateRange.start = (e.target as HTMLInputElement).value || null;
      this.applyFilters();
    });
    dateEnd?.addEventListener('change', (e) => {
      this.filters.dateRange.end = (e.target as HTMLInputElement).value || null;
      this.applyFilters();
    });

    // Duration range
    const durationMin = this.container.querySelector('#duration-min') as HTMLInputElement;
    const durationMax = this.container.querySelector('#duration-max') as HTMLInputElement;
    durationMin?.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.filters.durationRange.min = value ? parseFloat(value) : null;
      this.applyFilters();
    });
    durationMax?.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.filters.durationRange.max = value ? parseFloat(value) : null;
      this.applyFilters();
    });

    // Load range
    const loadMin = this.container.querySelector('#load-min') as HTMLInputElement;
    const loadMax = this.container.querySelector('#load-max') as HTMLInputElement;
    loadMin?.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.filters.loadRange.min = value ? parseFloat(value) : null;
      this.applyFilters();
    });
    loadMax?.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.filters.loadRange.max = value ? parseFloat(value) : null;
      this.applyFilters();
    });

    // Sort controls
    const sortBy = this.container.querySelector('#sort-by') as HTMLSelectElement;
    sortBy?.addEventListener('change', (e) => {
      this.filters.sortBy = (e.target as HTMLSelectElement).value as FilterOptions['sortBy'];
      this.applyFilters();
    });

    const sortOrder = this.container.querySelector('#sort-order') as HTMLButtonElement;
    sortOrder?.addEventListener('click', () => {
      this.filters.sortOrder = this.filters.sortOrder === 'desc' ? 'asc' : 'desc';
      sortOrder.textContent = this.filters.sortOrder === 'desc' ? '↓' : '↑';
      this.applyFilters();
    });

    // Clear filters
    const clearBtn = this.container.querySelector('#clear-filters') as HTMLButtonElement;
    clearBtn?.addEventListener('click', () => {
      this.clearFilters();
    });
  }

  /**
   * Apply all filters to activities
   */
  private applyFilters(): void {
    let filtered = [...this.activities];

    // Search term
    if (this.filters.searchTerm) {
      const term = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.sport.toLowerCase().includes(term) ||
        activity.activityId.toLowerCase().includes(term) ||
        activity.fileName?.toLowerCase().includes(term)
      );
    }

    // Sports
    if (this.filters.sports.length > 0) {
      filtered = filtered.filter(activity =>
        this.filters.sports.includes(activity.sport)
      );
    }

    // Date range
    if (this.filters.dateRange.start) {
      filtered = filtered.filter(activity =>
        activity.date >= this.filters.dateRange.start!
      );
    }
    if (this.filters.dateRange.end) {
      filtered = filtered.filter(activity =>
        activity.date <= this.filters.dateRange.end!
      );
    }

    // Duration range
    if (this.filters.durationRange.min !== null) {
      filtered = filtered.filter(activity =>
        activity.duration >= this.filters.durationRange.min!
      );
    }
    if (this.filters.durationRange.max !== null) {
      filtered = filtered.filter(activity =>
        activity.duration <= this.filters.durationRange.max!
      );
    }

    // Load range
    if (this.filters.loadRange.min !== null) {
      filtered = filtered.filter(activity =>
        activity.trainingLoad >= this.filters.loadRange.min!
      );
    }
    if (this.filters.loadRange.max !== null) {
      filtered = filtered.filter(activity =>
        activity.trainingLoad <= this.filters.loadRange.max!
      );
    }

    // Sort
    filtered = this.sortActivities(filtered);

    this.filteredActivities = filtered;
    this.updateResultsCount();

    // Notify callback
    if (this.onFilterChange) {
      this.onFilterChange(this.filteredActivities);
    }
  }

  /**
   * Sort activities based on current sort settings
   */
  private sortActivities(activities: ActivityMetrics[]): ActivityMetrics[] {
    const sorted = [...activities];
    const order = this.filters.sortOrder === 'desc' ? -1 : 1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (this.filters.sortBy) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'distance':
          comparison = (a.distance || 0) - (b.distance || 0);
          break;
        case 'load':
          comparison = a.trainingLoad - b.trainingLoad;
          break;
      }

      return comparison * order;
    });

    return sorted;
  }

  /**
   * Update results count display
   */
  private updateResultsCount(): void {
    const resultsEl = this.container.querySelector('#filter-results');
    if (!resultsEl) return;

    resultsEl.innerHTML = `
      <span class="results-count">
        Showing <strong>${this.filteredActivities.length}</strong> of <strong>${this.activities.length}</strong> workouts
      </span>
    `;
  }

  /**
   * Clear all filters
   */
  private clearFilters(): void {
    this.filters = this.getDefaultFilters();
    this.render();
    this.attachEventListeners();
    this.applyFilters();
  }

  /**
   * Get current filtered activities
   */
  public getFilteredActivities(): ActivityMetrics[] {
    return this.filteredActivities;
  }

  /**
   * Get current filters
   */
  public getFilters(): FilterOptions {
    return { ...this.filters };
  }
}
