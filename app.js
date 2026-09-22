// app.js - Unified State Offline Search Engine with Chapter, Section & Bookmark Systems
let publicServiceRules = [];
let bookmarkedRuleIds = [];
let showOnlyBookmarks = false;
let bookmarkDetailRuleId = null;

// Fast search index variables
let searchIndex = [];

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
        setTimeout(() => {
            splash.style.display = 'none';
        }, 500);
    }
}

function triggerActivationLock() {
    const seedCode = generateDeviceFingerprint();
    const requestCode = `PSR-${seedCode}-UDU`;

    const codeDisplay = document.getElementById('deviceRequestCode');
    if (codeDisplay) {
        codeDisplay.innerText = requestCode;
    }

    const lockOverlay = document.getElementById('activationLockOverlay');
    if (lockOverlay) {
        lockOverlay.classList.remove('splash-hidden-state');
        lockOverlay.style.display = 'flex';
    }
}

function closeActivationLock() {
    const lockOverlay = document.getElementById('activationLockOverlay');

    if (lockOverlay) {
        lockOverlay.classList.add('splash-hidden-state');
        lockOverlay.style.display = 'none';
    }

    // Return to the normal document view.
    const selector = document.getElementById('chapterSelector');
    const searchInput = document.getElementById('searchInput');

    if (selector) selector.value = "";
    if (searchInput) searchInput.value = "";

    showOnlyBookmarks = false;
    bookmarkDetailRuleId = null;

    applyFilters();

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ============================================================
// APP INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", function() {

    // 🔒 SAFETY NET: Guarantee splash removal within 2.5 seconds max
    const fallbackSplashTimer = setTimeout(() => {
        console.warn("Splash screen dismissed by safety fallback timer.");
        hideAppSplash();
    }, 2500);

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

    try {
        updateTrialReminder();
    } catch(e) {
        console.error("Trial reminder error:", e);
    }

    // Fetch the raw rules JSON file
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

            clearTimeout(fallbackSplashTimer);
            hideAppSplash();
        })
        .catch(error => {
            console.error("Initialization loop crash:", error);
            clearTimeout(fallbackSplashTimer);
            hideAppSplash();
        });
 
});

document.addEventListener("deviceready", function () {
    checkAppLicenseStatus();
    updateTrialReminder();
}, false);

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

        const isUnlocked = localStorage.getItem('barryPSR_premium_unlocked') === "true";
        const unlockedChapterLimit = isUnlocked ? 18 : getUnlockedChapterLimit();
        const isLocked = !isUnlocked && parseInt(ch, 10) > unlockedChapterLimit;

        option.innerText = `Ch. ${ch}: ${chapterTitles[ch] || 'Public Service Protocol'}${isLocked ? ' 🔒' : ''}`;

        selector.appendChild(option);
    });
}

// ============================================================
// CONTINUOUS NARROWING AND-LOGIC SEARCH FILTERS
// ============================================================
function getUnlockedChapterLimit() {
    const trialStart = Number(localStorage.getItem('psr_trial_start'));

    // If no valid trial start exists, keep the initial access level.
    if (!Number.isFinite(trialStart)) {
        return 3;
    }

    const TRIAL_DAY = 24 * 60 * 60 * 1000; // Production: 1 day = 24 hours
    const elapsed = Date.now() - trialStart;

    const dayNumber = Math.floor(elapsed / TRIAL_DAY) + 1;

    if (dayNumber === 1) return 3;
    if (dayNumber === 2) return 6;
    if (dayNumber === 3) return 9;
    if (dayNumber === 4) return 12;
    if (dayNumber === 5) return 15;
    if (dayNumber === 6) return 18;
    if (dayNumber === 7) return 18;

    // Day 8 onward
    return 2;
}


