/**
 * Responsive Utilities JavaScript
 * Helper functions for responsive design across all pages
 */

const ResponsiveUtils = {
  /**
   * Check if device is mobile
   */
  isMobile: function() {
    return window.innerWidth <= 768;
  },

  /**
   * Check if device is small mobile
   */
  isSmallMobile: function() {
    return window.innerWidth <= 480;
  },

  /**
   * Check if device is tablet
   */
  isTablet: function() {
    return window.innerWidth > 480 && window.innerWidth <= 1024;
  },

  /**
   * Get current breakpoint
   */
  getBreakpoint: function() {
    const width = window.innerWidth;
    if (width <= 480) return 'xs';
    if (width <= 768) return 'sm';
    if (width <= 1024) return 'md';
    if (width <= 1440) return 'lg';
    return 'xl';
  },

  /**
   * Handle responsive sidebar toggle
   */
  toggleSidebar: function(sidebarSelector = '.sidebar', toggleBtnSelector = '.toggle-btn') {
    const sidebar = document.querySelector(sidebarSelector);
    const toggleBtn = document.querySelector(toggleBtnSelector);

    if (!sidebar || !toggleBtn) return;

    toggleBtn.addEventListener('click', function() {
      sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
      const isClickInsideSidebar = sidebar.contains(event.target);
      const isClickOnToggle = toggleBtn.contains(event.target);

      if (!isClickInsideSidebar && !isClickOnToggle && ResponsiveUtils.isMobile()) {
        sidebar.classList.remove('active');
      }
    });
  },

  /**
   * Make tables responsive (horizontally scrollable on mobile)
   */
  makeTablesResponsive: function(tableContainerSelector = 'table') {
    const tables = document.querySelectorAll(tableContainerSelector);
    
    tables.forEach(table => {
      if (!table.parentElement.classList.contains('responsive-table')) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('responsive-table');
        table.parentElement.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });
  },

  /**
   * Adjust form input sizes on mobile
   */
  optimizeFormInputs: function() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      if (ResponsiveUtils.isSmallMobile()) {
        input.style.fontSize = '16px'; // Prevent zoom on iOS
      }
    });
  },

  /**
   * Handle responsive modal sizing
   */
  handleResponsiveModals: function(modalSelector = '.modal') {
    const modals = document.querySelectorAll(modalSelector);
    
    const updateModalSize = () => {
      modals.forEach(modal => {
        if (ResponsiveUtils.isMobile()) {
          modal.style.maxWidth = '95vw';
          modal.style.maxHeight = '95vh';
        } else {
          modal.style.maxWidth = '';
          modal.style.maxHeight = '';
        }
      });
    };

    window.addEventListener('resize', updateModalSize);
    updateModalSize(); // Call on initialization
  },

  /**
   * Add responsive breakpoint listener
   */
  onBreakpointChange: function(callback) {
    let currentBreakpoint = this.getBreakpoint();
    
    window.addEventListener('resize', () => {
      const newBreakpoint = this.getBreakpoint();
      if (newBreakpoint !== currentBreakpoint) {
        currentBreakpoint = newBreakpoint;
        callback(newBreakpoint);
      }
    });

    // Call on initialization
    callback(currentBreakpoint);
  },

  /**
   * Initialize all responsive features
   */
  init: function(options = {}) {
    // Default options
    const defaults = {
      enableSidebarToggle: true,
      sidebarSelector: '.sidebar',
      toggleBtnSelector: '.toggle-btn',
      enableTableResponsive: true,
      enableFormOptimization: true,
      enableModalResponsive: true
    };

    const config = { ...defaults, ...options };

    // Initialize features
    if (config.enableSidebarToggle) {
      this.toggleSidebar(config.sidebarSelector, config.toggleBtnSelector);
    }

    if (config.enableTableResponsive) {
      this.makeTablesResponsive();
    }

    if (config.enableFormOptimization) {
      this.optimizeFormInputs();
    }

    if (config.enableModalResponsive) {
      this.handleResponsiveModals();
    }

    // Log initialization (optional)
    if (typeof console !== 'undefined') {
      console.log('ResponsiveUtils initialized', {
        breakpoint: this.getBreakpoint(),
        isMobile: this.isMobile(),
        isSmallMobile: this.isSmallMobile()
      });
    }
  }
};

// Auto-initialize if in DOM ready state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    ResponsiveUtils.init();
  });
} else {
  ResponsiveUtils.init();
}
