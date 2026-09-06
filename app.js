// app.js - Unified State Offline Search Engine with Chapter, Section & Bookmark Systems
let publicServiceRules = [];
let bookmarkedRuleIds = [];
let showOnlyBookmarks = false;

function hideAppSplash() {
    const splash = document.getElementById('appSplashScreen');

    if (splash) {
        splash.classList.add('splash-hidden-state');
    }
}

document.addEventListener("DOMContentLoaded", function() {

    // Load saved bookmarks
    const savedBookmarks =
        localStorage.getItem('barryPSR_bookmarks');

    if (savedBookmarks) {
        bookmarkedRuleIds = JSON.parse(savedBookmarks);
    }

    // Load the offline PSR database
    fetch('psr_data.json')

        .then(response => {

            if (!response.ok) {
                throw new Error(
                    `Database request failed: ${response.status}`
                );
            }

            return response.json();
        })

        .then(data => {

            publicServiceRules = data;

            // Build the chapter selector
            buildDynamicDropdown();

            // Display the initial interface
            applyFilters();

            console.log(
                `Successfully indexed ${publicServiceRules.length} detailed PSR rules offline.`
            );

            /*
             * The app is now ready.
             * Give the splash a short finishing moment,
             * then reveal the application.
             */
            setTimeout(() => {
                hideAppSplash();
            }, 1300);

        })

        .catch(error => {

            console.error(
                "Error loading offline rule dataset:",
                error
            );

            alert(
                "The offline PSR database could not be loaded. " +
                "Please reopen the app or check that psr_data.json is present."
            );

            // Never leave the user trapped on the splash screen
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

function applyFilters() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const selectedChapter = document.getElementById('chapterSelector').value;
    
    const filteredRules = publicServiceRules.filter(rule => {
        const matchesSearch = query === "" || 
                              rule.id.toLowerCase().includes(query) || 
                              rule.title.toLowerCase().includes(query) || 
                              rule.content.toLowerCase().includes(query);
                              
        const matchesChapter = selectedChapter === "" || rule.chapter === selectedChapter;
        
        // Bookmark condition layer filter check
        const matchesBookmarkState = !showOnlyBookmarks || bookmarkedRuleIds.includes(rule.id);
        
        return matchesSearch && matchesChapter && matchesBookmarkState;
    });

    displayResults(filteredRules, selectedChapter, query);
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
            const chapterHeader = document.querySelector(
                `.chapter-header[data-chapter="${selectedChapter}"]`
            );

            if (chapterHeader) {
                const stickyHeader = document.querySelector(
                    '.sticky-header-wrapper'
                );

                const offset = stickyHeader
                    ? stickyHeader.getBoundingClientRect().height + 12
                    : 12;

                const headerPosition =
                    chapterHeader.getBoundingClientRect().top +
                    window.pageYOffset -
                    offset;

                window.scrollTo({
                    top: Math.max(0, headerPosition),
                    behavior: "smooth"
                });
            }
        });
    }
}

function toggleBookmarkFilter() {
    showOnlyBookmarks = !showOnlyBookmarks;
    const btn = document.getElementById('bookmarkToggleBtn');
    
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

// Toggles bookmarks on individual rule cards and updates phone storage memory
function toggleBookmark(ruleId) {
    const index = bookmarkedRuleIds.indexOf(ruleId);
    if (index > -1) {
        bookmarkedRuleIds.splice(index, 1); // Remove if already bookmarked
    } else {
        bookmarkedRuleIds.push(ruleId); // Add if new bookmark
    }
    
    // Save string database state to device memory layer
    localStorage.setItem('barryPSR_bookmarks', JSON.stringify(bookmarkedRuleIds));
    
    // Re-apply filters to update card UI state dynamically
    applyFilters();
}

function clearFilter() {
    document.getElementById('searchInput').value = "";
    document.getElementById('chapterSelector').value = "";
    showOnlyBookmarks = false;
    
    const btn = document.getElementById('bookmarkToggleBtn');
    btn.innerText = "⭐ Bookmarks";
    btn.style.background = "#fef3c7";
    btn.style.color = "#92400e";
    
    applyFilters();
}

function displayResults(rulesList, selectedChapter, activeQuery) {
    const resultsContainer = document.getElementById('searchResults');
    const countContainer = document.getElementById('resultsCount');
    
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
        "18": "REGULATIONS AND APPENDIX",
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
            bigBanner.className = "chapter-header";
bigBanner.dataset.chapter = rule.chapter;
            bigBanner.style.background = "#e6f4ea";
            bigBanner.style.color = "#008751";
            bigBanner.style.padding = "12px 16px";
            bigBanner.style.borderRadius = "8px";
            bigBanner.style.fontWeight = "800";
            bigBanner.style.fontSize = "1rem";
            bigBanner.style.marginTop = "25px";
            bigBanner.style.marginBottom = "10px";
            bigBanner.style.borderLeft = "6px solid #008751";
            bigBanner.style.letterSpacing = "0.5px";
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
            const regex = new RegExp(`(${escapeRegExp(activeQuery)})`, 'gi');
            finalContent = rule.content.replace(regex, `<mark style="background: #ffeb3b; padding: 0 2px; border-radius: 2px;">$1</mark>`);
        }
        
        // Determine whether this card is currently starred
        const isStarred = bookmarkedRuleIds.includes(rule.id);
        const starIcon = isStarred ? "★" : "☆";
        const starColor = isStarred ? "#b45309" : "#a1a1aa";
        
        card.innerHTML = `
            <div class="rule-header">
                <span class="rule-id">PSR-${rule.id}</span>
                <h3 class="rule-title">${rule.title}</h3>
                <!-- Interactive bookmark tap target icon button -->
                <button 
                    onclick="toggleBookmark('${rule.id}')" 
                    style="background: none; border: none; font-size: 1.4rem; color: ${starColor}; cursor: pointer; padding-left: 10px;"
                >
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

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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