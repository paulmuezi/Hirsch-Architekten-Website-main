// --- START OF FILE scripts.js ---

// DOM Elements (bestehende beibehalten)
const navbar = document.querySelector('.navbar');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const impressumLink = document.querySelector('.impressum-link');
// const datenschutzLink = document.querySelector('.datenschutz-link'); // Datenschutz-Modal nicht implementiert
const impressumModal = document.getElementById('impressum');
const modalClose = document.querySelector('.modal-close'); // Gilt für alle Modals mit dieser Klasse
const typingElement = document.querySelector('.hero h1.typing');
const typingSecondElement = document.querySelector('.hero p.typing-second');

// === Pfade (bestehend) ===
const PROJECT_DATA_BASE_PATH = 'projekt_daten/';
const PROJECT_MANIFEST_FILE = PROJECT_DATA_BASE_PATH + 'projekte_manifest.json';
const TEAM_DATA_BASE_PATH = 'team_daten/';
const TEAM_MANIFEST_FILE = TEAM_DATA_BASE_PATH + 'team_manifest.json';

// --- Manifest Ladefunktionen (bestehend) ---
async function fetchProjectManifest() {
    const manifestUrl = PROJECT_MANIFEST_FILE + `?v=${Date.now()}`;
    console.log(`[fetchProjectManifest] Lade Manifest: ${manifestUrl}`);
    try {
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error(`Manifest nicht gefunden (${response.status}): ${manifestUrl}`);
        const manifest = await response.json();
        if (!Array.isArray(manifest)) throw new Error("Manifest ist kein Array.");
        // console.log("[fetchProjectManifest] Manifest geladen:", manifest); // Weniger verbose im Normalbetrieb
        return manifest;
    } catch (error) {
        console.error('[fetchProjectManifest] Fehler:', error);
        return [];
    }
}

async function fetchTeamManifest() {
    const manifestUrl = TEAM_MANIFEST_FILE + `?v=${Date.now()}`;
    console.log(`[fetchTeamManifest] Lade Team-Manifest: ${manifestUrl}`);
    try {
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error(`Team-Manifest nicht gefunden (${response.status}): ${manifestUrl}`);
        const manifest = await response.json();
        if (!Array.isArray(manifest)) throw new Error("Team-Manifest ist kein Array.");
        // console.log("[fetchTeamManifest] Team-Manifest geladen:", manifest); // Weniger verbose im Normalbetrieb
        return manifest;
    } catch (error) {
        console.error('[fetchTeamManifest] Fehler:', error);
        return [];
    }
}

// --- loadProjects Funktion (bestehend) ---
async function loadProjects() {
  const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/Hirsch-Architekten-Website-main/');
  const isProjectsPage = window.location.pathname.includes('projects.html');
  let gridSelector = null;
  let projectsToDisplay = [];
  if (!isIndexPage && !isProjectsPage) return;

  const manifest = await fetchProjectManifest();
  if (!manifest || manifest.length === 0) {
      console.warn("[loadProjects] Kein Projekt-Manifest oder leer.");
      let projectGrid = document.querySelector('#projects .projects-grid') || document.querySelector('.all-projects-grid');
      if (projectGrid) projectGrid.innerHTML = "<p>Keine Projekte zum Anzeigen vorhanden.</p>";
      return;
  }

  // *** WICHTIG FÜR PROJEKTE: Sortierung nach Projekt-ID (Ordnername) ***
  manifest.sort((a, b) => a.id.localeCompare(b.id));
  // ***********************************************************************

  if (isIndexPage) { gridSelector = '#projects .projects-grid'; projectsToDisplay = manifest.slice(0, 4); }
  else if (isProjectsPage) { gridSelector = '.all-projects-grid'; projectsToDisplay = manifest; }

  const projectsGrid = document.querySelector(gridSelector);
  if (projectsGrid && projectsToDisplay.length > 0) {
    projectsGrid.innerHTML = '';
    projectsToDisplay.forEach((project) => {
      if (!project || !project.id || !project.title) { console.warn(`Ungültiger Projekteintrag`, project); return; }
      const thumbnailUrl = project.thumbnail ? `${PROJECT_DATA_BASE_PATH}${project.thumbnail}` : 'https://via.placeholder.com/300x400?text=Bild';
      const categoryHtml = project.category ? `<span class="project-category">${project.category}</span>` : '';
      const projectCard = document.createElement('div');
      projectCard.className = 'project-card';
      projectCard.innerHTML = `
        <a href="project_detail.html?id=${encodeURIComponent(project.id)}" class="project-card-link">
          <div class="project-image"><img src="${thumbnailUrl}" alt="${project.title}" loading="lazy" /></div>
          <div class="project-info">${categoryHtml}<h3 class="project-title">${project.title}</h3></div>
        </a>`;
      projectsGrid.appendChild(projectCard);
    });
  } else if (projectsGrid) {
       projectsGrid.innerHTML = "<p>Keine Projekte zum Anzeigen vorhanden.</p>";
  }
}

