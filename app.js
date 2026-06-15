/**
 * StatLearn - Statistics Education SPA
 * Core Application Module
 *
 * Handles:
 * - Section routing/navigation
 * - Mobile sidebar toggle
 * - Theme switching (light/dark)
 * - Progress tracking
 * - Accessibility enhancements
 */

'use strict';

// ============================================
// APPLICATION STATE
// ============================================
const AppState = {
    currentSection: 'introduction',
    sidebarOpen: false,
    theme: 'light',
    completedSections: new Set(),
    sections: [
        'introduction',
        'descriptive',
        'probability',
        'sampling',
        'ci-theory',  
        'ci-simulator', 
        'hypothesis',
        'errors',
        'regression'
    ]
};

// ============================================
// DOM REFERENCES (cached for performance)
// ============================================
const DOM = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    menuToggle: document.getElementById('menuToggle'),
    themeToggle: document.getElementById('themeToggle'),
    mainContent: document.getElementById('mainContent'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    navLinks: document.querySelectorAll('.nav-link'),
    sections: document.querySelectorAll('.content-section'),
    htmlElement: document.documentElement
};

// ============================================
// ROUTER MODULE
// Lightweight hash-based section switching
// ============================================
const Router = {
    /**
     * Initialize router - check URL hash and set initial section
     */
    init() {
        // Check for hash in URL
        const hash = window.location.hash.replace('#', '');

        if (hash && AppState.sections.includes(hash)) {
            this.navigate(hash);
        } else {
            this.navigate(AppState.currentSection);
        }

        // Listen for hash changes (browser back/forward)
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            if (hash && AppState.sections.includes(hash)) {
                this.navigate(hash);
            }
        });
    },

    /**
     * Navigate to a specific section
     * @param {string} sectionId - The section identifier
     */
    navigate(sectionId) {
        if (!AppState.sections.includes(sectionId)) {
            console.warn(`Section "${sectionId}" not found. Falling back to introduction.`);
            sectionId = 'introduction';
        }

        AppState.currentSection = sectionId;

        if (window.location.hash !== `#${sectionId}`) {
            history.pushState(null, null, `#${sectionId}`);
        }

        // NUEVO: Destruir simulador si estamos saliendo de su sección
        if (sectionId !== 'ci-simulator' && this._lastSection === 'ci-simulator') {
            if (typeof CISimulator !== 'undefined' && CISimulator.chart) {
                CISimulator.destroy();
            }
        }

        this.showSection(sectionId);
        this.updateActiveNav(sectionId);

        // NUEVO: Inicializar simulador al entrar a su sección
        if (sectionId === 'ci-simulator') {
            // Usamos requestAnimationFrame para asegurar que el canvas ya es visible (display: block)
            requestAnimationFrame(() => {
                if (typeof CISimulator !== 'undefined' && !CISimulator.chart) {
                    CISimulator.init();
                }
            });
        }

        // NUEVO: Renderizar fórmulas matemáticas con KaTeX
        if (sectionId === 'ci-theory' || sectionId === 'ci-simulator') {
            const sectionEl = document.getElementById(`section-${sectionId}`);
            if (typeof window.renderMathInElement === 'function' && sectionEl) {
                window.renderMathInElement(sectionEl, {
                    delimiters: [
                        {left: '\\[', right: '\\]', display: true},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ],
                    throwOnError: false
                });
            }
        }

        // Guardamos la última sección visitada
        this._lastSection = sectionId;

        if (window.innerWidth <= 768) {
            Sidebar.close();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

        document.dispatchEvent(new CustomEvent('sectionChanged', {
            detail: { section: sectionId }
        }));
    },

    /**
     * Show the target section, hide all others
     * @param {string} sectionId
     */
    showSection(sectionId) {
        DOM.sections.forEach(section => {
            const targetId = `section-${sectionId}`;
            if (section.id === targetId) {
                section.classList.add('active');
                section.setAttribute('aria-hidden', 'false');
            } else {
                section.classList.remove('active');
                section.setAttribute('aria-hidden', 'true');
            }
        });
    },

    /**
     * Update active state on navigation links
     * @param {string} sectionId
     */
    updateActiveNav(sectionId) {
        DOM.navLinks.forEach(link => {
            const linkSection = link.dataset.section;
            if (linkSection === sectionId) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }
};

// ============================================
// SIDEBAR MODULE
// Handles mobile hamburger menu toggle
// ============================================
const Sidebar = {
    /**
     * Initialize sidebar event listeners
     */
    init() {
        DOM.menuToggle.addEventListener('click', () => this.toggle());
        DOM.sidebarOverlay.addEventListener('click', () => this.close());

        // Close sidebar on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && AppState.sidebarOpen) {
                this.close();
                DOM.menuToggle.focus();
            }
        });

        // Handle window resize - close mobile sidebar if switching to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && AppState.sidebarOpen) {
                this.close();
            }
        });
    },

    /**
     * Toggle sidebar open/closed
     */
    toggle() {
        AppState.sidebarOpen ? this.close() : this.open();
    },

    /**
     * Open the sidebar (mobile)
     */
    open() {
        AppState.sidebarOpen = true;
        DOM.sidebar.classList.add('open');
        DOM.sidebarOverlay.classList.add('active');
        DOM.menuToggle.classList.add('active');
        DOM.menuToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    },

    /**
     * Close the sidebar (mobile)
     */
    close() {
        AppState.sidebarOpen = false;
        DOM.sidebar.classList.remove('open');
        DOM.sidebarOverlay.classList.remove('active');
        DOM.menuToggle.classList.remove('active');
        DOM.menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }
};

