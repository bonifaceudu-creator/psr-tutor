// app.js - Unified State Offline Search Engine with Chapter, Section & Bookmark Systems
let publicServiceRules = [];
let bookmarkedRuleIds = [];
let showOnlyBookmarks = false;
let bookmarkDetailRuleId = null;

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

    // ============================================================
    // 🔒 INITIALIZE PREMIUM SECURITY CHECK ENGINE
    // ============================================================
    checkAppLicenseStatus();
    updateTrialReminder();

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

    // After every search, return the viewport to the top of the results.
    setTimeout(() => {
        const resultsCount = document.getElementById('resultsCount');
        const stickyHeader = document.querySelector('.sticky-header-wrapper');

        if (resultsCount) {
            const offset = stickyHeader ? stickyHeader.offsetHeight : 60;
            const targetY =
                resultsCount.getBoundingClientRect().top +
                window.scrollY -
                offset -
                8;

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
    const selectedChapter = selector.value;

    if (selectedChapter !== "") {
        // 1. Reset text inputs so the entire book layout renders for coordinate calculation
        if (searchInput) searchInput.value = "";
        showOnlyBookmarks = false;
        
        // 2. Temporarily reset the selector value to empty so applyFilters() prints the FULL book
        selector.value = "";
        applyFilters();
        
        // 3. Restore the selector value on the UI element
        selector.value = selectedChapter;

        // 4. Smoothly glide the phone viewport down to the target chapter banner
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
    const btn = document.getElementById('bookmarkToggleBtn');
    const hudBanner = document.getElementById('bookmarkHudBanner');
    const searchInput = document.getElementById('searchInput');
    const selector = document.getElementById('chapterSelector');
    if (!btn) return;
    
    if (showOnlyBookmarks) {
        // 1. Quietly clear the search box and dropdown text selection values without triggering input crash event bugs
        if (searchInput) searchInput.value = "";
        if (selector) selector.value = "";
        
        btn.innerText = "⭐ Showing Saved";
        btn.style.background = "#b45309";
        btn.style.color = "#ffffff";
        
        // 2. Make our polished amber HUD context dashboard banner visible instantly
        if (hudBanner) {
            hudBanner.classList.remove('splash-hidden-state');
            hudBanner.style.display = "block"; // Explicitly forces display visibility layout
        }
    } else {
        btn.innerText = "⭐ Bookmarks";
        btn.style.background = "#fef3c7";
        btn.style.color = "#92400e";
        
        // 3. Hide HUD banner out of your active view frames cleanly
        if (hudBanner) {
            hudBanner.classList.add('splash-hidden-state');
            hudBanner.style.display = "none";
        }
    }
    
    // 4. Force a clean database redraw block to snap your cards into position perfectly
    applyFilters();
}

function openBookmarkedRule(ruleId) {
    const rule = publicServiceRules.find(r => r.id === ruleId);
    if (!rule) return;

    bookmarkDetailRuleId = ruleId;
    showOnlyBookmarks = false;

    const searchInput = document.getElementById('searchInput');
    const selector = document.getElementById('chapterSelector');

    if (searchInput) searchInput.value = "";
    if (selector) selector.value = "";

    const btn = document.getElementById('bookmarkToggleBtn');
    if (btn) {
        btn.innerText = "⭐ Bookmarks";
        btn.style.background = "#fef3c7";
        btn.style.color = "#92400e";
    }

    const hudBanner = document.getElementById('bookmarkHudBanner');
    if (hudBanner) {
        hudBanner.classList.add('splash-hidden-state');
        hudBanner.style.display = "none";
    }

    displayResults([rule], "", "");
}


function toggleBookmark(ruleId) {
    const index = bookmarkedRuleIds.indexOf(ruleId);

    if (index > -1) {
        bookmarkedRuleIds.splice(index, 1);
    } else {
        bookmarkedRuleIds.push(ruleId);
    }

    localStorage.setItem(
        'barryPSR_bookmarks',
        JSON.stringify(bookmarkedRuleIds)
    );

    // If we are viewing a saved rule in detail, keep that rule open.
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
    const hudBanner = document.getElementById('bookmarkHudBanner');

    // Clear search and chapter filter
    if (searchInput) searchInput.value = "";
    if (selector) selector.value = "";

    // Exit bookmark mode and any bookmarked-rule detail view
    showOnlyBookmarks = false;
    bookmarkDetailRuleId = null;

    // Restore normal Bookmarks button
    if (btn) {
        btn.innerText = "⭐ Bookmarks";
        btn.style.background = "#fef3c7";
        btn.style.color = "#92400e";
    }

    // Restore the landing-page Saved Reference Vault
    

    // Return to the normal full rule listing
        // Return to the normal full rule listing
    applyFilters();

    // Return to the beginning of the PSR document
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
    // Matched specifically to id="resultsContainer" inside your HTML file
    const resultsContainer = document.getElementById('resultsContainer');
    const countContainer = document.getElementById('resultsCount');
    
    
    const hudCountText = document.getElementById('hudCountText');
    
    // Dynamically sync counts inside your amber HUD dashboard card element
    if (hudCountText) {
        hudCountText.innerText = `${bookmarkedRuleIds.length} vital rule(s) pinned for fast offline access`;
    }
    
    
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
        if (showOnlyBookmarks) {
            // Render an absolute gorgeous placeholder experience if no bookmarks exist yet
            resultsContainer.innerHTML = `
                <div class="bookmark-empty-state">
                    <span class="empty-star-icon">⭐</span>
                    <h3>Your Reference Vault is Empty</h3>
                    <p>Tap the star icon (☆) on any Public Service Rule card across chapters to pin vital records right here for instant offline reference.</p>
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


// ============================================================
// ⭐ BOOKMARK INDEX VIEW
// Show saved rules as a compact list instead of full rule cards.
// Tapping a saved rule opens its normal detailed rule display.
// ============================================================
if (showOnlyBookmarks) {
    const bookmarkHeading = document.createElement('div');
    bookmarkHeading.style.padding = "12px 4px 8px";
    bookmarkHeading.style.color = "#166534";
    bookmarkHeading.style.fontWeight = "800";
    bookmarkHeading.style.fontSize = "1rem";
    bookmarkHeading.innerText = "⭐ SAVED RULES";
    resultsContainer.appendChild(bookmarkHeading);

    rulesList.forEach(rule => {
        const item = document.createElement('div');
        item.className = 'bookmark-rule-item';
        item.onclick = function() {
            openBookmarkedRule(rule.id);
        };

        item.innerHTML = `
            <div style="flex: 1;">
                <div style="font-size: 0.72rem; color: #b45309; font-weight: 800; margin-bottom: 3px;">
                    PSR-${rule.id}
                </div>
                <div style="font-size: 0.95rem; color: #1f2937; font-weight: 700; line-height: 1.35;">
                    ${rule.title}
                </div>
            </div>

            <div style="font-size: 1.25rem; color: #9ca3af; padding-left: 10px;">
                ›
            </div>
        `;

        resultsContainer.appendChild(item);
    });

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
    
     // If viewing one bookmarked rule, return to the Saved Rules list
    if (bookmarkDetailRuleId !== null) {
        bookmarkDetailRuleId = null;
        showOnlyBookmarks = true;

        const btn = document.getElementById('bookmarkToggleBtn');
        if (btn) {
            btn.innerText = "⭐ Showing Saved";
            btn.style.background = "#b45309";
            btn.style.color = "#ffffff";
        }

        const hudBanner = document.getElementById('bookmarkHudBanner');
        if (hudBanner) {
            hudBanner.classList.remove('splash-hidden-state');
            hudBanner.style.display = "block";
        }

        applyFilters();
        return;
    }   

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


// ============================================================
// 🔒 OFFLINE DEVICE LOCK & ACTIVATION KEY ENGINE
// ============================================================

// Secret Math Factor Core Definition: Change this multiplier value to whatever number you like!
const ENGR_UDU_SECRET_SALT = 8423; 

function generateDeviceFingerprint() {
    // Collect specific browser agent layout criteria metrics to build a local device footprint
    const signature = navigator.userAgent + (navigator.languages ? navigator.languages.join('') : 'en');
    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
        hash = (hash << 5) - hash + signature.charCodeAt(i);
        hash |= 0; // Forces computation into a clean native 32bit integer block
    }
    return Math.abs(hash % 9000) + 1000; // Guarantees a clean 4-digit unique integer seed
}

function updateTrialReminder() {
    const reminder = document.getElementById('trialReminder');
    if (!reminder) return;

    // Activated users do not need a trial reminder.
    if (localStorage.getItem('barryPSR_premium_unlocked') === "true") {
        reminder.style.display = "none";
        return;
    }

    const trialStart = Number(localStorage.getItem('psr_trial_start'));

    if (!Number.isFinite(trialStart)) {
        reminder.style.display = "none";
        return;
    }

    const TRIAL_DURATION = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const remaining = TRIAL_DURATION - (now - trialStart);

    if (remaining <= 0) {
        reminder.innerText = "🔒 Your 30-day trial has expired. Please activate lifetime access.";
        reminder.style.display = "block";
        return;
    }

    const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));

    if (daysRemaining <= 3) {
        reminder.innerText =
            `⚠️ Only ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} of trial access remaining.`;
    } else if (daysRemaining <= 7) {
        reminder.innerText =
            `🔔 ${daysRemaining} days of trial access remaining.`;
    } else {
        reminder.innerText =
            `⏳ ${daysRemaining} days of trial access remaining.`;
    }

    reminder.style.display = "block";
}


function checkAppLicenseStatus() {
    // Lifetime activation always takes priority
    const isActivated = localStorage.getItem('barryPSR_premium_unlocked');

    if (isActivated === "true") {
        return;
    }

    // ================================
    // 30-DAY PREMIUM TRIAL
    // ================================
    const TRIAL_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
    const now = Date.now();

    let trialStart = localStorage.getItem('psr_trial_start');

    // First launch: start the trial
    if (!trialStart) {
        trialStart = now.toString();
        localStorage.setItem('psr_trial_start', trialStart);
    }

    const trialStartTime = Number(trialStart);

    // Basic protection against an invalid stored date
    if (!Number.isFinite(trialStartTime) || trialStartTime > now) {
        localStorage.setItem('psr_trial_start', now.toString());
        trialStart = now.toString();
    }

    // Remember the latest time the app was opened
    const lastSeen = Number(
        localStorage.getItem('psr_last_seen_time') || 0
    );

    // Basic clock-rollback protection
    if (lastSeen > 0 && now < lastSeen) {
        // Treat a significant clock rollback as trial expiry
        localStorage.setItem(
            'psr_trial_expired',
            'true'
        );
    }

    localStorage.setItem(
        'psr_last_seen_time',
        now.toString()
    );

    const expired =
        localStorage.getItem('psr_trial_expired') === 'true';

    const trialElapsed =
        now - Number(trialStart);

    // Trial is still active
    if (!expired && trialElapsed < TRIAL_DURATION) {
        return;
    }

    // ================================
    // TRIAL EXPIRED → SHOW LOCKSCREEN
    // ================================

    const seedCode = generateDeviceFingerprint();
    const requestCode = `PSR-${seedCode}-UDU`;

    const codeDisplay =
        document.getElementById('deviceRequestCode');

    if (codeDisplay) {
        codeDisplay.innerText = requestCode;
    }

    const lockOverlay =
        document.getElementById('activationLockOverlay');

    if (lockOverlay) {
        lockOverlay.classList.remove(
            'splash-hidden-state'
        );
    }
}

function validateLicenseKey() {
    const userInput = document.getElementById('activationKeyInput').value.trim();
    const seedCode = generateDeviceFingerprint();
    
    // --- THE SECRET FORMULA ---
    // The correct mathematical activation key calculation sequence requirement
    const expectedCorrectKey = `KEY-${seedCode * ENGR_UDU_SECRET_SALT}-XYZ`;

    if (userInput === expectedCorrectKey) {
        localStorage.setItem('barryPSR_premium_unlocked', "true");
        alert("🎉 Premium Lifetime Access successfully activated! Thank you for supporting Engr Udu.");
        
        // Hide the security overlay screen completely
        const lockOverlay = document.getElementById('activationLockOverlay');
        if (lockOverlay) {
            lockOverlay.classList.add('splash-hidden-state');
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

    // Navigate directly instead of creating a second browser page
    window.location.href = completeUrl;
}