// --- loadProjectDetails Funktion (bestehend) ---
async function loadProjectDetails() {
    const projectContentSection = document.getElementById('project-content');
    if (!projectContentSection) return;
    const errorContainer = document.getElementById('project-error');
    const titleEl = document.getElementById('project-title');
    const descriptionEl = document.getElementById('project-description');
    const galleryEl = document.getElementById('project-gallery');
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        if (projectContentSection) projectContentSection.style.display = 'none';
        if (errorContainer) errorContainer.style.display = 'block';
        return;
    }
    const projectFolderPath = `${PROJECT_DATA_BASE_PATH}${projectId}/`;
    const infoTxtPath = `${projectFolderPath}info.txt`;
    try {
        const response = await fetch(infoTxtPath + `?v=${Date.now()}`);
        if (!response.ok) throw new Error(`info.txt für Projekt nicht gefunden (${response.status}): ${infoTxtPath}`);
        const textContent = await response.text();
        const lines = textContent.split('\n');
        const projectTitle = lines[0]?.trim() || 'Projektdetails';
        let descriptionHtml = '';
        let imageFilenames = [];
        let readingImages = false;
        let descriptionStartIndex = 1;
        if (lines.length > 1 && lines[1]?.trim() === "") descriptionStartIndex = 2;

        let currentParagraph = [];
        for (let i = descriptionStartIndex; i < lines.length; i++) {
            const lineText = lines[i];
            if (lineText.trim() === '---Bilder---') {
                readingImages = true;
                if (currentParagraph.length > 0) descriptionHtml += `<p>${currentParagraph.join('<br>')}</p>\n`;
                currentParagraph = [];
                continue;
            }
            if (readingImages) {
                if (lineText.trim()) imageFilenames.push(lineText.trim());
            } else {
                 if (lineText.trim()) {
                    currentParagraph.push(lineText.replace(/</g, "<").replace(/>/g, ">"));
                 } else if (currentParagraph.length > 0) {
                     descriptionHtml += `<p>${currentParagraph.join('<br>')}</p>\n`;
                     currentParagraph = [];
                 }
            }
        }
        if (currentParagraph.length > 0) descriptionHtml += `<p>${currentParagraph.join('<br>')}</p>\n`;

        titleEl.textContent = projectTitle;
        document.title = `${projectTitle} - Hirsch Architekten`;
        descriptionEl.innerHTML = descriptionHtml || '<p>Keine Beschreibung verfügbar.</p>';
        galleryEl.innerHTML = '';
        if (imageFilenames.length > 0) {
            imageFilenames.forEach((filename, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'project-gallery-item';
                const imgElement = document.createElement('img');
                const imgSrc = `${projectFolderPath}${filename}`;
                imgElement.src = imgSrc;
                imgElement.alt = `Bild ${index + 1} für ${projectTitle}`;
                imgElement.loading = 'lazy';
                imgElement.onerror = () => { console.error(`Bild nicht ladbar: ${imgSrc}`); imgElement.alt = `Bild ${index + 1} konnte nicht geladen werden`;};
                imgContainer.appendChild(imgElement);
                galleryEl.appendChild(imgContainer);
            });
        } else {
            galleryEl.innerHTML = '<p>Keine Bilder verfügbar.</p>';
        }
        if (projectContentSection) projectContentSection.style.display = 'block';
        if (errorContainer) errorContainer.style.display = 'none';
    } catch (error) {
        console.error('[loadProjectDetails] Fehler:', error);
        if(projectContentSection) projectContentSection.style.display = 'none';
        if(errorContainer) errorContainer.style.display = 'block';
    }
}