// ============================================
// THEME MODULE
// Light/Dark theme switching with persistence
// ============================================
const Theme = {
    /**
     * Initialize theme system
     */
    init() {
        // Load saved theme or detect system preference
        const savedTheme = localStorage.getItem('statlearn-theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        this.setTheme(initialTheme);

        // Toggle button event
        DOM.themeToggle.addEventListener('click', () => {
            const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('statlearn-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    },

    /**
     * Apply theme to document
     * @param {string} theme - 'light' or 'dark'
     */
    setTheme(theme) {
        AppState.theme = theme;
        DOM.htmlElement.setAttribute('data-theme', theme);

        // Update toggle icon
        const icon = DOM.themeToggle.querySelector('.theme-icon');
        icon.textContent = theme === 'light' ? '🌙' : '☀️';

        // Update aria label
        DOM.themeToggle.setAttribute('aria-label',
            `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`
        );

        // Persist choice
        localStorage.setItem('statlearn-theme', theme);
    }
};

// ============================================
// PROGRESS MODULE
// Tracks completed sections
// ============================================
const Progress = {
    /**
     * Initialize progress tracking
     */
    init() {
        // Load saved progress
        const saved = localStorage.getItem('statlearn-progress');
        if (saved) {
            const completed = JSON.parse(saved);
            completed.forEach(section => AppState.completedSections.add(section));
        }

        this.updateDisplay();

        // Listen for section changes to offer completion
        document.addEventListener('sectionChanged', (e) => {
            // Auto-mark as visited (optional - could require explicit action)
            this.markComplete(e.detail.section);
        });
    },

    /**
     * Mark a section as completed
     * @param {string} sectionId
     */
    markComplete(sectionId) {
        if (!AppState.completedSections.has(sectionId)) {
            AppState.completedSections.add(sectionId);
            this.saveProgress();
            this.updateDisplay();
        }
    },

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        localStorage.setItem('statlearn-progress',
            JSON.stringify([...AppState.completedSections])
        );
    },

    /**
     * Update progress bar display
     */
    updateDisplay() {
        const total = AppState.sections.length;
        const completed = AppState.completedSections.size;
        const percentage = (completed / total) * 100;

        DOM.progressFill.style.width = `${percentage}%`;
        DOM.progressText.textContent = `${completed} / ${total} completed`;
    },

    /**
     * Reset all progress (for development/testing)
     */
    reset() {
        AppState.completedSections.clear();
        localStorage.removeItem('statlearn-progress');
        this.updateDisplay();
    }
};

// ============================================
// NAVIGATION EVENT HANDLING
// Attach click handlers to all nav links
// ============================================
function initNavigation() {
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            Router.navigate(sectionId);
        });
    });

    // NUEVO: Manejador para botones CTA internos (como el de "Launch Simulator")
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-navigate]');
        if (btn) {
            e.preventDefault();
            Router.navigate(btn.dataset.navigate);
        }
    });
}