function applyFilters() {
    const isUnlocked = localStorage.getItem('barryPSR_premium_unlocked') === "true";

    const selectedChapter = document.getElementById('chapterSelector')
        ? document.getElementById('chapterSelector').value
        : "";

    const searchInput = document.getElementById('searchInput');
    const queryInput = searchInput ? searchInput.value.toLowerCase().trim() : "";

    // Determine the highest chapter currently available.
    const unlockedChapterLimit = isUnlocked ? 18 : getUnlockedChapterLimit();

    // If the selected chapter is currently locked, show the activation screen.
    if (
        !isUnlocked &&
        selectedChapter &&
        parseInt(selectedChapter, 10) > unlockedChapterLimit
    ) {
        triggerActivationLock();
        return;
    }

    const queryCleaned = queryInput.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?[\]\\]/g, " ");
    const queryTokens = queryCleaned.split(/\s+/).filter(token => token.length > 0);

    const filteredRules = publicServiceRules.filter(rule => {
        const matchesChapter = selectedChapter === "" || rule.chapter === selectedChapter;
        const matchesBookmarkState = !showOnlyBookmarks || bookmarkedRuleIds.includes(rule.id);
        
        if (!matchesChapter || !matchesBookmarkState) return false;

        // Only show chapters currently unlocked for this user.
        if (!isUnlocked && parseInt(rule.chapter, 10) > unlockedChapterLimit) {
            return false;
        }

        if (queryInput === "") return true;

        const numericMatch = queryInput.replace(/[^0-9]/g, "");
        if (numericMatch.length >= 4 && rule.id.includes(numericMatch)) {
            return true;
        }

        const searchCanvas = `psr-${rule.id} ${rule.title}${rule.content}`.toLowerCase();
        
        return queryTokens.every(token => {
            if (searchCanvas.includes(token)) return true;
            
            const alternatives = searchSynonyms[token] || [];
            return alternatives.some(alt => searchCanvas.includes(alt));
        });
    });

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

    setTimeout(() => {
        const resultsCount = document.getElementById('resultsCount');
        const stickyHeader = document.querySelector('.sticky-header-wrapper');

        if (resultsCount) {
            const offset = stickyHeader ? stickyHeader.offsetHeight : 60;
            const targetY = resultsCount.getBoundingClientRect().top + window.scrollY - offset - 8;

            window.scrollTo({
                top: Math.max(0, targetY),
                behavior: 'smooth'
            });
        }
    }, 50);
}

function filterChapter() {
    const selector = document.getElementById('chapterSelector');
    const searchInput = document.getElementById('searchInput');
    const selectedChapter = selector ? selector.value : "";

    if (selectedChapter !== "") {
        if (searchInput) searchInput.value = "";
        showOnlyBookmarks = false;
        
        applyFilters();

        setTimeout(() => {
            const chapterHeader = document.querySelector(`.chapter-header[data-chapter="${selectedChapter}"]`);
            const stickyHeader = document.querySelector('.sticky-header-wrapper');
            
            if (chapterHeader) {
                const offset = stickyHeader ? stickyHeader.offsetHeight : 60;
                const targetY = chapterHeader.getBoundingClientRect().top + window.scrollY - offset - 10;
                
                window.scrollTo({ 
                    top: targetY, 
                    behavior: 'smooth' 
                });
            }
        }, 80);
    } else {
        applyFilters();
    }
}