// --- Funktion zum Laden der Teammitglieder (ANGEPASST mit Sortierung) ---
async function loadTeamMembers() {
    const teamGrid = document.querySelector('.about-details .team-member-grid');
    if (!teamGrid) return;

    const manifest = await fetchTeamManifest();
    if (!manifest || manifest.length === 0) {
        console.warn("[loadTeamMembers] Kein Team-Manifest oder leer.");
        teamGrid.innerHTML = "<p>Keine Teammitglieder zum Anzeigen vorhanden.</p>";
        return;
    }

    // *** NEU: Sortiere das Manifest nach der 'id' (Ordnername) ***
    manifest.sort((a, b) => {
        // localeCompare für korrekte Sortierung von Strings wie "01_name", "11_name"
        return a.id.localeCompare(b.id);
    });
    // ***************************************************************

    teamGrid.innerHTML = ''; // Leere das Grid
    // Gehe durch das jetzt SORTIERTE Manifest
    manifest.forEach(member => {
        if (!member || !member.id || !member.name) {
            console.warn("Ungültiger Team-Manifest Eintrag:", member);
            return;
        }
        const imageUrl = member.image ? `${TEAM_DATA_BASE_PATH}${member.image}` : 'https://via.placeholder.com/300x400?text=Foto';
        const memberCard = document.createElement('div');
        memberCard.className = 'team-member-card';

        memberCard.innerHTML = `
            <a href="member_detail.html?id=${encodeURIComponent(member.id)}" class="team-member-card-link">
                <div class="team-member-photo">
                    <img src="${imageUrl}" alt="Foto von ${member.name}" loading="lazy">
                </div>
                <div class="team-member-info">
                    <h4>${member.firstName || ''} <strong>${member.lastName || member.name}</strong></h4>
                    <p>${member.position || 'Position nicht angegeben'}</p>
                </div>
            </a>`;
        teamGrid.appendChild(memberCard);
    });
}

