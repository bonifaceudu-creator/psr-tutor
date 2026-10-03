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

function getDeviceId() {
    // Native Cordova builds: use the stable device UUID supplied by cordova-plugin-device.
    if (window.device && window.device.uuid) {
        const nativeId = String(window.device.uuid).trim();
        if (nativeId) {
            localStorage.setItem('psr_device_id', nativeId);
            return nativeId;
        }
    }

    // Browser/Acode fallback: create a local test identifier.
    // The production APK uses the native device UUID above.
    let localId = localStorage.getItem('psr_device_id');
    if (!localId) {
        if (window.crypto && window.crypto.randomUUID) {
            localId = window.crypto.randomUUID();
        } else {
            localId = `WEB-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
        localStorage.setItem('psr_device_id', localId);
    }
    return localId;
}

function getNumericDeviceId() {
    const deviceId = getDeviceId();
    let hash = 0;

    for (let i = 0; i < deviceId.length; i++) {
        hash = ((hash * 31) + deviceId.charCodeAt(i)) | 0;
    }

    return Math.abs(hash) % 900000 + 100000;
}

function getISOWeekNumber(date) {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);

    const day = tempDate.getDay() || 7;
    tempDate.setDate(tempDate.getDate() + 4 - day);

    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
}

function getCurrentCodeFactors() {
    const now = new Date();
    const weekday = now.getDay() || 7; // Monday=1 ... Sunday=7
    const weekNumber = getISOWeekNumber(now);
    const dayOfMonth = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    return {
        weekday,
        weekNumber,
        dayOfMonth,
        month,
        year
    };
}

function calculateAccessCode(type) {
    const factors = getCurrentCodeFactors();
    const deviceNumber = getNumericDeviceId();

    // Trial salt = 8. Lifetime salt = 15.
    // EXACT FORMULA:
    // SALT × ISO weekday × ISO week number × numeric device ID
    const salt = type === "trial" ? 8 : 15;

    return String(
        salt *
        factors.weekday *
        factors.weekNumber *
        deviceNumber
    );
}

function getDeviceDisplayId() {
    // Display the numeric device identifier used in the activation formula.
    return String(getNumericDeviceId());
}

function getTrialExpiryTime() {
    const trialStart = Number(localStorage.getItem('psr_trial_start'));
    if (!Number.isFinite(trialStart)) return 0;

    return trialStart + (7 * 24 * 60 * 60 * 1000);
}

function isTrialCurrentlyActive() {
    const expiry = getTrialExpiryTime();
    if (!expiry) return false;

    const now = Date.now();
    const lastSeen = Number(localStorage.getItem('psr_last_seen_time') || 0);

    if (lastSeen > 0 && now < lastSeen) {
        localStorage.setItem('psr_trial_expired', 'true');
        return false;
    }

    localStorage.setItem('psr_last_seen_time', now.toString());

    const expired = now >= expiry;

    if (expired) {
        localStorage.setItem('psr_trial_expired', 'true');
    }

    return !expired;
}

function isAppAccessGranted() {
    return localStorage.getItem('barryPSR_premium_unlocked') === "true"
        || isTrialCurrentlyActive();
}

function triggerActivationLock() {
    const codeDisplay = document.getElementById('deviceRequestCode');
    if (codeDisplay) {
        codeDisplay.innerText = getDeviceDisplayId();
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

    applyFilters();
}

// ============================================================
// APP INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", function() {

    // 🔒 SAFETY NET: Guarantee splash removal within 2.5 seconds max
    const fallbackSplashTimer = setTimeout(() => {
        console.warn("Splash screen dismissed by safety fallback timer.");
        hideAppSplash();
    }, 6000);

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

            if (!window.psrAccessGateInitialized) {
                initializeAccessGate();
            }

            clearTimeout(fallbackSplashTimer);

          setTimeout(() => {
          hideAppSplash();
        }, 5000);
        })
        
        .catch(error => {
            console.error("Initialization loop crash:", error);
            clearTimeout(fallbackSplashTimer);
            hideAppSplash();
        });
 
});

function initializeAccessGate() {
    if (window.psrAccessGateInitialized) return;
    window.psrAccessGateInitialized = true;

    getDeviceId();
    startTrialReminderTimer();
    checkAppLicenseStatus();
}

document.addEventListener("deviceready", function () {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeAccessGate, { once: true });
    } else {
        initializeAccessGate();
    }
}, false);

document.addEventListener("DOMContentLoaded", function () {
    // Browser/Acode preview fallback and native startup synchronization.
    if (window.device && window.device.uuid) {
        initializeAccessGate();
    }
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

    const selectedChapter = document.getElementById('chapterSelector')
        ? document.getElementById('chapterSelector').value
        : "";

    const searchInput = document.getElementById('searchInput');
    const queryInput = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const queryCleaned = queryInput.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?[\]\\]/g, " ");
    const queryTokens = queryCleaned.split(/\s+/).filter(token => token.length > 0);

    const filteredRules = publicServiceRules.filter(rule => {
        const matchesChapter = selectedChapter === "" || rule.chapter === selectedChapter;
        const matchesBookmarkState = !showOnlyBookmarks || bookmarkedRuleIds.includes(rule.id);
        
        if (!matchesChapter || !matchesBookmarkState) return false;

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
    const rule = publicServiceRules.find(r => r.id === ruleId);
    if (!rule) return;

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
// 🔗 CLICKABLE PSR RULE REFERENCES
// ============================================================
let ruleReferenceReturnScrollY = 0;

function openRuleReference(ruleId) {
    const targetRule = publicServiceRules.find(rule => rule.id === String(ruleId));

    ruleReferenceReturnScrollY = window.scrollY;

    const modal = document.getElementById('ruleReferenceModal');
    const title = document.getElementById('ruleReferenceModalTitle');
    const meta = document.getElementById('ruleReferenceModalMeta');
    const content = document.getElementById('ruleReferenceModalContent');

    if (!modal || !title || !meta || !content) return;

    if (!targetRule) {
        title.innerText = `Referenced Rule ${ruleId}`;
        meta.innerText = "Reference not found in the current PSR database";
        content.textContent =
            `The document references Rule ${ruleId}, but that rule number is not present in the current psr_data.json database. The original PSR text has been preserved unchanged.`;
    } else {
        title.innerText = `PSR-${targetRule.id} — ${targetRule.title}`;
        meta.innerText =
            `Chapter ${targetRule.chapter} | Section ${targetRule.section} | Rule ${targetRule.rule}`;

        content.textContent = targetRule.content;
    }

    modal.classList.add('rule-reference-modal-visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('rule-reference-modal-open');
}

function closeRuleReference() {
    const modal = document.getElementById('ruleReferenceModal');

    if (!modal) return;

    modal.classList.remove('rule-reference-modal-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('rule-reference-modal-open');

    requestAnimationFrame(() => {
        window.scrollTo({
            top: ruleReferenceReturnScrollY,
            behavior: 'auto'
        });
    });
}

function makeRuleReferencesClickable(html) {
    const rulePattern = /\bRules?\s+(\d{6,7})\b/gi;

    return String(html || "").replace(
        rulePattern,
        (match, ruleId) =>
            `<button type="button" class="psr-rule-reference" onclick="openRuleReference('${ruleId}')">${match}</button>`
    );
}

function highlightSearchTerms(html, activeQuery) {
    if (!activeQuery) return html;

    const tokens = activeQuery
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?[\]\\]/g, " ")
        .split(/\s+/)
        .filter(t => t.length >= 3);

    if (!tokens.length) return html;

    const placeholders = [];
    let safeHtml = html.replace(
        /<button\b[^>]*class="psr-rule-reference"[^>]*>.*?<\/button>/gi,
        match => {
            const index = placeholders.length;
            placeholders.push(match);
            return `\uE000${index}\uE001`;
        }
    );

    tokens.forEach(token => {
        try {
            const regex = new RegExp(`(${escapeRegExp(token)})`, 'gi');
            safeHtml = safeHtml.replace(
                regex,
                `<mark style="background: #ffeb3b; padding: 0; border-radius: 2px;">$1</mark>`
            );
        } catch (e) {}
    });

    placeholders.forEach((placeholder, index) => {
        safeHtml = safeHtml.replace(`\uE000${index}\uE001`, placeholder);
    });

    return safeHtml;
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

            listItem.innerHTML = `
                <div class="bookmark-text-area" style="flex: 1; padding-right: 10px; text-align: left;">
                    <div style="font-size: 0.75rem; font-weight: 700; color: #b45309; text-transform: uppercase;">
                        PSR-${rule.id} &bull; Ch. ${rule.chapter}
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
        
        const linkedContent = makeRuleReferencesClickable(rule.content);
        const finalContent = highlightSearchTerms(linkedContent, activeQuery);

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
    
    const ruleReferenceModal = document.getElementById('ruleReferenceModal');
    if (ruleReferenceModal &&
        ruleReferenceModal.classList.contains('rule-reference-modal-visible')) {
        closeRuleReference();
        return;
    }

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

function updateTrialReminder() {
    const reminder = document.getElementById('trialReminder');
    if (!reminder) return;

    if (localStorage.getItem('barryPSR_premium_unlocked') === "true") {
        reminder.style.display = "none";
        return;
    }

    const expiry = getTrialExpiryTime();

    if (!expiry) {
        reminder.innerText = "🔐 Enter your access code to start the 7-day trial.";
        reminder.style.display = "block";
        return;
    }

    const remaining = expiry - Date.now();

    if (remaining <= 0) {
        localStorage.setItem('psr_trial_expired', 'true');
        reminder.innerText = "🔒 Your 7-day trial has expired. Please activate lifetime access.";
        reminder.style.display = "block";

        const lockOverlay = document.getElementById('activationLockOverlay');
        const lockIsVisible = lockOverlay &&
            !lockOverlay.classList.contains('splash-hidden-state');

        if (!lockIsVisible) {
            triggerActivationLock();
        }
        return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    reminder.innerText =
        `⏳ Trial remaining: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    reminder.style.display = "block";
}

function startTrialReminderTimer() {
    if (window.psrTrialReminderTimer) {
        clearInterval(window.psrTrialReminderTimer);
    }

    window.psrTrialReminderTimer = setInterval(updateTrialReminder, 1000);
    updateTrialReminder();
}

function checkAppLicenseStatus() {
    if (localStorage.getItem('barryPSR_premium_unlocked') === "true") {
        updateTrialReminder();
        return;
    }

    if (isTrialCurrentlyActive()) {
        updateTrialReminder();
        return;
    }

    triggerActivationLock();
}

function showActivationMessage(type) {
    const modal = document.getElementById('activationMessageModal');
    const icon = document.getElementById('activationMessageIcon');
    const title = document.getElementById('activationMessageTitle');
    const text = document.getElementById('activationMessageText');

    if (!modal || !icon || !title || !text) return;

    const messages = {
        'trial-success': {
            icon: '✓',
            title: '7-Day Trial Activated',
            text: 'Your full-access trial is now active. All app features are available for 7 days.'
        },
        'lifetime-success': {
            icon: '★',
            title: 'Lifetime Access Activated',
            text: 'Your lifetime access has been successfully activated. You now have permanent access to the app.'
        },
        'empty-code': {
            icon: '!',
            title: 'Enter Your Access Code',
            text: 'Please enter the access code supplied by Engr Udu before tapping “Unlock App”.'
        },
        'invalid-code': {
            icon: '!',
            title: 'Invalid Access Code',
            text: 'The code entered is not valid for this device. Please check the code and try again.'
        }
    };

    const message = messages[type] || messages['invalid-code'];

    icon.innerText = message.icon;
    title.innerText = message.title;
    text.innerText = message.text;

    modal.classList.remove('activation-message-error', 'activation-message-success');
    modal.classList.add(
        type.endsWith('error') || type === 'empty-code' || type === 'invalid-code'
            ? 'activation-message-error'
            : 'activation-message-success'
    );

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
}

function closeActivationMessage() {
    const modal = document.getElementById('activationMessageModal');
    if (modal) {
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function validateLicenseKey() {
    const userInput = document.getElementById('activationKeyInput');
    if (!userInput) return;

    const enteredCode = userInput.value.trim().toUpperCase();

    if (!enteredCode) {
        showActivationMessage('empty-code');
        return;
    }

    const expectedTrialCode = calculateAccessCode("trial");
    const expectedLifetimeCode = calculateAccessCode("lifetime");

    if (enteredCode === expectedTrialCode) {
        const trialStartNow = Date.now();
        localStorage.setItem('psr_trial_start', trialStartNow.toString());
        localStorage.setItem('psr_trial_expired', 'false');
        localStorage.setItem('psr_last_seen_time', trialStartNow.toString());
        localStorage.removeItem('barryPSR_premium_unlocked');

        closeActivationLock();
        updateTrialReminder();
        startTrialReminderTimer();

        showActivationMessage('trial-success');
        return;
    }

    if (enteredCode === expectedLifetimeCode) {
        localStorage.setItem('barryPSR_premium_unlocked', "true");
        localStorage.removeItem('psr_trial_expired');

        closeActivationLock();
        updateTrialReminder();

        showActivationMessage('lifetime-success');
        return;
    }

    showActivationMessage('invalid-code');
}

// ============================================================
// 🚀 BULLETPROOF UNIVERSAL WHATSAPP LAUNCH ENGINE
// ============================================================
function launchWhatsAppOrderingIntents() {
    const deviceId = getDeviceDisplayId();
    const today = new Date().toLocaleDateString();

    const myPhoneNumber = "2348052538349";

    const message =
        `Hello Engr Udu, I want an access code for my PSR Tutor App. ` +
        `My Device ID is: ${deviceId}. ` +
        `Today's date is: ${today}.`;

    const completeUrl =
        "https://api.whatsapp.com/send?phone=" +
        myPhoneNumber +
        "&text=" +
        encodeURIComponent(message);

    console.log("Opening WhatsApp:", completeUrl);
    window.location.href = completeUrl;
}

// ============================================================
// END OF ACCESS & ACTIVATION SYSTEM
// ============================================================

// No test-only reset functions are included in the production version.
// The 7-day trial is controlled locally by checkAppLicenseStatus() above.