function toggleBookmarkFilter() {
    showOnlyBookmarks = !showOnlyBookmarks;
    bookmarkDetailRuleId = null;
    
    const btn = document.getElementById('bookmarkToggleBtn');
    const searchInput = document.getElementById('searchInput');
    const selector = document.getElementById('chapterSelector');
    if (!btn) return;
    
    if (showOnlyBookmarks) {
        if (searchInput) searchInput.value = "";
        if (selector) selector.value = "";
        
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

function openBookmarkedRule(ruleId) {
    const isUnlocked = localStorage.getItem('barryPSR_premium_unlocked') === "true";
    const isExpired = localStorage.getItem('psr_trial_expired') === 'true';

    const rule = publicServiceRules.find(r => r.id === ruleId);
    if (!rule) return;

    // Check if user is attempting to open a saved Chapter 3+ rule after trial expiration
    if (!isUnlocked && isExpired && parseInt(rule.chapter, 10) > 2) {
        triggerActivationLock();
        return;
    }

    bookmarkDetailRuleId = ruleId;
    showOnlyBookmarks = false;

    displayResults([rule], "", "");
}

function toggleBookmark(ruleId) {
    const index = bookmarkedRuleIds.indexOf(ruleId);

    if (index > -1) {
        bookmarkedRuleIds.splice(index, 1);
    } else {
        bookmarkedRuleIds.push(ruleId);
    }

    localStorage.setItem('barryPSR_bookmarks', JSON.stringify(bookmarkedRuleIds));

    if (bookmarkDetailRuleId !== null) {
        const rule = publicServiceRules.find(r => r.id === bookmarkDetailRuleId);

        if (rule && bookmarkedRuleIds.includes(rule.id)) {
            displayResults([rule], "", "");
        } else {
            bookmarkDetailRuleId = null;
            showOnlyBookmarks = true;
            applyFilters();
        }
        return;
    }

    applyFilters();
}

function clearFilter() {
    const searchInput = document.getElementById('searchInput');
    const selector = document.getElementById('chapterSelector');
    const btn = document.getElementById('bookmarkToggleBtn');

    if (searchInput) searchInput.value = "";
    if (selector) selector.value = "";

    showOnlyBookmarks = false;
    bookmarkDetailRuleId = null;

    if (btn) {
        btn.innerText = "⭐ Bookmarks";
        btn.style.background = "#fef3c7";
        btn.style.color = "#92400e";
    }

    applyFilters();

    setTimeout(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, 50);
}

// ============================================================
// UI DOM CARD INJECTION RENDER SYSTEM
// ============================================================
function displayResults(rulesList, selectedChapter, activeQuery) {
    const resultsContainer = document.getElementById('resultsContainer');
    const countContainer = document.getElementById('resultsCount');
    
    if (!resultsContainer || !countContainer) return;
    
    resultsContainer.innerHTML = "";
    countContainer.innerText = `Found ${rulesList.length} rule(s)`;

    const isUnlocked = localStorage.getItem('barryPSR_premium_unlocked') === "true";
    const isExpired = localStorage.getItem('psr_trial_expired') === 'true';

    // Handle Empty Search/Bookmark States
    if (rulesList.length === 0) {
        if (showOnlyBookmarks) {
            resultsContainer.innerHTML = `
                <div class="bookmark-empty-state" style="text-align: center; padding: 40px 20px; color: #b45309;">
                    <span style="font-size: 3rem;">⭐</span>
                    <h3 style="margin-top: 10px; font-weight: 800;">Your Reference Vault is Empty</h3>
                    <p style="font-size: 0.9rem; color: #666; max-width: 300px; margin: 8px auto 0;">Tap the star icon (☆) on any Public Service Rule card across chapters to pin vital records right here for instant offline reference.</p>
                </div>
            `;
        } else if (!isUnlocked && isExpired && selectedChapter && parseInt(selectedChapter, 10) > 2) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #b91c1c;">
                    <span style="font-size: 2.5rem;">🔒</span>
                    <h3 style="margin-top: 8px; font-weight: 800;">Chapter ${selectedChapter} is Locked</h3>
                    <p style="font-size: 0.85rem; color: #555; margin-top: 4px;">Your trial has ended. Activate full access to view Chapter ${selectedChapter}.</p>
                    <button onclick="triggerActivationLock()" style="margin-top: 12px; background: #008751; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer;">Activate Access</button>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #666;">
                    <p>No matching rules found in this scope.</p>
                </div>
            `;
        }
        return;
    }
    
     // ------------------------------------------------------------
    // MODE 1: BOOKMARK VAULT VIEW (CLICKABLE LIST FORMAT)
    // ------------------------------------------------------------
    if (showOnlyBookmarks && bookmarkDetailRuleId === null) {
        const bookmarkWrapper = document.createElement('div');
        bookmarkWrapper.className = 'bookmark-vault-list';
        bookmarkWrapper.style.display = 'flex';
        bookmarkWrapper.style.flexDirection = 'column';
        bookmarkWrapper.style.gap = '8px';
        bookmarkWrapper.style.marginTop = '10px';

        rulesList.forEach(rule => {
            const isLockedRule = !isUnlocked && isExpired && parseInt(rule.chapter, 10) > 2;

            const listItem = document.createElement('div');
            listItem.className = 'bookmark-list-item';
            listItem.style.background = '#ffffff';
            listItem.style.border = '1px solid #fcd34d';
            listItem.style.borderRadius = '8px';
            listItem.style.padding = '12px 14px';
            listItem.style.display = 'flex';
            listItem.style.alignItems = 'center';
            listItem.style.justifyContent = 'space-between';
            listItem.style.cursor = 'pointer';
            listItem.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

            const lockBadge = isLockedRule ? `<span style="font-size: 0.8rem; margin-left: 6px;">🔒</span>` : ``;

            listItem.innerHTML = `
                <div class="bookmark-text-area" style="flex: 1; padding-right: 10px; text-align: left;">
                    <div style="font-size: 0.75rem; font-weight: 700; color: #b45309; text-transform: uppercase;">
                        PSR-${rule.id} &bull; Ch. ${rule.chapter}${lockBadge}
                    </div>
                    <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-top: 2px; line-height: 1.3;">
                        ${rule.title}
                    </div>
                </div>
                <button class="bookmark-star-btn" style="background: none; border: none; font-size: 1.3rem; color: #b45309; cursor: pointer; padding: 4px 8px;">
                    ★
                </button>
            `;

            // Bind events safely
            const textArea = listItem.querySelector('.bookmark-text-area');
            const starBtn = listItem.querySelector('.bookmark-star-btn');

            if (textArea) {
                textArea.addEventListener('click', () => openBookmarkedRule(rule.id));
            }
            if (starBtn) {
                starBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleBookmark(rule.id);
                });
            }

            bookmarkWrapper.appendChild(listItem);
        });

        resultsContainer.appendChild(bookmarkWrapper);
        return;
    }

    // ------------------------------------------------------------
    // MODE 2: STANDARD / SEARCH / SINGLE DETAIL CARD VIEW
    // ------------------------------------------------------------
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

    rulesList.forEach(rule => {
        if (rule.chapter !== lastRenderedChapter && !showOnlyBookmarks) {
            const isLockedChapter = !isUnlocked && isExpired && parseInt(rule.chapter, 10) > 2;

            const bigBanner = document.createElement('div');
            bigBanner.className = 'chapter-header';
            bigBanner.setAttribute('data-chapter', rule.chapter);
            bigBanner.style.background = isLockedChapter ? "#fee2e2" : "#e6f4ea";
            bigBanner.style.color = isLockedChapter ? "#991b1b" : "#008751";
            bigBanner.style.padding = "12px 16px";
            bigBanner.style.borderRadius = "8px";
            bigBanner.style.fontWeight = "800";
            bigBanner.style.fontSize = "1rem";
            bigBanner.style.marginTop = "25px";
            bigBanner.style.marginBottom = "10px";
            bigBanner.style.borderLeft = isLockedChapter ? "6px solid #dc2626" : "6px solid #008751";
            
            const lockIcon = isLockedChapter ? " 🔒 (LOCKED)" : "";
            bigBanner.innerText = `CHAPTER ${rule.chapter}: ${chapterTitles[rule.chapter] || 'PUBLIC SERVICE PROTOCOL'}${lockIcon}`;
            
            resultsContainer.appendChild(bigBanner);
            lastRenderedChapter = rule.chapter;
        }

        if (rule.section_title && !showOnlyBookmarks) {
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
            sectionBanner.innerText = `Section ${rule.section}:${rule.section_title}`;
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
                    finalContent = finalContent.replace(regex, `<mark style="background: #ffeb3b; padding: 0; border-radius: 2px;">$1</mark>`);
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
                <button class="rule-star-btn" style="background: none; border: none; font-size: 1.4rem; color: ${starColor}; cursor: pointer; padding-left: 10px;">
                    ${starIcon}
                </button>
            </div>
            <div style="font-size: 0.8rem; color: #888; margin-bottom: 8px;">
                Chapter ${rule.chapter} | Section ${rule.section} | Rule ${rule.rule}
            </div>
            <p class="rule-content">${finalContent}</p>
        `;

        const cardStarBtn = card.querySelector('.rule-star-btn');
        if (cardStarBtn) {
            cardStarBtn.addEventListener('click', () => toggleBookmark(rule.id));
        }

        resultsContainer.appendChild(card);
    });
}

// ANDROID HARDWARE BACK BUTTON
document.addEventListener("backbutton", function (event) {
    event.preventDefault();
    
    if (bookmarkDetailRuleId !== null) {
        bookmarkDetailRuleId = null;
        showOnlyBookmarks = true;

        const btn = document.getElementById('bookmarkToggleBtn');
        if (btn) {
            btn.innerText = "⭐ Showing Saved";
            btn.style.background = "#b45309";
            btn.style.color = "#ffffff";
        }

        applyFilters();
        return;
    }   

    const chapterSelector = document.getElementById("chapterSelector");
    const searchInput = document.getElementById("searchInput");

    if (chapterSelector && chapterSelector.value !== "") {
        chapterSelector.value = "";
        applyFilters();
        return;
    }

    if (searchInput && searchInput.value.trim() !== "") {
        searchInput.value = "";
        applyFilters();
        return;
    }

    if (navigator.app && navigator.app.exitApp) {
        navigator.app.exitApp();
    }
}, false);   

// ============================================================
// 🔒 OFFLINE DEVICE LOCK & ACTIVATION KEY ENGINE
// ============================================================
const ENGR_UDU_SECRET_SALT = 8423; 

function generateDeviceFingerprint() {
    const signature = navigator.userAgent + (navigator.languages ? navigator.languages.join('') : 'en');
    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
        hash = (hash << 5) - hash + signature.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 9000) + 1000;
}

