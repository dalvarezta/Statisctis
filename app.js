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
        'clt-simulator',
        'ci-theory',  
        'ci-simulator', 
        'hypothesis',
        'errors',
        'duality',
        'case-studies',
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
        if (sectionId !== 'clt-simulator' && this._lastSection === 'clt-simulator') {
            if (typeof CLTSimulator !== 'undefined' && CLTSimulator.populationChart) {
                CLTSimulator.destroy();
            }
        }
        if (sectionId !== 'duality' && this._lastSection === 'duality') {
            if (typeof DualitySimulator !== 'undefined' && DualitySimulator.ciChart) {
                DualitySimulator.destroy();
            }
        }
        if (sectionId !== 'case-studies' && this._lastSection === 'case-studies') {
            if (typeof CaseStudyViz !== 'undefined') {
                CaseStudyViz.destroy();
            }
        }
        if (sectionId !== 'errors' && this._lastSection === 'errors') {
            if (typeof HypothesisTestSimulator !== 'undefined' && HypothesisTestSimulator.chart) {
                HypothesisTestSimulator.destroy();
            }
        }
        if (sectionId !== 'descriptive' && this._lastSection === 'descriptive') {
            if (typeof DescriptiveStatsExplorer !== 'undefined' && DescriptiveStatsExplorer.chart) {
                DescriptiveStatsExplorer.destroy();
            }
        }
        if (sectionId !== 'probability' && this._lastSection === 'probability') {
            if (typeof DistributionExplorer !== 'undefined' && DistributionExplorer.chart) {
                DistributionExplorer.destroy();
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
        if (sectionId === 'clt-simulator') {
            requestAnimationFrame(() => {
                if (typeof CLTSimulator !== 'undefined' && !CLTSimulator.populationChart) {
                    CLTSimulator.init();
                }
            });
        }
        if (sectionId === 'duality') {
            requestAnimationFrame(() => {
                if (typeof DualitySimulator !== 'undefined' && !DualitySimulator.ciChart) {
                    DualitySimulator.init();
                }
            });
        }
        if (sectionId === 'case-studies') {
            requestAnimationFrame(() => {
                if (typeof CaseStudyViz !== 'undefined' && !CaseStudyViz.clinicalChart) {
                    CaseStudyViz.init();
                    setupCaseStudyTabs();
                }
            });
        }
        if (sectionId === 'descriptive') {
            requestAnimationFrame(() => {
                if (typeof DescriptiveStatsExplorer !== 'undefined' && !DescriptiveStatsExplorer.chart) {
                    DescriptiveStatsExplorer.init();
                }
            });
        }
        if (sectionId === 'probability') {
            requestAnimationFrame(() => {
                if (typeof DistributionExplorer !== 'undefined' && !DistributionExplorer.chart) {
                    DistributionExplorer.init();
                }
            });
        }

        // Render KaTeX math formulas for ANY section being navigated to
        // This runs automatically for all sections with LaTeX content
        requestAnimationFrame(() => {
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
        });

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
// CLT SIMULATOR MODULE
// Interactive Central Limit Theorem simulation
// ============================================
const CLTSimulator = {
    // Chart.js instances
    populationChart: null,
    samplingChart: null,

    // State
    sampleMeans: [],  // Array of computed sample means
    currentShape: 'uniform',
    populationSD: 0,  // For theoretical SE calculation

    // DOM references
    elements: {},

    /**
     * Initialize the simulator
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initCharts();
        this.updatePopulationChart();
    },

    /**
     * Cache DOM references for performance
     */
    cacheElements() {
        this.elements = {
            populationShape: document.getElementById('populationShape'),
            sampleSizeN: document.getElementById('sampleSizeN'),
            sampleSizeNValue: document.getElementById('sampleSizeNValue'),
            drawSampleBtn: document.getElementById('drawSampleBtn'),
            resetCLTBtn: document.getElementById('resetCLTBtn'),
            totalDraws: document.getElementById('totalDraws'),
            meanOfMeans: document.getElementById('meanOfMeans'),
            sdOfMeans: document.getElementById('sdOfMeans'),
            theoreticalSE: document.getElementById('theoreticalSE'),
            populationCanvas: document.getElementById('populationChart'),
            samplingCanvas: document.getElementById('samplingChart')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const { populationShape, sampleSizeN, drawSampleBtn, resetCLTBtn } = this.elements;

        // Shape dropdown change
        populationShape.addEventListener('change', () => {
            this.currentShape = populationShape.value;
            this.sampleMeans = [];
            this.updateStats();
            this.updatePopulationChart();
            this.resetSamplingChart();
        });

        // Sample size slider
        sampleSizeN.addEventListener('input', () => {
            this.elements.sampleSizeNValue.textContent = sampleSizeN.value;
            this.updatePopulationChart();
            this.updateTheoreticalSE();
        });

        // Control buttons
        drawSampleBtn.addEventListener('click', () => this.drawSampleMeans());
        resetCLTBtn.addEventListener('click', () => this.reset());
    },

    /**
     * Get population parameters based on selected shape
     */
    getPopulationParams() {
        switch (this.currentShape) {
            case 'uniform':
                return { min: 0, max: 100, mean: 50, sd: 28.87 };  // SD = (max-min)/sqrt(12)
            case 'exponential':
                return { rate: 0.05, mean: 20, sd: 20 };  // mean = 1/rate, sd = 1/rate
            case 'bimodal':
                return { mean1: 30, mean2: 70, sd: 8, mean: 50, sd: ~20 };  // approx
            default:
                return { min: 0, max: 100, mean: 50, sd: 28.87 };
        }
    },

    /**
     * Generate a random value from the selected population distribution
     */
    generatePopulationValue() {
        switch (this.currentShape) {
            case 'uniform':
                return Math.random() * 100;
            case 'exponential':
                return -Math.log(1 - Math.random()) / 0.05;  // Inverse CDF method
            case 'bimodal':
                // Mix of two normals
                const chooseFirst = Math.random() < 0.5;
                const mean = chooseFirst ? 30 : 70;
                return this.normalRandom(mean, 8);
            default:
                return Math.random() * 100;
        }
    },

    /**
     * Generate a normally-distributed random value (Box-Muller transform)
     */
    normalRandom(mean = 0, sd = 1) {
        let u1 = Math.random();
        const u2 = Math.random();
        while (u1 === 0) u1 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return mean + z * sd;
    },

    /**
     * Draw one sample of size n and compute its mean
     */
    drawOneSampleMean(n) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += this.generatePopulationValue();
        }
        return sum / n;
    },

    /**
     * Draw 200 sample means and add them to the collection
     */
    drawSampleMeans() {
        const n = parseInt(this.elements.sampleSizeN.value);
        const numSamples = 200;

        for (let i = 0; i < numSamples; i++) {
            this.sampleMeans.push(this.drawOneSampleMean(n));
        }

        this.updateStats();
        this.updateSamplingChart();
    },

    /**
     * Update statistics display
     */
    updateStats() {
        const n = parseInt(this.elements.sampleSizeN.value);
        const params = this.getPopulationParams();
        const count = this.sampleMeans.length;

        this.elements.totalDraws.textContent = count.toLocaleString();

        if (count === 0) {
            this.elements.meanOfMeans.textContent = '—';
            this.elements.sdOfMeans.textContent = '—';
            return;
        }

        // Compute mean of sample means
        const mean = this.sampleMeans.reduce((a, b) => a + b, 0) / count;
        this.elements.meanOfMeans.textContent = mean.toFixed(3);

        // Compute SD of sample means
        const variance = this.sampleMeans.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / count;
        const sd = Math.sqrt(variance);
        this.elements.sdOfMeans.textContent = sd.toFixed(3);

        // Update theoretical SE
        this.updateTheoreticalSE();
    },

    /**
     * Update theoretical standard error display
     */
    updateTheoreticalSE() {
        const n = parseInt(this.elements.sampleSizeN.value);
        const params = this.getPopulationParams();
        const theoreticalSE = params.sd / Math.sqrt(n);
        this.elements.theoreticalSE.textContent = `Theoretical SE = σ/√n ≈ ${theoreticalSE.toFixed(3)}`;
    },

    /**
     * Initialize both Chart.js charts
     */
    initCharts() {
        this.initPopulationChart();
        this.initSamplingChart();
    },

    /**
     * Initialize the population distribution chart
     */
    initPopulationChart() {
        const ctx = this.elements.populationCanvas.getContext('2d');

        // Generate data points for the population distribution
        const labels = [];
        const data = [];

        for (let x = 0; x <= 100; x += 1) {
            labels.push(x.toFixed(0));
            data.push(this.getPopulationDensity(x));
        }

        this.populationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Population Distribution',
                    data: data,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-blue-primary').trim(),
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-blue-light').trim() || 'rgba(33, 150, 243, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                scales: {
                    x: {
                        title: { display: true, text: 'Value' },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Density' },
                        ticks: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    },

    /**
     * Get probability density at a given x value for the current population shape
     */
    getPopulationDensity(x) {
        switch (this.currentShape) {
            case 'uniform':
                return (x >= 0 && x <= 100) ? 0.01 : 0;
            case 'exponential':
                return x >= 0 ? 0.05 * Math.exp(-0.05 * x) : 0;
            case 'bimodal':
                // Mix of two normal PDFs
                const norm1 = (1 / (8 * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - 30) / 8, 2));
                const norm2 = (1 / (8 * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - 70) / 8, 2));
                return 0.5 * norm1 + 0.5 * norm2;
            default:
                return 0;
        }
    },

    /**
     * Update the population chart when shape changes
     */
    updatePopulationChart() {
        if (!this.populationChart) return;

        const labels = [];
        const data = [];

        for (let x = 0; x <= 100; x += 1) {
            labels.push(x.toFixed(0));
            data.push(this.getPopulationDensity(x));
        }

        // Normalize for visualization
        const maxDensity = Math.max(...data);
        const normalizedData = data.map(d => d / maxDensity * 100);

        this.populationChart.data.labels = labels;
        this.populationChart.data.datasets[0].data = normalizedData;
        this.populationChart.update('none');
    },

    /**
     * Initialize the sampling distribution histogram chart
     */
    initSamplingChart() {
        const ctx = this.elements.samplingCanvas.getContext('2d');

        this.samplingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Sample Means',
                    data: [],
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-green-primary').trim(),
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-green-dark').trim(),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 200 },
                scales: {
                    x: {
                        title: { display: true, text: 'Sample Mean Value' },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Frequency' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    /**
     * Reset the sampling chart data
     */
    resetSamplingChart() {
        if (!this.samplingChart) return;
        this.samplingChart.data.labels = [];
        this.samplingChart.data.datasets[0].data = [];
        this.samplingChart.update('none');
    },

    /**
     * Update the sampling distribution histogram
     */
    updateSamplingChart() {
        if (!this.samplingChart || this.sampleMeans.length === 0) return;

        // Create histogram bins
        const numBins = 30;
        const min = Math.min(...this.sampleMeans);
        const max = Math.max(...this.sampleMeans);
        const binWidth = (max - min) / numBins;

        const binCounts = new Array(numBins).fill(0);
        const binLabels = [];

        for (let i = 0; i < numBins; i++) {
            binLabels.push((min + i * binWidth).toFixed(1));
        }

        this.sampleMeans.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binWidth), numBins - 1);
            binCounts[binIndex]++;
        });

        this.samplingChart.data.labels = binLabels;
        this.samplingChart.data.datasets[0].data = binCounts;
        this.samplingChart.update('active');
    },

    /**
     * Reset the simulation
     */
    reset() {
        this.sampleMeans = [];
        this.updateStats();
        this.resetSamplingChart();
    },

    /**
     * Clean up when leaving section
     */
    destroy() {
        if (this.populationChart) {
            this.populationChart.destroy();
            this.populationChart = null;
        }
        if (this.samplingChart) {
            this.samplingChart.destroy();
            this.samplingChart = null;
        }
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
// DESCRIPTIVE STATISTICS EXPLORER MODULE
// Interactive histogram with live statistics
// ============================================
const DescriptiveStatsExplorer = {
    // Chart.js instance
    chart: null,

    // State
    currentData: [],
    currentShape: 'normal',
    sampleSize: 100,

    // DOM references
    elements: {},

    /**
     * Initialize the descriptive statistics explorer
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.generateSample();
    },

    /**
     * Cache DOM references for performance
     */
    cacheElements() {
        this.elements = {
            distributionShape: document.getElementById('distributionShape'),
            sampleSizeSlider: document.getElementById('sampleSizeDescStats'),
            sampleSizeValue: document.getElementById('sampleSizeValueDesc'),
            generateBtn: document.getElementById('generateBtn'),
            vizSampleSize: document.getElementById('vizSampleSizeDesc'),
            statMean: document.getElementById('statMean'),
            statMedian: document.getElementById('statMedian'),
            statMode: document.getElementById('statMode'),
            statRange: document.getElementById('statRange'),
            statVariance: document.getElementById('statVariance'),
            statStdDev: document.getElementById('statStdDev'),
            statSkewness: document.getElementById('statSkewness'),
            skewInterpretation: document.getElementById('skewInterpretation'),
            canvas: document.getElementById('descriptiveChart')
        };
    },

    /**
     * Bind event listeners to controls
     */
    bindEvents() {
        if (!this.elements.generateBtn) return;

        this.elements.generateBtn.addEventListener('click', () => this.generateSample());
        
        this.elements.sampleSizeSlider.addEventListener('input', (e) => {
            this.sampleSize = parseInt(e.target.value, 10);
            this.elements.sampleSizeValue.textContent = this.sampleSize;
        });

        this.elements.distributionShape.addEventListener('change', (e) => {
            this.currentShape = e.target.value;
            this.generateSample();
        });
    },

    /**
     * Generate a new random sample based on selected distribution
     */
    generateSample() {
        const n = this.sampleSize;
        this.currentData = [];

        switch (this.currentShape) {
            case 'normal':
                this.currentData = this.generateNormal(n, 50, 15);
                break;
            case 'right-skewed':
                this.currentData = this.generateRightSkewed(n, 50, 0.5);
                break;
            case 'left-skewed':
                this.currentData = this.generateLeftSkewed(n, 50, 0.5);
                break;
            case 'bimodal':
                this.currentData = this.generateBimodal(n);
                break;
            case 'uniform':
                this.currentData = this.generateUniform(n, 20, 80);
                break;
        }

        this.updateStats();
        this.renderHistogram();
        this.elements.vizSampleSize.textContent = n;
    },

    /**
     * Generate normally distributed data using Box-Muller transform
     */
    generateNormal(n, mean, sd) {
        const data = [];
        for (let i = 0; i < n; i++) {
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            data.push(mean + z * sd);
        }
        return data;
    },

    /**
     * Generate right-skewed data using exponential transformation
     */
    generateRightSkewed(n, base, rate) {
        const data = [];
        for (let i = 0; i < n; i++) {
            const expVal = -Math.log(1 - Math.random()) / rate;
            data.push(base + expVal * 10);
        }
        return data;
    },

    /**
     * Generate left-skewed data by reflecting right-skewed
     */
    generateLeftSkewed(n, base, rate) {
        const rightSkewed = this.generateRightSkewed(n, 0, rate);
        const maxVal = Math.max(...rightSkewed);
        return rightSkewed.map(v => base + (maxVal - v) * 5);
    },

    /**
     * Generate bimodal data from two normal distributions
     */
    generateBimodal(n) {
        const data = [];
        const halfN = Math.floor(n / 2);
        for (let i = 0; i < halfN; i++) {
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            data.push(35 + z * 8);
        }
        for (let i = 0; i < n - halfN; i++) {
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            data.push(65 + z * 8);
        }
        return data;
    },

    /**
     * Generate uniformly distributed data
     */
    generateUniform(n, min, max) {
        const data = [];
        for (let i = 0; i < n; i++) {
            data.push(min + Math.random() * (max - min));
        }
        return data;
    },

    /**
     * Calculate and display all descriptive statistics
     */
    updateStats() {
        const data = this.currentData;
        const n = data.length;

        // Mean
        const mean = data.reduce((a, b) => a + b, 0) / n;

        // Median
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(n / 2);
        const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

        // Mode (for continuous data, use binning approach)
        const mode = this.calculateMode(data);

        // Range
        const range = Math.max(...data) - Math.min(...data);

        // Variance (sample, with n-1)
        const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);

        // Standard Deviation
        const stdDev = Math.sqrt(variance);

        // Skewness (sample)
        const skewness = this.calculateSkewness(data, mean, stdDev, n);

        // Update DOM
        this.elements.statMean.textContent = mean.toFixed(2);
        this.elements.statMedian.textContent = median.toFixed(2);
        this.elements.statMode.textContent = mode;
        this.elements.statRange.textContent = range.toFixed(2);
        this.elements.statVariance.textContent = variance.toFixed(2);
        this.elements.statStdDev.textContent = stdDev.toFixed(2);
        this.elements.statSkewness.textContent = skewness.toFixed(3);

        // Generate interpretation
        this.updateInterpretation(mean, median, skewness);
    },

    /**
     * Calculate mode using histogram binning
     */
    calculateMode(data) {
        const n = data.length;
        const numBins = Math.round(Math.sqrt(n));
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binWidth = (max - min) / numBins;

        const bins = new Array(numBins).fill(0);
        data.forEach(x => {
            const binIndex = Math.min(Math.floor((x - min) / binWidth), numBins - 1);
            bins[binIndex]++;
        });

        const maxCount = Math.max(...bins);
        const modeBinIndex = bins.indexOf(maxCount);

        // Check if there's a clear mode
        const secondMax = [...bins].sort((a, b) => b - a)[1];
        if (maxCount < n * 0.1 || maxCount - secondMax < 2) {
            return 'no clear mode';
        }

        const modeValue = min + (modeBinIndex + 0.5) * binWidth;
        return modeValue.toFixed(1);
    },

    /**
     * Calculate sample skewness coefficient
     */
    calculateSkewness(data, mean, stdDev, n) {
        if (n < 3 || stdDev === 0) return 0;
        const sumCubed = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0);
        return (n / ((n - 1) * (n - 2))) * sumCubed;
    },

    /**
     * Generate interpretation text based on mean/median relationship
     */
    updateInterpretation(mean, median, skewness) {
        let text = '';
        const diff = mean - median;

        if (Math.abs(diff) < 0.5) {
            text = `Mean ≈ Median → approximately symmetric distribution`;
        } else if (diff > 0) {
            text = `Mean > Median (${diff.toFixed(2)}) → right-skewed distribution`;
        } else {
            text = `Mean < Median (${diff.toFixed(2)}) → left-skewed distribution`;
        }

        // Add skewness coefficient interpretation
        if (Math.abs(skewness) < 0.5) {
            text += ` (g₁ = ${skewness.toFixed(2)}: roughly symmetric)`;
        } else if (skewness > 0) {
            text += ` (g₁ = ${skewness.toFixed(2)}: positive skew)`;
        } else {
            text += ` (g₁ = ${skewness.toFixed(2)}: negative skew)`;
        }

        this.elements.skewInterpretation.textContent = text;
    },

    /**
     * Render histogram with mean and median reference lines
     */
    renderHistogram() {
        const ctx = this.elements.canvas.getContext('2d');
        const data = this.currentData;

        // Create histogram bins
        const numBins = Math.round(Math.sqrt(data.length));
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binWidth = (max - min) / numBins;

        const bins = new Array(numBins).fill(0);
        const binLabels = [];
        data.forEach(x => {
            const binIndex = Math.min(Math.floor((x - min) / binWidth), numBins - 1);
            bins[binIndex]++;
        });

        for (let i = 0; i < numBins; i++) {
            binLabels.push((min + i * binWidth).toFixed(1));
        }

        // Calculate mean and median for reference lines
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(data.length / 2);
        const median = data.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: 'Frequency',
                    data: bins,
                    backgroundColor: 'rgba(37, 99, 235, 0.6)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => `Bin: ${items[0].label} - ${(parseFloat(items[0].label) + binWidth).toFixed(1)}`,
                            label: (ctx) => `Frequency: ${ctx.raw}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Value'
                        },
                        ticks: {
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    }
                },
                animation: {
                    duration: 300
                }
            }
        });

        // Add reference lines after chart renders
        setTimeout(() => {
            this.addReferenceLines(mean, median, min, max);
        }, 100);
    },

    /**
     * Add vertical reference lines for mean and median
     */
    addReferenceLines(mean, median, dataMin, dataMax) {
        if (!this.chart || !this.chart.ctx) return;

        const ctx = this.chart.ctx;
        const chartArea = this.chart.chartArea;
        const xAxis = this.chart.scales.x;

        // Scale function for x-position
        const xScale = (value) => {
            const range = dataMax - dataMin;
            const normalized = (value - dataMin) / range;
            return chartArea.left + normalized * (chartArea.right - chartArea.left);
        };

        ctx.save();

        // Mean line (red)
        const meanX = xScale(mean);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(meanX, chartArea.top);
        ctx.lineTo(meanX, chartArea.bottom);
        ctx.stroke();

        // Median line (green)
        const medianX = xScale(median);
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(medianX, chartArea.top);
        ctx.lineTo(medianX, chartArea.bottom);
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Destroy chart and clean up
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
};

// ============================================
// SECTION 8: DISTRIBUTION EXPLORER MODULE
// Interactive probability distribution visualizer
// ============================================
const DistributionExplorer = {
    // Chart.js instance
    chart: null,

    // State
    currentDist: 'normal',
    params: {
        normal: { mu: 0, sigma: 1 },
        binomial: { n: 10, p: 0.5 },
        poisson: { lambda: 3 },
        t: { df: 5 },
        chisquare: { df: 3 }
    },

    // DOM references
    elements: {},

    /**
     * Initialize the distribution explorer
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initChart();
        this.updateVisualization();
    },

    /**
     * Cache DOM references for performance
     */
    cacheElements() {
        this.elements = {
            distributionSelect: document.getElementById('distributionSelect'),
            // Normal sliders
            normalMu: document.getElementById('normalMu'),
            normalSigma: document.getElementById('normalSigma'),
            normalMuValue: document.getElementById('normalMuValue'),
            normalSigmaValue: document.getElementById('normalSigmaValue'),
            // Binomial sliders
            binomialN: document.getElementById('binomialN'),
            binomialP: document.getElementById('binomialP'),
            binomialNValue: document.getElementById('binomialNValue'),
            binomialPValue: document.getElementById('binomialPValue'),
            // Poisson sliders
            poissonLambda: document.getElementById('poissonLambda'),
            poissonLambdaValue: document.getElementById('poissonLambdaValue'),
            // t-distribution sliders
            tDf: document.getElementById('tDf'),
            tDfValue: document.getElementById('tDfValue'),
            // Chi-square sliders
            chisquareDf: document.getElementById('chisquareDf'),
            chisquareDfValue: document.getElementById('chisquareDfValue'),
            // Stats display
            distMean: document.getElementById('distMean'),
            distVariance: document.getElementById('distVariance'),
            distStdDev: document.getElementById('distStdDev'),
            distType: document.getElementById('distType'),
            // Viz display
            vizTitle: document.getElementById('vizTitle'),
            vizDescription: document.getElementById('vizDescription'),
            canvas: document.getElementById('distributionChart')
        };
    },

    /**
     * Bind event listeners to controls
     */
    bindEvents() {
        if (!this.elements.distributionSelect) return;

        // Distribution selector
        this.elements.distributionSelect.addEventListener('change', (e) => {
            this.currentDist = e.target.value;
            this.showParamsForDistribution(this.currentDist);
            this.updateVisualization();
        });

        // Normal parameter sliders
        if (this.elements.normalMu) {
            this.elements.normalMu.addEventListener('input', (e) => {
                this.params.normal.mu = parseFloat(e.target.value);
                this.elements.normalMuValue.textContent = this.params.normal.mu;
                this.updateVisualization();
            });
        }
        if (this.elements.normalSigma) {
            this.elements.normalSigma.addEventListener('input', (e) => {
                this.params.normal.sigma = parseFloat(e.target.value);
                this.elements.normalSigmaValue.textContent = this.params.normal.sigma;
                this.updateVisualization();
            });
        }

        // Binomial parameter sliders
        if (this.elements.binomialN) {
            this.elements.binomialN.addEventListener('input', (e) => {
                this.params.binomial.n = parseInt(e.target.value, 10);
                this.elements.binomialNValue.textContent = this.params.binomial.n;
                this.updateVisualization();
            });
        }
        if (this.elements.binomialP) {
            this.elements.binomialP.addEventListener('input', (e) => {
                this.params.binomial.p = parseFloat(e.target.value);
                this.elements.binomialPValue.textContent = this.params.binomial.p;
                this.updateVisualization();
            });
        }

        // Poisson parameter slider
        if (this.elements.poissonLambda) {
            this.elements.poissonLambda.addEventListener('input', (e) => {
                this.params.poisson.lambda = parseFloat(e.target.value);
                this.elements.poissonLambdaValue.textContent = this.params.poisson.lambda;
                this.updateVisualization();
            });
        }

        // t-distribution parameter slider
        if (this.elements.tDf) {
            this.elements.tDf.addEventListener('input', (e) => {
                this.params.t.df = parseInt(e.target.value, 10);
                this.elements.tDfValue.textContent = this.params.t.df;
                this.updateVisualization();
            });
        }

        // Chi-square parameter slider
        if (this.elements.chisquareDf) {
            this.elements.chisquareDf.addEventListener('input', (e) => {
                this.params.chisquare.df = parseInt(e.target.value, 10);
                this.elements.chisquareDfValue.textContent = this.params.chisquare.df;
                this.updateVisualization();
            });
        }
    },

    /**
     * Show/hide parameter sliders based on selected distribution
     */
    showParamsForDistribution(dist) {
        const allParams = document.querySelectorAll('.dist-params');
        allParams.forEach(el => {
            el.style.display = (el.dataset.dist === dist) ? 'flex' : 'none';
        });
    },

    /**
     * Initialize Chart.js instance
     */
    initChart() {
        const ctx = this.elements.canvas?.getContext('2d');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'x' },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Probability' },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    },

    /**
     * Update the visualization based on current distribution and parameters
     */
    updateVisualization() {
        if (!this.chart) return;

        const dist = this.currentDist;
        let labels, data, mean, variance, title, description;

        switch (dist) {
            case 'normal':
                {
                    const { mu, sigma } = this.params.normal;
                    mean = mu;
                    variance = sigma * sigma;
                    title = 'Normal Distribution';
                    description = `The bell-shaped curve showing the probability density of the normal distribution with μ=${mu} and σ=${sigma}.`;
                    
                    // Generate x values from mu-4*sigma to mu+4*sigma
                    const xMin = mu - 4 * sigma;
                    const xMax = mu + 4 * sigma;
                    labels = [];
                    data = [];
                    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 100) {
                        labels.push(x.toFixed(2));
                        data.push(this.normalPDF(x, mu, sigma));
                    }
                }
                break;

            case 'binomial':
                {
                    const { n, p } = this.params.binomial;
                    mean = n * p;
                    variance = n * p * (1 - p);
                    title = 'Binomial Distribution';
                    description = `Bar chart showing the probability mass function for ${n} trials with success probability p=${p}.`;
                    
                    // Change chart type to bar for discrete distribution
                    this.chart.config.type = 'bar';
                    labels = [];
                    data = [];
                    for (let k = 0; k <= n; k++) {
                        labels.push(k.toString());
                        data.push(this.binomialPMF(k, n, p));
                    }
                }
                break;

            case 'poisson':
                {
                    const { lambda } = this.params.poisson;
                    mean = lambda;
                    variance = lambda;
                    title = 'Poisson Distribution';
                    description = `Bar chart showing the probability mass function for rate λ=${lambda}.`;
                    
                    // Change chart type to bar for discrete distribution
                    this.chart.config.type = 'bar';
                    labels = [];
                    data = [];
                    const maxK = Math.ceil(lambda + 4 * Math.sqrt(lambda));
                    for (let k = 0; k <= maxK; k++) {
                        labels.push(k.toString());
                        data.push(this.poissonPMF(k, lambda));
                    }
                }
                break;

            case 't':
                {
                    const { df } = this.params.t;
                    mean = 0;
                    variance = df > 2 ? df / (df - 2) : Infinity;
                    title = "Student's t-Distribution";
                    description = `The t-distribution with ${df} degrees of freedom, showing heavier tails than the normal distribution.`;
                    
                    // Change back to line for continuous distribution
                    this.chart.config.type = 'line';
                    labels = [];
                    data = [];
                    for (let t = -4; t <= 4; t += 0.08) {
                        labels.push(t.toFixed(2));
                        data.push(this.tPDF(t, df));
                    }
                }
                break;

            case 'chisquare':
                {
                    const { df } = this.params.chisquare;
                    mean = df;
                    variance = 2 * df;
                    title = 'Chi-Square Distribution';
                    description = `The chi-square distribution with ${df} degrees of freedom, used in hypothesis testing and goodness-of-fit analysis.`;
                    
                    // Change back to line for continuous distribution
                    this.chart.config.type = 'line';
                    labels = [];
                    data = [];
                    const xMax = df + 4 * Math.sqrt(2 * df) + 5;
                    for (let x = 0; x <= xMax; x += xMax / 100) {
                        labels.push(x.toFixed(2));
                        data.push(this.chisquarePDF(x, df));
                    }
                }
                break;
        }

        // Update chart data
        this.chart.data.labels = labels;
        
        // Create dataset with mean marker
        const datasets = [{
            label: dist === 'binomial' || dist === 'poisson' ? 'PMF' : 'PDF',
            data: data,
            borderColor: '#4CAF50',
            backgroundColor: dist === 'binomial' || dist === 'poisson' 
                ? 'rgba(76, 175, 80, 0.6)' 
                : 'rgba(76, 175, 80, 0.1)',
            fill: dist !== 'binomial' && dist !== 'poisson',
            tension: 0.4,
            borderWidth: 2
        }];

        // Add mean marker for continuous distributions
        if (dist === 'normal' || dist === 't' || dist === 'chisquare') {
            // Find the index closest to the mean
            let meanIndex = 0;
            let minDiff = Infinity;
            labels.forEach((label, idx) => {
                const diff = Math.abs(parseFloat(label) - mean);
                if (diff < minDiff) {
                    minDiff = diff;
                    meanIndex = idx;
                }
            });

            const meanData = new Array(labels.length).fill(null);
            meanData[meanIndex] = data[meanIndex];

            datasets.push({
                label: 'Mean',
                data: meanData,
                type: 'scatter',
                backgroundColor: '#F44336',
                pointRadius: 8,
                pointStyle: 'star'
            });
        }

        this.chart.data.datasets = datasets;

        // Update axis labels
        if (dist === 'binomial' || dist === 'poisson') {
            this.chart.options.scales.x.title.text = 'k (number of successes/events)';
            this.chart.options.scales.y.title.text = 'P(X = k)';
        } else if (dist === 'chisquare') {
            this.chart.options.scales.x.title.text = 'χ² value';
            this.chart.options.scales.y.title.text = 'Probability Density';
        } else if (dist === 't') {
            this.chart.options.scales.x.title.text = 't value';
            this.chart.options.scales.y.title.text = 'Probability Density';
        } else {
            this.chart.options.scales.x.title.text = 'x';
            this.chart.options.scales.y.title.text = 'Probability Density';
        }

        this.chart.update('none');

        // Update stats display
        this.elements.vizTitle.textContent = title;
        this.elements.vizDescription.textContent = description;
        this.elements.distMean.textContent = isFinite(mean) ? mean.toFixed(4) : '∞';
        this.elements.distVariance.textContent = isFinite(variance) ? variance.toFixed(4) : '∞';
        this.elements.distStdDev.textContent = isFinite(Math.sqrt(variance)) ? Math.sqrt(variance).toFixed(4) : '∞';
        this.elements.distType.textContent = (dist === 'binomial' || dist === 'poisson') ? 'Discrete' : 'Continuous';
    },

    /**
     * Normal distribution PDF
     */
    normalPDF(x, mu, sigma) {
        const coeff = 1 / (sigma * Math.sqrt(2 * Math.PI));
        const exponent = -Math.pow(x - mu, 2) / (2 * sigma * sigma);
        return coeff * Math.exp(exponent);
    },

    /**
     * Binomial coefficient
     */
    binomialCoeff(n, k) {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return Math.round(result);
    },

    /**
     * Binomial distribution PMF
     */
    binomialPMF(k, n, p) {
        return this.binomialCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    },

    /**
     * Factorial helper
     */
    factorial(n) {
        if (n <= 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
    },

    /**
     * Poisson distribution PMF
     */
    poissonPMF(k, lambda) {
        return (Math.pow(lambda, k) * Math.exp(-lambda)) / this.factorial(k);
    },

    /**
     * Gamma function approximation (Lanczos)
     */
    gamma(z) {
        const g = 7;
        const c = [
            0.99999999999980993, 676.5203681218851, -1259.1392167224028,
            771.32342877765313, -176.61502916214059, 12.507343278686905,
            -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
        ];

        if (z < 0.5) {
            return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
        }

        z -= 1;
        let x = c[0];
        for (let i = 1; i < g + 2; i++) {
            x += c[i] / (z + i);
        }

        const t = z + g + 0.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    },

    /**
     * Student's t-distribution PDF
     */
    tPDF(t, df) {
        const coeff = this.gamma((df + 1) / 2) / (Math.sqrt(df * Math.PI) * this.gamma(df / 2));
        return coeff * Math.pow(1 + (t * t) / df, -(df + 1) / 2);
    },

    /**
     * Chi-square distribution PDF
     */
    chisquarePDF(x, df) {
        if (x <= 0) return 0;
        const coeff = 1 / (Math.pow(2, df / 2) * this.gamma(df / 2));
        return coeff * Math.pow(x, df / 2 - 1) * Math.exp(-x / 2);
    },

    /**
     * Destroy chart instance
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
};

// ============================================
// EXPORTS (for module systems / testing)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        Router,
        Sidebar,
        Theme,
        Progress,
        DescriptiveStatsExplorer,
        DistributionExplorer
    };
}
// ============================================
// SECTION 9: DUALITY SIMULATOR MODULE
// ============================================
const DualitySimulator = {
    ciChart: null, htChart: null,
    state: { sampleMean: 1.5, alpha: 0.05, n: 25, sigma: 1, mu0: 0 },
    elements: {},
    
    init() { this.cacheElements(); this.bindEvents(); this.initCharts(); this.update(); },
    
    cacheElements() {
        this.elements = {
            sampleMean: document.getElementById('dualSampleMean'),
            alpha: document.getElementById('dualAlpha'),
            n: document.getElementById('dualN'),
            sigma: document.getElementById('dualSigma'),
            mu0: document.getElementById('dualMu0'),
            sampleMeanVal: document.getElementById('dualSampleMeanVal'),
            alphaVal: document.getElementById('dualAlphaVal'),
            nVal: document.getElementById('dualNVal'),
            sigmaVal: document.getElementById('dualSigmaVal'),
            mu0Val: document.getElementById('dualMu0Val'),
            confLevelDisplay: document.getElementById('confLevelDisplay'),
            ciLower: document.getElementById('ciLower'),
            ciUpper: document.getElementById('ciUpper'),
            mu0InCi: document.getElementById('mu0InCi'),
            ciInterpretation: document.getElementById('ciInterpretation'),
            testStatDisplay: document.getElementById('testStatDisplay'),
            criticalValuesDisplay: document.getElementById('criticalValuesDisplay'),
            pValueDisplay: document.getElementById('pValueDisplay'),
            htDecision: document.getElementById('htDecision'),
            htInterpretation: document.getElementById('htInterpretation'),
            ciStatus: document.getElementById('ciStatus'),
            htStatus: document.getElementById('htStatus')
        };
    },
    
    bindEvents() {
        ['sampleMean', 'alpha', 'n', 'sigma', 'mu0'].forEach(id => {
            const el = this.elements[id];
            if (el) el.addEventListener('input', () => {
                this.state.sampleMean = parseFloat(this.elements.sampleMean.value);
                this.state.alpha = parseFloat(this.elements.alpha.value);
                this.state.n = parseInt(this.elements.n.value);
                this.state.sigma = parseFloat(this.elements.sigma.value);
                this.state.mu0 = parseFloat(this.elements.mu0.value);
                this.elements.sampleMeanVal.textContent = this.state.sampleMean.toFixed(1);
                this.elements.alphaVal.textContent = this.state.alpha.toFixed(3);
                this.elements.nVal.textContent = this.state.n;
                this.elements.sigmaVal.textContent = this.state.sigma.toFixed(1);
                this.elements.mu0Val.textContent = this.state.mu0.toFixed(1);
                this.update();
            });
        });
    },
    
    getZCritical(alpha) {
        const p = 1 - alpha / 2;
        if (p >= 0.995) return 2.576;
        if (p >= 0.99) return 2.326;
        if (p >= 0.975) return 1.96;
        if (p >= 0.95) return 1.645;
        if (p >= 0.90) return 1.282;
        return 1.96 + (p - 0.975) * 10;
    },
    
    calculate() {
        const { sampleMean, alpha, n, sigma, mu0 } = this.state;
        const se = sigma / Math.sqrt(n);
        const zCritical = this.getZCritical(alpha);
        const marginOfError = zCritical * se;
        const ciLower = sampleMean - marginOfError;
        const ciUpper = sampleMean + marginOfError;
        const confLevel = ((1 - alpha) * 100).toFixed(0);
        const zStat = (sampleMean - mu0) / se;
        const pValue = 2 * (1 - this.standardNormalCDF(Math.abs(zStat)));
        const rejectH0 = Math.abs(zStat) > zCritical;
        const mu0InsideCI = mu0 >= ciLower && mu0 <= ciUpper;
        return { se, zCritical, ciLower, ciUpper, confLevel, zStat, pValue, rejectH0, mu0InsideCI };
    },
    
    standardNormalCDF(z) {
        const t = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989423 * Math.exp(-z * z / 2);
        const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return z > 0 ? 1 - prob : prob;
    },
    
    initCharts() {
        const ciCtx = document.getElementById('ciDualityChart');
        const htCtx = document.getElementById('htDualityChart');
        if (!ciCtx || !htCtx) return;
        
        this.ciChart = new Chart(ciCtx, {
            type: 'bar',
            data: { labels: ['CI'], datasets: [{ label: 'CI Range', data: [0], backgroundColor: 'rgba(100, 181, 246, 0.6)', borderColor: '#64B5F6', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { beginAtZero: false, title: { display: true, text: 'Value' } } } }
        });
        
        this.htChart = new Chart(htCtx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: 'z-score' }, min: -4, max: 4 }, y: { beginAtZero: true, max: 0.45 } } }
        });
    },
    
    update() {
        const r = this.calculate();
        this.elements.confLevelDisplay.textContent = r.confLevel + '%';
        this.elements.ciLower.textContent = r.ciLower.toFixed(3);
        this.elements.ciUpper.textContent = r.ciUpper.toFixed(3);
        const inCI = r.mu0InsideCI;
        this.elements.mu0InCi.textContent = inCI ? 'Yes ✓' : 'No ✗';
        this.elements.mu0InCi.style.color = inCI ? 'var(--color-success)' : 'var(--color-error)';
        this.elements.ciInterpretation.textContent = inCI ? 'μ₀ falls within the CI - plausible value.' : 'μ₀ falls outside the CI - NOT plausible.';
        this.elements.ciStatus.className = 'panel-status ' + (inCI ? 'success' : 'fail');
        this.elements.ciStatus.querySelector('.status-text').textContent = inCI ? 'μ₀ in CI' : 'μ₀ outside CI';
        this.elements.testStatDisplay.textContent = r.zStat.toFixed(3);
        this.elements.criticalValuesDisplay.textContent = '±' + r.zCritical.toFixed(3);
        this.elements.pValueDisplay.textContent = r.pValue.toFixed(4);
        const decision = r.rejectH0 ? 'Reject H₀' : 'Fail to Reject H₀';
        this.elements.htDecision.textContent = decision;
        this.elements.htDecision.style.color = r.rejectH0 ? 'var(--color-error)' : 'var(--color-success)';
        this.elements.htInterpretation.textContent = r.rejectH0 ? 'Sufficient evidence to reject H₀ at α=' + this.state.alpha : 'Insufficient evidence to reject H₀ at α=' + this.state.alpha;
        this.elements.htStatus.className = 'panel-status ' + (r.rejectH0 ? 'fail' : 'success');
        this.elements.htStatus.querySelector('.status-text').textContent = r.rejectH0 ? 'Reject H₀' : 'Fail to Reject H₀';
        this.updateCIChart(r);
        this.updateHTChart(r);
    },
    
    updateCIChart(r) {
        if (!this.ciChart) return;
        const range = r.ciUpper - r.ciLower;
        const padding = range * 0.3;
        this.ciChart.data.datasets[0].data = [r.ciLower];
        this.ciChart.options.scales.y.min = r.ciLower - padding;
        this.ciChart.options.scales.y.max = r.ciUpper + padding;
        if (!this.ciChart.data.datasets[1]) {
            this.ciChart.data.datasets.push({ label: 'μ₀', data: [this.state.mu0], type: 'scatter', backgroundColor: r.mu0InsideCI ? '#4CAF50' : '#F44336', pointRadius: 8, pointStyle: 'star' });
        } else {
            this.ciChart.data.datasets[1].data = [this.state.mu0];
            this.ciChart.data.datasets[1].backgroundColor = r.mu0InsideCI ? '#4CAF50' : '#F44336';
        }
        this.ciChart.update('none');
    },
    
    updateHTChart(r) {
        if (!this.htChart) return;
        const labels = [], data = [], rejData = [];
        for (let z = -4; z <= 4; z += 0.1) {
            labels.push(z.toFixed(1));
            const y = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-z * z / 2);
            data.push(y);
            rejData.push(Math.abs(z) > r.zCritical ? y : null);
        }
        this.htChart.data.labels = labels;
        this.htChart.data.datasets = [
            { label: 'Standard Normal', data: data, borderColor: '#64B5F6', backgroundColor: 'rgba(100, 181, 246, 0.2)', fill: true, tension: 0.4 },
            { label: 'Rejection Region', data: rejData, borderColor: '#F44336', backgroundColor: 'rgba(244, 67, 54, 0.3)', fill: true, tension: 0.4 },
            { label: 'Test Statistic', data: [{x: r.zStat.toFixed(1), y: 0}], type: 'scatter', backgroundColor: r.rejectH0 ? '#F44336' : '#4CAF50', pointRadius: 10, pointStyle: 'star' }
        ];
        this.htChart.update('none');
    },
    
    destroy() { if (this.ciChart) { this.ciChart.destroy(); this.ciChart = null; } if (this.htChart) { this.htChart.destroy(); this.htChart = null; } }
};

// ============================================
// SECTION 10: CASE STUDY VISUALIZATION MODULE
// ============================================
const CaseStudyViz = {
    clinicalChart: null, qualityChart: null, pollingChart: null,
    init() { this.initClinicalChart(); this.initQualityChart(); this.initPollingChart(); },
    initClinicalChart() {
        const ctx = document.getElementById('clinicalChart'); if (!ctx) return;
        this.clinicalChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['Treatment', 'Placebo'], datasets: [{ label: 'Mean BP Reduction (mmHg)', data: [12.5, 3.2], backgroundColor: ['#4CAF50', '#9E9E9E'], borderColor: ['#388E3C', '#757575'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Blood Pressure Reduction by Group', font: { size: 16 } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Reduction (mmHg)' } } } }
        });
    },
    initQualityChart() {
        const ctx = document.getElementById('qualityChart'); if (!ctx) return;
        const labels = [], data = [];
        for (let t = -4; t <= 4; t += 0.1) { labels.push(t.toFixed(1)); data.push((1 / Math.sqrt(2 * Math.PI)) * Math.exp(-t * t / 2) * 0.9); }
        this.qualityChart = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: [{ label: 't-Distribution', data: data, borderColor: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.2)', fill: true, tension: 0.4 }, { label: 'Observed t', data: [{x: '10.6', y: 0}], type: 'scatter', backgroundColor: '#F44336', pointRadius: 10, pointStyle: 'star' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 't-Distribution with Observed Test Statistic', font: { size: 16 } } }, scales: { x: { title: { display: true, text: 't-value' } }, y: { beginAtZero: true, display: false } } }
        });
    },
    initPollingChart() {
        const ctx = document.getElementById('pollingChart'); if (!ctx) return;
        this.pollingChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['Candidate A', 'Threshold (50%)'], datasets: [{ label: 'Support Level', data: [0.52, 0.50], backgroundColor: ['#2196F3', '#9E9E9E'], borderColor: ['#1976D2', '#757575'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Poll Support vs Majority Threshold', font: { size: 16 } } }, scales: { y: { beginAtZero: false, min: 0.45, max: 0.60, ticks: { callback: v => (v * 100).toFixed(0) + '%' }, title: { display: true, text: 'Support Proportion' } } } }
        });
    },
    destroy() { if (this.clinicalChart) this.clinicalChart.destroy(); if (this.qualityChart) this.qualityChart.destroy(); if (this.pollingChart) this.pollingChart.destroy(); }
};

// Router integration (removed - now handled directly in Router.navigate())

function setupCaseStudyTabs() {
    const tabs = document.querySelectorAll('.tab-btn'), contents = document.querySelectorAll('.case-study-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active');
            contents.forEach(c => { c.classList.remove('active'); if (c.id === target + '-case') c.classList.add('active'); });
            if (typeof renderMathInElement !== 'undefined') renderMathInElement(document.getElementById('section-case-studies'), { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}] });
        });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports.DualitySimulator = DualitySimulator; module.exports.CaseStudyViz = CaseStudyViz; }