// --- loadMemberDetails Funktion (bestehend) ---
async function loadMemberDetails() {
    const memberContentSection = document.getElementById('member-content-section');
    if (!memberContentSection) return;
    const errorSection = document.getElementById('member-error-section');
    const memberNameEl = document.getElementById('member-name');
    const memberPositionEl = document.getElementById('member-position');
    const memberImageEl = document.getElementById('member-image');
    const memberEmailContainer = document.getElementById('member-email-container');
    const memberEmailLink = document.getElementById('member-email-link');
    const memberPhoneContainer = document.getElementById('member-phone-container');
    const memberPhoneLink = document.getElementById('member-phone-link');
    const memberDescriptionEl = document.getElementById('member-description');
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');

    if (!memberId) {
        memberContentSection.style.display = 'none';
        errorSection.style.display = 'block';
        return;
    }

    const memberFolderPath = `${TEAM_DATA_BASE_PATH}${memberId}/`;
    const infoTxtPath = `${memberFolderPath}info.txt`;

    try {
        const response = await fetch(infoTxtPath + `?v=${Date.now()}`);
        if (!response.ok) throw new Error(`info.txt für Mitglied nicht gefunden (${response.status}): ${infoTxtPath}`);
        const textContent = await response.text();
        const lines = textContent.split('\n');
        const name = lines[0]?.trim() || 'Unbekanntes Mitglied';
        const position = lines[1]?.trim() || 'Position nicht angegeben';
        const email = lines[2]?.trim();
        const phoneDisplay = lines[3]?.trim();
        const descriptionLines = lines.slice(4);

        document.title = `${name} - Team - Hirsch Architekten`;
        memberNameEl.textContent = name;
        memberPositionEl.textContent = position;

        if (email && email !== 'E-Mail hier eintragen') {
            memberEmailLink.href = `mailto:${email}`;
            memberEmailLink.textContent = email;
            memberEmailContainer.style.display = 'block';
        } else {
            memberEmailContainer.style.display = 'none';
        }

        if (phoneDisplay && phoneDisplay !== 'Telefonnummer hier eintragen') {
             // Erzeuge tel: Link aus der Anzeigeversion (z.B. "05121 93563-15")
            const telLinkNumber = phoneDisplay.replace(/[^0-9+]/g, ''); // Entferne alles außer Zahlen und +
            // Füge +49 hinzu, falls es fehlt (einfache Annahme für deutsche Nummern)
            const telLink = `tel:${telLinkNumber.startsWith('+') ? '' : '+49'}${telLinkNumber.startsWith('0') ? telLinkNumber.substring(1) : telLinkNumber}`;
            memberPhoneLink.href = telLink;
            memberPhoneLink.textContent = phoneDisplay;
            memberPhoneContainer.style.display = 'block';
        } else {
            memberPhoneContainer.style.display = 'none';
        }

        let descriptionHtml = "";
        let currentParagraph = [];
        for (const lineText of descriptionLines) {
            if (lineText.trim()) {
                currentParagraph.push(lineText.replace(/</g, "<").replace(/>/g, ">"));
            } else if (currentParagraph.length > 0) {
                descriptionHtml += `<p>${currentParagraph.join('<br>')}</p>\n`;
                currentParagraph = [];
            }
        }
        if (currentParagraph.length > 0) descriptionHtml += `<p>${currentParagraph.join('<br>')}</p>\n`;
        memberDescriptionEl.innerHTML = descriptionHtml || "<p>Keine weitere Beschreibung verfügbar.</p>";

        // Bild laden: Nutze Manifest für korrekten Pfad
        try {
            const teamManifest = await fetchTeamManifest();
            const memberManifestEntry = teamManifest.find(m => m.id === memberId);
             if (memberManifestEntry && memberManifestEntry.image) {
                memberImageEl.src = `${TEAM_DATA_BASE_PATH}${memberManifestEntry.image}?v=${Date.now()}`; // Cache-Busting fürs Bild
            } else {
                 memberImageEl.src = 'https://via.placeholder.com/250x320?text=Foto';
            }
        } catch (manifestError) {
             console.error("Fehler beim Laden des Team-Manifests für Bild:", manifestError);
             memberImageEl.src = 'https://via.placeholder.com/250x320?text=Foto';
        }
        memberImageEl.alt = `Foto von ${name}`;

        memberContentSection.style.display = 'block';
        errorSection.style.display = 'none';

    } catch (error) {
        console.error('[loadMemberDetails] Fehler:', error);
        memberContentSection.style.display = 'none';
        errorSection.style.display = 'block';
    }
}

