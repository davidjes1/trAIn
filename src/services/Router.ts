// Simple Router for Dashboard/Profile navigation
export class Router {
  private currentView: string = 'dashboard';
  private onViewChange: (view: string) => void;

  constructor(onViewChange: (view: string) => void) {
    this.onViewChange = onViewChange;
    this.initialize();
  }

  private initialize(): void {
    // Check URL hash for initial view
    const hash = window.location.hash.substring(1);
    if (hash === 'profile' || hash === 'dashboard') {
      this.currentView = hash;
    }

    // Set up navigation event listeners
    this.setupNavigation();
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleHashChange();
    });

    // Initial view setup
    this.showView(this.currentView);
  }

  private setupNavigation(): void {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const view = (e.target as HTMLElement).dataset.view;
        if (view) {
          this.navigateTo(view);
        }
      });
    });
  }

  public navigateTo(view: string): void {
    if (view === this.currentView) return;

    this.currentView = view;
    window.location.hash = view;
    this.showView(view);
    this.onViewChange(view);
  }

  private handleHashChange(): void {
    const hash = window.location.hash.substring(1);
    if (hash && (hash === 'profile' || hash === 'dashboard')) {
      this.showView(hash);
      this.currentView = hash;
      this.onViewChange(hash);
    }
  }

  private showView(view: string): void {
    // Hide all views
    document.querySelectorAll('.view-container').forEach(container => {
      container.classList.remove('active');
    });

    // Show selected view
    const viewContainer = document.getElementById(`${view}-view`);
    if (viewContainer) {
      viewContainer.classList.add('active');
    }

    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
      if ((btn as HTMLElement).dataset.view === view) {
        btn.classList.add('active');
      }
    });
  }

  public getCurrentView(): string {
    return this.currentView;
  }

  public updateNavUser(displayName: string, _email: string): void {
    const navUser = document.getElementById('nav-user');
    if (navUser) {
      navUser.innerHTML = `
        <div class="nav-user-info">
          <span class="nav-username">${displayName}</span>
          <button class="nav-logout-btn" id="nav-logout-btn">Sign Out</button>
        </div>
      `;

      // Add logout listener
      const logoutBtn = document.getElementById('nav-logout-btn');
      logoutBtn?.addEventListener('click', () => {
        // This will be handled by the AuthManager
        const event = new CustomEvent('logout-requested');
        document.dispatchEvent(event);
      });
    }
  }
}