// ============================================================


function updateTrialReminder() {
    const reminder = document.getElementById('trialReminder');
    if (!reminder) return;

    if (localStorage.getItem('barryPSR_premium_unlocked') === "true") {
        reminder.style.display = "none";
        return;
    }

    const trialStart = Number(localStorage.getItem('psr_trial_start'));

    if (!Number.isFinite(trialStart)) {
        reminder.style.display = "none";
        return;
    }

    const TRIAL_DURATION = 8 * 24 * 60 * 60 * 1000; // Production: 8 days
    const now = Date.now();
    const remaining = TRIAL_DURATION - (now - trialStart);

    if (remaining <= 0) {
        reminder.innerText = "🔒 Your trial period has expired. Please activate lifetime access.";
        reminder.style.display = "block";
        return;
    }

    const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));

    if (daysRemaining <= 3) {
        reminder.innerText =
            `⚠️ Only ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} of trial access remaining.`;
    } else {
        reminder.innerText =
            `⏳ ${daysRemaining} days of trial access remaining.`;
    }

    reminder.style.display = "block";
}

function checkAppLicenseStatus() {
    const isActivated = localStorage.getItem('barryPSR_premium_unlocked');

    if (isActivated === "true") {
        return;
    }

    const TRIAL_DURATION = 8 * 24 * 60 * 60 * 1000; // Production: 8 days
    const now = Date.now();

    let trialStart = localStorage.getItem('psr_trial_start');

    // First launch: create the local trial start time.
    if (!trialStart) {
        trialStart = now.toString();
        localStorage.setItem('psr_trial_start', trialStart);
    }

    let trialStartTime = Number(trialStart);

    // Protect against an invalid or future timestamp.
    if (!Number.isFinite(trialStartTime) || trialStartTime > now) {
        trialStart = now.toString();
        trialStartTime = now;
        localStorage.setItem('psr_trial_start', trialStart);
    }

    // Detect clock rollback.
    const lastSeen = Number(localStorage.getItem('psr_last_seen_time') || 0);

    if (lastSeen > 0 && now < lastSeen) {
        localStorage.setItem('psr_trial_expired', 'true');
    }

    localStorage.setItem('psr_last_seen_time', now.toString());

    const expired = localStorage.getItem('psr_trial_expired') === 'true';
    const trialElapsed = now - trialStartTime;

    if (!expired && trialElapsed < TRIAL_DURATION) {
        return;
    }

    localStorage.setItem('psr_trial_expired', 'true');
    triggerActivationLock();
}

