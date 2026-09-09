// app.js - Unified State Offline Search Engine with Chapter, Section & Bookmark Systems
let publicServiceRules = [];
let bookmarkedRuleIds = [];
let showOnlyBookmarks = false;

// Fast search index variables
let searchIndex = [];
let searchTimer = null;

// ============================================================
// PSR INTELLIGENT SEARCH VOCABULARY
// ============================================================
const searchSynonyms = {
    leave: [
        "leave", "leaves", "absence", "absent",
        "study leave", "annual leave", "sick leave",
        "maternity leave", "paternity leave",
        "examination leave", "sabbatical leave"
    ],
    study: [
        "study", "studies", "studying",
        "course", "courses",
        "education", "educational",
        "academic", "academics",
        "postgraduate", "post graduate",
        "higher degree", "degree",
        "training"
    ],
    salary: [
        "salary", "salaries",
        "pay", "paid", "payment", "payments",
        "emolument", "emoluments",
        "allowance", "allowances"
    ],
    promotion: [
        "promotion", "promotions",
        "promote", "promoted",
        "advancement", "advancing",
        "higher grade", "higher post"
    ],
    senior: [
        "senior",
        "senior officer", "senior officers",
        "senior staff",
        "management",
        "higher grade",
        "higher post"
    ],
    training: [
        "training", "train", "trained",
        "course", "courses",
        "instruction", "development",
        "capacity building"
    ],
    retirement: [
        "retirement", "retire", "retired",
        "pension", "pensions",
        "service age"
    ],
    discipline: [
        "discipline", "disciplinary",
        "misconduct", "offence", "offense",
        "punishment", "sanction",
        "penalty", "penalties"
    ],
    transfer: [
        "transfer", "transferred",
        "posting", "posted",
        "relocation"
    ]
};
// ============================================================
// FAST SEARCH INDEX & UTILITIES
// ============================================================
function normalizeSearchText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?[\]\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchIndex() {
    searchIndex = publicServiceRules.map(rule => {
        const searchableText = normalizeSearchText(
            `${rule.id} ${rule.chapter} ${rule.section} ${rule.rule} ${rule.title} ${rule.content}`
        );
        return {
            id: rule.id,
            text: searchableText
        };
    });
    console.log(`Fast search index built for ${searchIndex.length} rules.`);
}

function hideAppSplash() {
    const splash = document.getElementById('appSplashScreen');
    if (splash) {
        splash.classList.add('splash-hidden-state');
    }
}

// ============================================================
// APP INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }
    
    // Load saved bookmarks out of localStorage memory
    const savedBookmarks = localStorage.getItem('barryPSR_bookmarks');
    if (savedBookmarks) {
        try {
            bookmarkedRuleIds = JSON.parse(savedBookmarks);
        } catch(e) {
            bookmarkedRuleIds = [];
        }
    }

    // Fetch the raw rules JSON data file
    fetch('psr_data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Database file missing or failed to fetch: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            publicServiceRules = data;
            
            // Trigger dynamic core systems builders
            buildSearchIndex();
            buildDynamicDropdown();
            applyFilters();

            setTimeout(() => {
                hideAppSplash();
            }, 1300);
        })
        .catch(error => {
            console.error("Initialization loop crash:", error);
            alert("Database engine mapping failed. Ensure rules file is grouped in the root folder map path.");
            hideAppSplash();
        });
});
function buildDynamicDropdown() {
    const selector = document.getElementById('chapterSelector');
    if (!selector) return;

    const uniqueChapters = [...new Set(publicServiceRules.map(rule => rule.chapter))];
    uniqueChapters.sort((a, b) => parseInt(a) - parseInt(b));

    selector.innerHTML = '<option value="">Chapters</option>';

    const chapterTitles = {
        "1": "Introduction & Authority",
        "2": "Appointments & Leaving the Service",
        "3": "Prescribed Examination for Confirmation",
        "4": "Emoluments & Increments",
        "5": "Performance Management System(PMS)",
        "6": "Reward And Recognition for Outstanding Work And Meritorious Service",
        "7": "Training And Staff Development Within And Outside Nigeria",
        "8": "Free Transport Facilities On Official Assignments",
        "9": "Virtual Meetings And Engagements",
        "10": "Discipline",
        "11": "Petitions and Appeals",
        "12": "Leave",
        "13": "Medical and Dental Procedures",
        "14": "Allowances",
        "15": "Innovations and Inventions",
        "16": "Compensation and Insurance",
        "17": "Application of the Public Service Rules to Federal Government Parastatals",
        "18": "Regulations and Appendix",
    };

    uniqueChapters.forEach(ch => {
        const option = document.createElement('option');
        option.value = ch;
        option.innerText = `Ch. ${ch}: ${chapterTitles[ch] || 'Public Service Protocol'}`;
        selector.appendChild(option);
    });
}