// ============================================
// ACCESSIBILITY ENHANCEMENTS
// ============================================
function initAccessibility() {
    // Add ARIA roles to content sections
    DOM.sections.forEach(section => {
        section.setAttribute('role', 'tabpanel');
        section.setAttribute('tabindex', '0');
    });

    // Announce section changes to screen readers
    document.addEventListener('sectionChanged', (e) => {
        const section = document.getElementById(`section-${e.detail.section}`);
        const title = section?.dataset.title || e.detail.section;

        // Create live region announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = `Now viewing: ${title}`;

        document.body.appendChild(announcement);

        // Remove after announcement
        setTimeout(() => announcement.remove(), 1000);
    });
}


// ============================================
// CI SIMULATOR MODULE
// Interactive confidence interval simulation
// ============================================
const CISimulator = {
    // Chart.js instance
    chart: null,

    // State
    isPlaying: false,
    intervalId: null,
    trueMean: 50,
    history: { total: 0, successes: 0, totalIntervals: 0 },
    currentIntervals: [],

    // Precomputed z-critical values for 80-99% confidence
    Z_TABLE: {
        80: 1.2816, 81: 1.3106, 82: 1.3408, 83: 1.3722, 84: 1.4051,
        85: 1.4395, 86: 1.4758, 87: 1.5141, 88: 1.5548, 89: 1.5982,
        90: 1.6449, 91: 1.6954, 92: 1.7507, 93: 1.8119, 94: 1.8808,
        95: 1.9600, 96: 2.0537, 97: 2.1701, 98: 2.3263, 99: 2.5758
    },

    // DOM references
    elements: {},

    /**
     * Initialize the simulator
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initChart();
        this.generateBatch();
    },

    /**
     * Cache DOM references for performance
     */
    cacheElements() {
        this.elements = {
            confidenceLevel: document.getElementById('confidenceLevel'),
            sampleSize: document.getElementById('sampleSize'),
            populationSD: document.getElementById('populationSD'),
            confidenceValue: document.getElementById('confidenceValue'),
            sampleSizeValue: document.getElementById('sampleSizeValue'),
            populationSDValue: document.getElementById('populationSDValue'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            stepBtn: document.getElementById('stepBtn'),
            resetBtn: document.getElementById('resetBtn'),
            currentCoverage: document.getElementById('currentCoverage'),
            totalBatches: document.getElementById('totalBatches'),
            successRate: document.getElementById('successRate'),
            expectedCoverage: document.getElementById('expectedCoverage'),
            vizConfLevel: document.getElementById('vizConfLevel'),
            vizSampleSize: document.getElementById('vizSampleSize'),
            canvas: document.getElementById('ciChart')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const { confidenceLevel, sampleSize, populationSD, playPauseBtn, stepBtn, resetBtn } = this.elements;

        // Slider inputs with live updates
        [confidenceLevel, sampleSize, populationSD].forEach(slider => {
            slider.addEventListener('input', () => {
                this.updateSliderDisplay(slider);
                this.generateBatch();
            });
        });

        // Control buttons
        playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        stepBtn.addEventListener('click', () => this.generateBatch());
        resetBtn.addEventListener('click', () => this.reset());
    },

    /**
     * Update slider value display
     */
    updateSliderDisplay(slider) {
        const value = slider.value;
        switch (slider.id) {
            case 'confidenceLevel':
                this.elements.confidenceValue.textContent = `${value}%`;
                this.elements.expectedCoverage.textContent = `${value}%`;
                this.elements.vizConfLevel.textContent = `${value}%`;
                break;
            case 'sampleSize':
                this.elements.sampleSizeValue.textContent = value;
                this.elements.vizSampleSize.textContent = value;
                break;
            case 'populationSD':
                this.elements.populationSDValue.textContent = value;
                break;
        }
    },

    /**
     * Get current parameters from sliders
     */
    getParams() {
        return {
            confidence: parseInt(this.elements.confidenceLevel.value),
            n: parseInt(this.elements.sampleSize.value),
            sigma: parseInt(this.elements.populationSD.value),
            z: this.Z_TABLE[parseInt(this.elements.confidenceLevel.value)]
        };
    },

    /**
     * Generate a single normally-distributed random value (Box-Muller)
     */
    normalRandom(mean = 0, sd = 1) {
        let u1 = Math.random();
        const u2 = Math.random();
        while (u1 === 0) u1 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return mean + z * sd;
    },

    /**
     * Generate a sample of size n and compute its mean
     */
    generateSample(n, mu, sigma) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += this.normalRandom(mu, sigma);
        }
        return sum / n;
    },

    /**
     * Compute a confidence interval given sample mean and parameters
     */
    computeCI(sampleMean, sigma, n, z) {
        const margin = z * (sigma / Math.sqrt(n));
        return {
            lower: sampleMean - margin,
            upper: sampleMean + margin,
            center: sampleMean,
            margin: margin,
            contains: sampleMean - margin <= this.trueMean && sampleMean + margin >= this.trueMean
        };
    },

    /**
     * Generate one batch of 100 intervals
     */
    generateBatch() {
        const { confidence, n, sigma, z } = this.getParams();
        const NUM_INTERVALS = 100;
        const intervals = [];

        for (let i = 0; i < NUM_INTERVALS; i++) {
            const sampleMean = this.generateSample(n, this.trueMean, sigma);
            const ci = this.computeCI(sampleMean, sigma, n, z);
            intervals.push(ci);
        }

        this.currentIntervals = intervals;
        const successes = intervals.filter(i => i.contains).length;

        // Update history
        this.history.total += 1;
        this.history.successes += successes;
        this.history.totalIntervals += NUM_INTERVALS;

        // Update display
        this.updateStats(successes, NUM_INTERVALS);
        this.renderChart(intervals);
    },

    /**
     * Update statistics display
     */
    updateStats(currentSuccesses, totalInBatch) {
        const currentPct = ((currentSuccesses / totalInBatch) * 100).toFixed(0);
        const overallPct = ((this.history.successes / this.history.totalIntervals) * 100).toFixed(1);

        this.elements.currentCoverage.textContent = `${currentSuccesses}/${totalInBatch} (${currentPct}%)`;
        this.elements.totalBatches.textContent = this.history.total;
        this.elements.successRate.textContent = `${overallPct}%`;
    },

    /**
     * Initialize Chart.js instance with custom plugin for true-mean line
     */
    initChart() {
        const ctx = this.elements.canvas.getContext('2d');

        // Custom plugin: draw vertical line at true mean
        const trueMeanPlugin = {
            id: 'trueMeanLine',
            afterDraw: (chart) => {
                const { ctx, scales: { x, y } } = chart;
                const xPixel = x.getPixelForValue(this.trueMean);

                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([6, 4]);
                ctx.strokeStyle = getComputedStyle(document.documentElement)
                    .getPropertyValue('--color-blue-dark').trim() || '#1e40af';
                ctx.lineWidth = 2;
                ctx.moveTo(xPixel, y.top);
                ctx.lineTo(xPixel, y.bottom);
                ctx.stroke();

                // Label
                ctx.fillStyle = ctx.strokeStyle;
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('μ = 50', xPixel, y.top - 5);
                ctx.restore();
            }
        };

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                datasets: [{
                    label: 'Confidence Intervals',
                    data: [],
                    backgroundColor: [],
                    borderColor: [],
                    borderWidth: 1,
                    barPercentage: 0.85,
                    categoryPercentage: 0.95
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 250 },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Value',
                            color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary')
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--color-border')
                        }
                    },
                    y: {
                        type: 'linear',
                        min: 0,
                        max: 100,
                        reverse: true,
                        title: {
                            display: true,
                            text: 'Sample # (newest at top)',
                            color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary')
                        },
                        ticks: {
                            stepSize: 20,
                            callback: (v) => v % 20 === 0 ? v + 1 : ''
                        },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        callbacks: {
                            title: (items) => `Sample #${items[0].parsed.y + 1}`,
                            label: (ctx) => {
                                const raw = ctx.raw;
                                return [
                                    `Interval: [${raw.lower.toFixed(2)}, ${raw.upper.toFixed(2)}]`,
                                    `Center (x̄): ${raw.center.toFixed(2)}`,
                                    `Margin: ±${raw.margin.toFixed(2)}`,
                                    raw.contains ? '✓ Contains μ = 50' : '✗ Does NOT contain μ = 50'
                                ];
                            }
                        }
                    }
                }
            },
            plugins: [trueMeanPlugin]
        });
    },

    /**
     * Render intervals on the chart
     */
    renderChart(intervals) {
        const GREEN = getComputedStyle(document.documentElement).getPropertyValue('--color-green-primary').trim();
        const RED = getComputedStyle(document.documentElement).getPropertyValue('--color-red-primary').trim();

        // Build data for floating bars: {x: [lower, upper], y: index}
        const data = intervals.map((ci, i) => ({
            x: [ci.lower, ci.upper],
            y: i,
            lower: ci.lower,
            upper: ci.upper,
            center: ci.center,
            margin: ci.margin,
            contains: ci.contains
        }));

        const bgColors = intervals.map(ci => ci.contains ? GREEN : RED);
        const borderColors = intervals.map(ci => ci.contains ? GREEN : RED);

        this.chart.data.datasets[0].data = data;
        this.chart.data.datasets[0].backgroundColor = bgColors;
        this.chart.data.datasets[0].borderColor = borderColors;

        // Dynamically scale x-axis to fit intervals
        const allBounds = intervals.flatMap(ci => [ci.lower, ci.upper]);
        const xMin = Math.min(...allBounds);
        const xMax = Math.max(...allBounds);
        const padding = (xMax - xMin) * 0.08;
        this.chart.options.scales.x.min = Math.floor(xMin - padding);
        this.chart.options.scales.x.max = Math.ceil(xMax + padding);

        this.chart.update('active');
    },

    /**
     * Toggle play/pause state
     */
    togglePlayPause() {
        this.isPlaying ? this.pause() : this.play();
    },

    /**
     * Start continuous simulation
     */
    play() {
        this.isPlaying = true;
        this.elements.playPauseBtn.innerHTML = '<span class="btn-icon">❚❚</span><span class="btn-label">Pause</span>';
        this.elements.playPauseBtn.classList.remove('btn-success');
        this.elements.playPauseBtn.classList.add('btn-danger');
        this.intervalId = setInterval(() => this.generateBatch(), 1500);
    },

    /**
     * Pause continuous simulation
     */
    pause() {
        this.isPlaying = false;
        this.elements.playPauseBtn.innerHTML = '<span class="btn-icon">▶</span><span class="btn-label">Play</span>';
        this.elements.playPauseBtn.classList.remove('btn-danger');
        this.elements.playPauseBtn.classList.add('btn-success');
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    /**
     * Reset the simulation
     */
    reset() {
        this.pause();
        this.history = { total: 0, successes: 0, totalIntervals: 0 };
        this.currentIntervals = [];
        this.elements.currentCoverage.textContent = '—';
        this.elements.totalBatches.textContent = '0';
        this.elements.successRate.textContent = '—';
        this.chart.data.datasets[0].data = [];
        this.chart.data.datasets[0].backgroundColor = [];
        this.chart.data.datasets[0].borderColor = [];
        this.chart.update('none');
    },

    /**
     * Clean up when leaving section
     */
    destroy() {
        this.pause();
    }
};


// ============================================
// INITIALIZATION
// Bootstrap the application when DOM is ready
// ============================================



function initApp() {
    // Initialize all modules
    Sidebar.init();
    Theme.init();
    Router.init();
    Progress.init();

    // Initialize navigation handlers
    initNavigation();

    // Accessibility setup
    initAccessibility();

    // Log initialization
    console.log('%c📊 StatLearn SPA Initialized', 'color: #2563eb; font-weight: bold; font-size: 14px;');
    console.log(`Current section: ${AppState.currentSection}`);
    console.log(`Theme: ${AppState.theme}`);
    console.log(`Sections completed: ${AppState.completedSections.size}/${AppState.sections.length}`);
}

// Wait for DOM content to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ============================================
// EXPORTS (for module systems / testing)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        Router,
        Sidebar,
        Theme,
        Progress
    };
}