function validateLicenseKey() {
    const userInput = document.getElementById('activationKeyInput').value.trim();
    const seedCode = generateDeviceFingerprint();
    
    const expectedCorrectKey = `KEY-${seedCode * ENGR_UDU_SECRET_SALT}-XYZ`;

    if (userInput === expectedCorrectKey) {
        localStorage.setItem('barryPSR_premium_unlocked', "true");
        alert("🎉 Premium Lifetime Access successfully activated! Thank you for supporting Engr Udu.");
        
        const lockOverlay = document.getElementById('activationLockOverlay');
        if (lockOverlay) {
            lockOverlay.classList.add('splash-hidden-state');
            lockOverlay.style.display = 'none';
        }
    } else {
        alert("❌ Invalid Activation Key! Please double-check your text or contact Engr Udu on WhatsApp.");
    }
}

// ============================================================
// 🚀 BULLETPROOF UNIVERSAL WHATSAPP LAUNCH ENGINE
// ============================================================
function launchWhatsAppOrderingIntents() {
    const seedCode = generateDeviceFingerprint();
    const requestCode = `PSR-${seedCode}-UDU`;
    const myPhoneNumber = "2348052538349";

    const message =
        `Hello Engr Udu, I want to activate premium access for my PSR Tutor App. ` +
        `My Unique Request Code is: ${requestCode}`;

    const completeUrl =
        "https://api.whatsapp.com/send?phone=" +
        myPhoneNumber +
        "&text=" +
        encodeURIComponent(message);

    console.log("Opening WhatsApp:", completeUrl);
    window.location.href = completeUrl;
}

// ============================================================
// END OF LICENSE & ACTIVATION SYSTEM
// ============================================================

// No test-only reset functions are included in the production version.
// The 8-day trial is controlled by checkAppLicenseStatus() above.