// ============================================================
// CONTINUOUS NARROWING AND-LOGIC SEARCH FILTERS
// ============================================================
function applyFilters() {
    const queryInput = document.getElementById('searchInput').value.toLowerCase().trim();
    const selectedChapter = document.getElementById('chapterSelector').value;
    
    // Clean and split string entries into distinct filtering words tokens
    const queryCleaned = queryInput.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?[\]\\]/g, " ");
    const queryTokens = queryCleaned.split(/\s+/).filter(token => token.length > 0);

    const filteredRules = publicServiceRules.filter(rule => {
        const matchesChapter = selectedChapter === "" || rule.chapter === selectedChapter;
        const matchesBookmarkState = !showOnlyBookmarks || bookmarkedRuleIds.includes(rule.id);
        
        if (!matchesChapter || !matchesBookmarkState) return false;
        if (queryInput === "") return true;

        // Fast Exact Rule ID Identification Hook Shortcut
        const numericMatch = queryInput.replace(/[^0-9]/g, "");
        if (numericMatch.length >= 4 && rule.id.includes(numericMatch)) {
            return true;
        }

        const searchCanvas = `psr-${rule.id} ${rule.title} ${rule.content}`.toLowerCase();
        
        // Pure continuous AND-intersection engine logic: checks tokens and expanded dictionary values
        return queryTokens.every(token => {
            if (searchCanvas.includes(token)) return true;
            
            // Check cross-reference dictionary equivalents list
            const alternatives = searchSynonyms[token] || [];
            return alternatives.some(alt => searchCanvas.includes(alt));
        });
    });

    // Sort matching relevance metrics: floating title matches to the absolute top of layout
    if (queryInput !== "") {
        filteredRules.sort((a, b) => {
            const aHit = a.title.toLowerCase().includes(queryInput) || a.id.includes(queryInput);
            const bHit = b.title.toLowerCase().includes(queryInput) || b.id.includes(queryInput);
            if (aHit && !bHit) return -1;
            if (!aHit && bHit) return 1;
            return 0;
        });
    }

    displayResults(filteredRules, selectedChapter, queryInput);
}

function performSearch() {
    applyFilters();
}

function filterChapter() {
    const selector = document.getElementById('chapterSelector');
    const selectedChapter = selector.value;
    applyFilters();

    if (selectedChapter !== "") {
        requestAnimationFrame(() => {
            const chapterHeader = document.querySelector(`.chapter-header[data-chapter="${selectedChapter}"]`);
            const stickyHeader = document.querySelector('.sticky-header-wrapper');
            if (chapterHeader) {
                const offset = stickyHeader ? stickyHeader.offsetHeight : 60;
                const topTarget = chapterHeader.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top: topTarget, behavior: 'smooth' });
            }
        });
    }
}

function toggleBookmarkFilter() {
    showOnlyBookmarks = !showOnlyBookmarks;
    const btn = document.getElementById('bookmarkToggleBtn');
    if (!btn) return;
    
    if (showOnlyBookmarks) {
        btn.innerText = "⭐ Showing Saved";
        btn.style.background = "#b45309";
        btn.style.color = "#ffffff";
    } else {
        btn.innerText = "⭐ Bookmarks";
        btn.style.background = "#fef3c7";
        btn.style.color = "#92400e";
    }
    applyFilters();
}

function toggleBookmark(ruleId) {
    const index = bookmarkedRuleIds.indexOf(ruleId);
    if (index > -1) {
        bookmarkedRuleIds.splice(index, 1);
    } else {
        bookmarkedRuleIds.push(ruleId);
    }
    localStorage.setItem('barryPSR_bookmarks', JSON.stringify(bookmarkedRuleIds));
    applyFilters();
}

