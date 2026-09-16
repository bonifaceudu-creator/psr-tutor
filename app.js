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
// ============================================================
// APP INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }
    
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
    // Safety wrap catches references gracefully even if chunks load late
    // ============================================================
    try {
        if (typeof updateTrialReminder === "function") {
            updateTrialReminder();
        }
    } catch(e) { console.warn("Reminder layout hook deferred."); }

    fetch('psr_data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Database file missing or failed to fetch: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            publicServiceRules = data;
            
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

    try {
        if (typeof testPersistentTrialStorage === "function") {
            testPersistentTrialStorage();
        }
    } catch(e) {}
});


document.addEventListener("deviceready", function () {
    checkAppLicenseStatus();
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

        const searchCanvas = `psr-${rule.id} ${rule.title} ${rule.content}`.toLowerCase();
        
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
    const selectedChapter = selector.value;

    if (selectedChapter !== "") {
        if (searchInput) searchInput.value = "";
        showOnlyBookmarks = false;
        
        selector.value = "";
        applyFilters();
        
        selector.value = selectedChapter;

        setTimeout(() => {
            const chapterHeader = document.querySelector(`.chapter-header[data-chapter="${selectedChapter}"]`);
            const stickyHeader = document.querySelector('.sticky-header-wrapper');
            
            if (chapterHeader) {
                const offset = stickyHeader ? stickyHeader.offsetHeight : 60;
                const targetY = chapterHeader.getBoundingClientRect().top + window.scrollY - offset - 10;
                window.scrollTo({ top: targetY, behavior: 'smooth' });
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
        if (searchInput) searchInput.value = "";
        if (selector) selector.value = "";
        
        btn.innerText = "⭐ Showing Saved";
        btn.style.background = "#b45309";
        btn.style.color = "#ffffff";
        
        if (hudBanner) {
            hudBanner.classList.remove('splash-hidden-state');
            hudBanner.style.display = "block";
        }
    } else {
        btn.innerText = "⭐ Bookmarks";
        btn.style.background = "#fef3c7";
        btn.style.color = "#92400e";
        
        if (hudBanner) {
            hudBanner.classList.add('splash-hidden-state');
            hudBanner.style.display = "none";
        }
    }
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
}
// ============================================================
// UI DOM CARD INJECTION RENDER SYSTEM
// ============================================================
function displayResults(rulesList, selectedChapter, activeQuery) {
    const resultsContainer = document.getElementById('resultsContainer');
    const countContainer = document.getElementById('resultsCount');
    const hudCountText = document.getElementById('hudCountText');
    
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
        "17": "APPLICATION OF the PUBLIC SERVICE RULES TO FEDERAL GOVERNMENT PARASTATALS",
        "18": "REGULATIONS AND APPENDIX"
    };

    let lastRenderedChapter = null;

    if (rulesList.length === 0) {
        if (showOnlyBookmarks) {
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
            item.onclick = function() { openBookmarkedRule(rule.id); };
            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-size: 0.72rem; color: #b45309; font-weight: 800; margin-bottom: 3px;">PSR-${rule.id}</div>
                    <div style="font-size: 0.95rem; color: #1f2937; font-weight: 700; line-height: 1.35;">${rule.title}</div>
                </div>
                <div style="font-size: 1.25rem; color: #9ca3af; padding-left: 10px;">›</div>
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
// 🔒 PERSISTENT TRIAL MARKER SYSTEM
// ============================================================
const TRIAL_MARKER_FOLDER = "PSR_Tutor_License";
const TRIAL_MARKER_FILE = "trial.dat";

function getPersistentTrialMarker(callback) {
    if (!window.resolveLocalFileSystemURL || !window.cordova || !cordova.file) {
        callback(null);
        return;
    }
    const rootPath = cordova.file.externalRootDirectory;
    window.resolveLocalFileSystemURL(rootPath, function (rootEntry) {
        rootEntry.getDirectory(TRIAL_MARKER_FOLDER, { create: true }, function (folderEntry) {
            folderEntry.getFile(TRIAL_MARKER_FILE, { create: false }, function (fileEntry) {
                fileEntry.file(function (file) {
                    const reader = new FileReader();
                    reader.onloadend = function () { callback(this.result || null); };
                    reader.onerror = function () { callback(null); };
                    reader.readAsText(file);
                }, function () { callback(null); });
            }, function () { callback(null); });
        }, function () { callback(null); });
    }, function () { callback(null); });
}

function createPersistentTrialMarker(timestamp, callback) {
    if (!window.resolveLocalFileSystemURL || !window.cordova || !cordova.file) {
        callback(false);
        return;
    }
    const rootPath = cordova.file.externalRootDirectory;
    window.resolveLocalFileSystemURL(rootPath, function (rootEntry) {
        rootEntry.getDirectory(TRIAL_MARKER_FOLDER, { create: true }, function (folderEntry) {
            folderEntry.getFile(TRIAL_MARKER_FILE, { create: true }, function (fileEntry) {
                fileEntry.createWriter(function (writer) {
                    writer.onwriteend = function () { callback(true); };
                    writer.onerror = function () { callback(false); };
                    writer.write(String(timestamp));
                }, function () { callback(false); });
            }, function () { callback(false); });
        }, function () { callback(false); });
    }, function () { callback(false); });
}

function updateTrialReminder() {
    const reminder = document.getElementById('trialReminder');
    if (!reminder) return;

    if (localStorage.getItem('barryPSR_premium_unlocked') === "true") {
        reminder.style.display = "none";
        return;
    }

    let trialStart = localStorage.getItem('psr_trial_start');
    if (!trialStart) {
        reminder.innerText = "⏳ 30-Day Free Trial Active";
        return;
    }

    const trialStartTime = Number(trialStart);
    const now = Date.now();
    const TRIAL_DURATION = 30 * 24 * 60 * 60 * 1000;
    const elapsed = now - trialStartTime;

    if (elapsed >= TRIAL_DURATION || localStorage.getItem('psr_trial_expired') === 'true') {
        reminder.innerText = "🔒 Trial Period Expired";
        reminder.style.background = "#dc2626";
        reminder.style.color = "#ffffff";
    } else {
        const daysLeft = Math.ceil((TRIAL_DURATION - elapsed) / (24 * 60 * 60 * 1000));
        reminder.innerText = `⏳ Free Trial: ${daysLeft} day(s) remaining`;
        reminder.style.background = "#fffbeb";
        reminder.style.color = "#b45309";
    }
}

function testPersistentTrialStorage() {
    console.log("Checking storage markers loop...");
}

function checkAppLicenseStatus() {
    const isActivated = localStorage.getItem('barryPSR_premium_unlocked');
    if (isActivated === "true") return;

    const TRIAL_DURATION = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    getPersistentTrialMarker(function (persistentMarker) {
        let trialStart = localStorage.getItem('psr_trial_start');

        if (!trialStart && persistentMarker) {
            trialStart = persistentMarker;
            localStorage.setItem('psr_trial_start', trialStart);
        }

        if (!trialStart) {
            trialStart = now.toString();
            localStorage.setItem('psr_trial_start', trialStart);
            createPersistentTrialMarker(trialStart, function (success) {
                console.log(success ? "PSR marker saved." : "PSR marker failed.");
                updateTrialReminder();
            });
        }

        let trialStartTime = Number(trialStart);

        if (!Number.isFinite(trialStartTime) || trialStartTime > now) {
            trialStart = now.toString();
            trialStartTime = now;
            localStorage.setItem('psr_trial_start', trialStart);
            createPersistentTrialMarker(trialStart, function () {
                updateTrialReminder();
            });
        }

        const lastSeen = Number(localStorage.getItem('psr_last_seen_time') || 0);
        if (lastSeen > 0 && now < lastSeen) {
            localStorage.setItem('psr_trial_expired', 'true');
        }
        localStorage.setItem('psr_last_seen_time', now.toString());

        const expired = localStorage.getItem('psr_trial_expired') === 'true';
        const trialElapsed = now - trialStartTime;

        updateTrialReminder();

        if (!expired && trialElapsed < TRIAL_DURATION) {
            return;
        }

        const seedCode = generateDeviceFingerprint();
        const requestCode = `PSR-${seedCode}-UDU`;
        const codeDisplay = document.getElementById('deviceRequestCode');
        if (codeDisplay) codeDisplay.innerText = requestCode;

        const lockOverlay = document.getElementById('activationLockOverlay');
        if (lockOverlay) lockOverlay.classList.remove('splash-hidden-state');
    });
}

function validateLicenseKey() {
    const userInput = document.getElementById('activationKeyInput').value.trim();
    const seedCode = generateDeviceFingerprint();
    const expectedCorrectKey = `KEY-${seedCode * ENGR_UDU_SECRET_SALT}-XYZ`;

    if (userInput === expectedCorrectKey) {
        localStorage.setItem('barryPSR_premium_unlocked', "true");
        alert("🎉 Premium Lifetime Access successfully activated! Thank you for supporting Engr Udu.");
        
        const lockOverlay = document.getElementById('activationLockOverlay');
        if (lockOverlay) lockOverlay.classList.add('splash-hidden-state');
        
        const reminder = document.getElementById('trialReminder');
        if (reminder) reminder.style.display = "none";
        location.reload();
    } else {
        alert("❌ Invalid Activation Key! Please double-check your text or contact Engr Udu on WhatsApp.");
    }
}

function generateDeviceFingerprint() {
    // 1. Create a hidden, off-screen graphic text canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillText('PSR-Lock-Footprint', 2, 2);
    
    // 2. Extract the raw pixel data array to catch microscopic GPU rendering traits
    let canvasHash = 0;
    try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < data.length; i += 4) {
            canvasHash += data[i];
        }
    } catch(e) {
        canvasHash = 1234; // Safe fallback if canvas reading is restricted
    }

    // 3. Combine the pixel graphics fingerprint with absolute physical phone hardware attributes
    const hardwareTraits = navigator.userAgent + screen.width + screen.height + screen.colorDepth + canvasHash;
    
    // 4. Run a mathematical hashing loop to lock it into a permanent 4-digit Request Code seed
    let hash = 0;
    for (let i = 0; i < hardwareTraits.length; i++) {
        hash = (hash << 5) - hash + hardwareTraits.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 9000) + 1000; // Returns your unchanging unique seed (e.g., 4512)
}


// ============================================================
// 🚀 BULLETPROOF UNIVERSAL WHATSAPP LAUNCH ENGINE
// ============================================================
function launchWhatsAppOrderingIntents() {
    const seedCode = generateDeviceFingerprint();
    const requestCode = `PSR-${seedCode}-UDU`;
    const myPhoneNumber = "2348052538349";
    const message = `Hello Engr Udu, I want to activate premium access for my PSR Tutor App. My Unique Request Code is: ${requestCode}`;
    const completeUrl = "https://whatsapp.com" + myPhoneNumber + "&text=" + encodeURIComponent(message);

    console.log("Opening WhatsApp:", completeUrl);

    if (window.cordova && window.cordova.InAppBrowser) {
        window.cordova.InAppBrowser.open(completeUrl, '_system');
    } else if (typeof cordova !== 'undefined' && cordova.InAppBrowser) {
        cordova.InAppBrowser.open(completeUrl, '_system');
    } else {
        window.open(completeUrl, '_system');
    }
}