// --- Restliche Funktionen (updateYear, handleScroll, etc. unverändert) ---
function updateYear() { const yearElement = document.getElementById('current-year'); const yearModalElement = document.getElementById('current-year-modal'); const current_year = new Date().getFullYear(); if (yearElement) { yearElement.textContent = current_year; } if (yearModalElement) { yearModalElement.textContent = current_year; } }
function handleScroll() { if (navbar) { if (window.scrollY > 50) { navbar.classList.add('scrolled'); } else { navbar.classList.remove('scrolled'); } } }
function toggleMobileMenu() { if (menuToggle && mobileMenu) { menuToggle.classList.toggle('active'); mobileMenu.classList.toggle('active'); } }
function setupMobileNavLinks() { if (mobileMenu && menuToggle) { const mobileLinks = mobileMenu.querySelectorAll('.nav-link'); mobileLinks.forEach(link => { link.addEventListener('click', () => { menuToggle.classList.remove('active'); mobileMenu.classList.remove('active'); }); }); } }
function setupImpressumModal() { if (impressumLink && impressumModal && modalClose) { impressumLink.addEventListener('click', (e) => { e.preventDefault(); impressumModal.classList.add('active'); document.body.style.overflow = 'hidden'; }); modalClose.addEventListener('click', () => { closeModal(); }); impressumModal.addEventListener('click', (e) => { if (e.target === impressumModal) { closeModal(); } }); } }
function closeModal() { if (impressumModal) { impressumModal.classList.remove('active'); document.body.style.overflow = ''; } }
function typeWriter(element, text, speed = 100, cursorHold = 3000, cursorFade = 1000, callback) { if (!element) return; const originalMinHeight = element.style.minHeight || getComputedStyle(element).minHeight; const initialHeight = element.clientHeight > 0 ? element.clientHeight + 'px' : getComputedStyle(element).minHeight; let i = 0; element.textContent = ''; element.setAttribute('data-cursor', ''); if (initialHeight === '0px' || initialHeight === 'auto') { if (element.tagName === 'H1') element.style.minHeight = '3.75rem'; else if (element.tagName === 'P') element.style.minHeight = '2.5rem'; } else { element.style.minHeight = initialHeight; } function typing() { if (i < text.length) { element.textContent += text.charAt(i); i++; requestAnimationFrame(() => setTimeout(typing, speed)); } else { setTimeout(() => { element.classList.add('cursor-fade-out'); setTimeout(() => { element.removeAttribute('data-cursor'); element.classList.remove('cursor-fade-out'); element.style.minHeight = originalMinHeight; if (callback) { callback(); } }, cursorFade); }, cursorHold); } } typing(); }

// --- DOMContentLoaded Event Listener (unverändert) ---
document.addEventListener('DOMContentLoaded', () => {
  setupMobileNavLinks();
  if (menuToggle) { menuToggle.addEventListener('click', toggleMobileMenu); }
  setupImpressumModal();
  updateYear();
  handleScroll();
  window.addEventListener('scroll', handleScroll);

  loadProjects();
  loadProjectDetails();
  loadTeamMembers(); // Wird jetzt nach Ordnernamen sortieren
  loadMemberDetails();

  const isIndexPageForTyping = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/Hirsch-Architekten-Website-main/');
  if ((typingElement || typingSecondElement) && isIndexPageForTyping) {
    setTimeout(() => {
      if (typingElement) {
        typingElement.textContent = 'Architektur für Menschen.';
        typeWriter(typingElement, 'Architektur für Menschen.', 40, 1000, 500, () => {
          if (typingSecondElement) {
            setTimeout(() => {
              typingSecondElement.textContent = 'Wir gestalten individuelle und nachhaltige Raumerlebnisse.';
              typeWriter(typingSecondElement, 'Wir gestalten individuelle und nachhaltige Raumerlebnisse.', 30, 3000, 1000);
            }, 500);
          }
        });
      } else if (typingSecondElement) {
        typingSecondElement.textContent = 'Wir gestalten individuelle und nachhaltige Raumerlebnisse.';
        typeWriter(typingSecondElement, 'Wir gestalten individuelle und nachhaltige Raumerlebnisse.', 30, 3000, 1000);
      }
    }, 500);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && impressumModal && impressumModal.classList.contains('active')) {
    closeModal();
  }
});
// --- END OF FILE scripts.js ---