function clearFilter() {
    document.getElementById('searchInput').value = "";
    document.getElementById('chapterSelector').value = "";
    showOnlyBookmarks = false;
    
    const btn = document.getElementById('bookmarkToggleBtn');
    if (btn) {
        btn.style.background = "";
        btn.style.color = "";
        btn.innerText = "⭐ Bookmarks";
    }
    applyFilters();
}
// ============================================================
// UI DOM CARD INJECTION RENDER SYSTEM
// ============================================================
function displayResults(rulesList, selectedChapter, activeQuery) {
    // Matched specifically to id="resultsContainer" inside your HTML file
    const resultsContainer = document.getElementById('resultsContainer');
    const countContainer = document.getElementById('resultsCount');
    
    if (!resultsContainer || !countContainer) return;
    
    resultsContainer.innerHTML = "";
    countContainer.innerText = `Found ${rulesList.length} rule(s)`;
    
    const chapterTitles = {
        "1": "INTRODUCTION & AUTHORITY",
        "2": "APPOINTMENTS AND LEAVING THE SERVICE",
        "3": "PRESCRIBED EXAMINATION FOR CONFIRMATION",
        "4": "EMOLUMENTS & INCREMENTS",
        "5": "PERFORMANCE MANAGEMENT SYSTEM(PMS)",
        "6": "REWARD AND RECOGNITION FOR OUTSTANDING WORK AND MERITORIOUS SERVICE",
        "7": "TRAINING AND STAFF DEVELOPMENT WITHIN AND OUTSIDE NIGERIA",
        "8": "FREE TRANSPORT FACILITIES ON OFFICIAL ASSIGNMENTS",
        "9": "VIRTUAL MEETINGS AND ENGAGEMENTS",
        "10": "DISCIPLINE",
        "11": "PETITIONS AND APPEALS",
        "12": "LEAVE",
        "13": "MEDICAL AND DENTAL PROCEDURES",
        "14": "ALLOWANCES",
        "15": "INNOVATIONS AND INVENTIONS",
        "16": "COMPENSATION AND INSURANCE",
        "17": "APPLICATION OF THE PUBLIC SERVICE RULES TO FEDERAL GOVERNMENT PARASTATALS",
        "18": "REGULATIONS AND APPENDIX"
    };

    let lastRenderedChapter = null;

    if (rulesList.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #666;">
                <p>No matching rules found in this scope.</p>
            </div>
        `;
        return;
    }

    rulesList.forEach(rule => {
        if (rule.chapter !== lastRenderedChapter) {
            const bigBanner = document.createElement('div');
            bigBanner.className = 'chapter-header';
            bigBanner.setAttribute('data-chapter', rule.chapter);
            bigBanner.style.background = "#e6f4ea";
            bigBanner.style.color = "#008751";
            bigBanner.style.padding = "12px 16px";
            bigBanner.style.borderRadius = "8px";
            bigBanner.style.fontWeight = "800";
            bigBanner.style.fontSize = "1rem";
            bigBanner.style.marginTop = "25px";
            bigBanner.style.marginBottom = "10px";
            bigBanner.style.borderLeft = "6px solid #008751";
            bigBanner.innerText = `CHAPTER ${rule.chapter}: ${chapterTitles[rule.chapter] || 'PUBLIC SERVICE PROTOCOL'}`;
            resultsContainer.appendChild(bigBanner);
            
            lastRenderedChapter = rule.chapter;
        }

        if (rule.section_title) {
            const sectionBanner = document.createElement('div');
            sectionBanner.style.background = "#f0fdf4";
            sectionBanner.style.color = "#166534";
            sectionBanner.style.padding = "6px 12px";
            sectionBanner.style.borderRadius = "4px";
            sectionBanner.style.fontWeight = "700";
            sectionBanner.style.fontSize = "0.85rem";
            sectionBanner.style.marginTop = "10px";
            sectionBanner.style.marginBottom = "12px";
            sectionBanner.style.borderBottom = "2px dashed #bbf7d0";
            sectionBanner.style.textTransform = "uppercase";
            sectionBanner.innerText = `Section ${rule.section}: ${rule.section_title}`;
            resultsContainer.appendChild(sectionBanner);
        }

        const card = document.createElement('div');
        card.className = 'rule-card';
        card.style.marginBottom = "12px";
        
        let finalContent = rule.content;
        if (activeQuery !== "") {
            const cleanHighlightInput = activeQuery.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?[\]\\]/g, " ");
            const highlightTokens = cleanHighlightInput.split(/\s+/).filter(t => t.length >= 3);
            
            highlightTokens.forEach(token => {
                try {
                    const regex = new RegExp(`(${escapeRegExp(token)})`, 'gi');
                    finalContent = finalContent.replace(regex, `<mark style="background: #ffeb3b; padding: 0 2px; border-radius: 2px;">$1</mark>`);
                } catch(e) {}
            });
        }
        
        const isStarred = bookmarkedRuleIds.includes(rule.id);
        const starIcon = isStarred ? "★" : "☆";
        const starColor = isStarred ? "#b45309" : "#a1a1aa";
        
        card.innerHTML = `
            <div class="rule-header">
                <span class="rule-id">PSR-${rule.id}</span>
                <h3 class="rule-title">${rule.title}</h3>
                <button onclick="toggleBookmark('${rule.id}')" style="background: none; border: none; font-size: 1.4rem; color: ${starColor}; cursor: pointer; padding-left: 10px;">
                    ${starIcon}
                </button>
            </div>
            <div style="font-size: 0.8rem; color: #888; margin-bottom: 8px;">
                Chapter ${rule.chapter} | Section ${rule.section} | Rule ${rule.rule}
            </div>
            <p class="rule-content">${finalContent}</p>
        `;
        resultsContainer.appendChild(card);
    });
}

// ANDROID HARDWARE BACK BUTTON
document.addEventListener("backbutton", function (event) {
    event.preventDefault();

    const chapterSelector = document.getElementById("chapterSelector");
    const searchInput = document.getElementById("searchInput");

    // 1. If a chapter is selected, clear the chapter filter
    if (chapterSelector && chapterSelector.value !== "") {
        chapterSelector.value = "";
        applyFilters();
        return;
    }

    // 2. If a search is active, clear the search
    if (searchInput && searchInput.value.trim() !== "") {
        searchInput.value = "";
        applyFilters();
        return;
    }

    // 3. Otherwise, exit the Android app
    if (navigator.app && navigator.app.exitApp) {
        navigator.app.exitApp();
    }
}, false);