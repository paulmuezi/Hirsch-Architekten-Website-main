// --- START OF FILE scripts.js ---

// DOM Elements
const navbar = document.querySelector('.navbar');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const impressumLink = document.querySelector('.impressum-link');
const datenschutzLink = document.querySelector('.datenschutz-link');
const impressumModal = document.getElementById('impressum');
const modalClose = document.querySelector('.modal-close');
const typingElement = document.querySelector('.hero h1.typing');
const typingSecondElement = document.querySelector('.hero p.typing-second');

// === Projektdaten & Manifest Pfad ===
// WICHTIG: Dieser Pfad ist relativ zum Root der Website (z.B. index.html).
// Vite wird 'public/projekt_daten' in das Root des 'dist' Ordners kopieren.
const PROJECT_DATA_BASE_PATH = 'projekt_daten/'; // Geändert zu relativem Pfad
const MANIFEST_FILE = PROJECT_DATA_BASE_PATH + 'projekte_manifest.json';

// Funktion zum Laden des Projektmanifests
async function fetchProjectManifest() {
    // Der Browser wird diesen relativen Pfad korrekt auflösen,
    // basierend auf der aktuellen URL der HTML-Seite.
    const manifestUrl = MANIFEST_FILE + `?v=${Date.now()}`;
    console.log(`[fetchProjectManifest] Lade Manifest: ${manifestUrl}`);
    try {
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error(`Manifest nicht gefunden (${response.status}): ${manifestUrl}`);
        const manifest = await response.json();
        if (!Array.isArray(manifest)) throw new Error("Manifest ist kein Array.");
        console.log("[fetchProjectManifest] Manifest geladen:", manifest);
        return manifest;
    } catch (error) {
        console.error('[fetchProjectManifest] Fehler:', error);
        return [];
    }
}

// === loadProjects Funktion (lädt Manifest für Listen) ===
async function loadProjects() {
  const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/Hirsch-Architekten-Website-main/') ;
  const isProjectsPage = window.location.pathname.includes('projects.html');
  let gridSelector = null;
  let projectsToDisplay = [];
  const manifest = await fetchProjectManifest();

  if (!manifest || manifest.length === 0) {
      console.warn("[loadProjects] Kein Manifest oder leer.");
      // Versuche, das Grid auf beiden Seiten zu finden, falls es existiert
      let projectGrid = document.querySelector('#projects .projects-grid'); // Für Index-Seite
      if (!projectGrid) {
          projectGrid = document.querySelector('.all-projects-grid'); // Für Projekt-Seite
      }
      if (projectGrid) projectGrid.innerHTML = "<p>Keine Projekte zum Anzeigen vorhanden.</p>";
      return;
  }

  if (isIndexPage) {
    gridSelector = '#projects .projects-grid';
    projectsToDisplay = manifest.slice(0, 4);
  } else if (isProjectsPage) {
    gridSelector = '.all-projects-grid'; // Dieser Selektor muss in projects.html existieren
    projectsToDisplay = manifest;
  } else {
    return; // Nicht die richtige Seite
  }

  const projectsGrid = document.querySelector(gridSelector);

  if (projectsGrid && projectsToDisplay.length > 0) {
    projectsGrid.innerHTML = ''; // Leere das Grid, bevor neue Karten hinzugefügt werden
    projectsToDisplay.forEach((project, index) => {
      if (!project || !project.id || !project.title) { console.warn(`Ungültiger Manifest-Eintrag ${index}`, project); return; }
      
      // Thumbnail-Pfad: PROJECT_DATA_BASE_PATH ist bereits relativ. project.thumbnail ist relativ zu PROJECT_DATA_BASE_PATH.
      const thumbnailUrl = project.thumbnail ? `${PROJECT_DATA_BASE_PATH}${project.thumbnail}` : 'https://via.placeholder.com/300x400?text=Bild';
      const categoryHtml = project.category ? `<span class="project-category">${project.category}</span>` : '';
      const projectCard = document.createElement('div');
      projectCard.className = 'project-card';
      
      // Link zur Detailseite: project_detail.html ist im selben Verzeichnis wie index.html/projects.html
      // Der Browser löst 'project_detail.html' relativ zur aktuellen Seite auf.
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

// === loadProjectDetails Funktion (liest info.txt) ===
async function loadProjectDetails() {
    const container = document.getElementById('project-content');
    if (!container) return; // Nur auf Detailseite

    const errorContainer = document.getElementById('project-error');
    const titleEl = document.getElementById('project-title');
    const descriptionEl = document.getElementById('project-description');
    const galleryEl = document.getElementById('project-gallery');

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        console.error('Keine Projekt-ID in URL.');
        if (container) container.style.display = 'none';
        if (errorContainer) errorContainer.style.display = 'block';
        return;
    }

    // projectFolderPath ist relativ zum Root der Website, z.B. 'projekt_daten/001_meinprojekt/'
    const projectFolderPath = `${PROJECT_DATA_BASE_PATH}${projectId}/`;
    const infoTxtPath = `${projectFolderPath}info.txt`;

    try {
        console.log(`[loadProjectDetails] Lade Info: ${infoTxtPath}`);
        // fetch wird 'projekt_daten/PROJEKT_ID/info.txt' relativ zur aktuellen HTML-Seite auflösen
        const response = await fetch(infoTxtPath + `?v=${Date.now()}`);
        if (!response.ok) throw new Error(`info.txt nicht gefunden (${response.status}): ${infoTxtPath}`);
        const textContent = await response.text();

        const lines = textContent.split('\n');
        const projectTitle = lines[0]?.trim() || 'Projektdetails';
        let descriptionHtml = '';
        let imageFilenames = [];
        let readingImages = false;
        let descriptionStartIndex = 1; 
        if(lines.length > 1 && lines[1].trim() === "") descriptionStartIndex = 2; 

        let currentParagraph = [];
        for (let i = descriptionStartIndex; i < lines.length; i++) {
            const line = lines[i].trimEnd(); // Behalte Leerzeichen am Anfang für evtl. Einrückungen, entferne sie am Ende
            if (line === '---Bilder---') {
                readingImages = true;
                if (currentParagraph.length > 0) {
                    descriptionHtml += `<p>${currentParagraph.join('<br>')}</p>\n`;
                }
                currentParagraph = []; 
                continue; 
            }

            if (readingImages) {
                if (line.trim()) imageFilenames.push(line.trim()); 
            } else {
                 if (line.trim()) { // Nur nicht-leere Zeilen zum Absatz hinzufügen
                    currentParagraph.push(line.replace(/</g, "<").replace(/>/g, ">"));
                 } else { // Leerzeile im info.txt bedeutet neuer <p>
                     if (currentParagraph.length > 0) {
                         descriptionHtml += `<p>${currentParagraph.join('<br>')}</p>\n`;
                     }
                     currentParagraph = []; 
                 }
            }
        }
        if (currentParagraph.length > 0) { // Letzten Absatz hinzufügen
             descriptionHtml += `<p>${currentParagraph.join('<br>')}</p>\n`;
        }

        console.log("[loadProjectDetails] Titel:", projectTitle);
        console.log("[loadProjectDetails] Beschreibung HTML:", descriptionHtml);
        console.log("[loadProjectDetails] Bilddateinamen:", imageFilenames);

        titleEl.textContent = projectTitle;
        document.title = `${projectTitle} - Hirsch Architekten`;
        descriptionEl.innerHTML = descriptionHtml || '<p>Keine Beschreibung verfügbar.</p>';

        galleryEl.innerHTML = '';
        if (imageFilenames.length > 0) {
            imageFilenames.forEach((filename, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'project-gallery-item';
                const imgElement = document.createElement('img');
                // imgSrc ist relativ zum Root, z.B. 'projekt_daten/001_meinprojekt/bild.jpg'
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

        if (container) container.style.display = 'block';
        if (errorContainer) errorContainer.style.display = 'none';

    } catch (error) {
        console.error('[loadProjectDetails] Fehler:', error);
        if(container) container.style.display = 'none';
        if(errorContainer) errorContainer.style.display = 'block';
    }
}


// --- Restliche Funktionen (unverändert) ---
function updateYear() { const yearElement = document.getElementById('current-year'); const yearModalElement = document.getElementById('current-year-modal'); const current_year = new Date().getFullYear(); if (yearElement) { yearElement.textContent = current_year; } if (yearModalElement) { yearModalElement.textContent = current_year; } }
function handleScroll() { if (navbar) { if (window.scrollY > 50) { navbar.classList.add('scrolled'); } else { navbar.classList.remove('scrolled'); } } }
function toggleMobileMenu() { if (menuToggle && mobileMenu) { menuToggle.classList.toggle('active'); mobileMenu.classList.toggle('active'); } }
function setupMobileNavLinks() { if (mobileMenu && menuToggle) { const mobileLinks = mobileMenu.querySelectorAll('.nav-link'); mobileLinks.forEach(link => { link.addEventListener('click', () => { menuToggle.classList.remove('active'); mobileMenu.classList.remove('active'); }); }); } }
function setupImpressumModal() { if (impressumLink && impressumModal && modalClose) { impressumLink.addEventListener('click', (e) => { e.preventDefault(); impressumModal.classList.add('active'); document.body.style.overflow = 'hidden'; }); modalClose.addEventListener('click', () => { closeModal(); }); impressumModal.addEventListener('click', (e) => { if (e.target === impressumModal) { closeModal(); } }); } }
function closeModal() { if (impressumModal) { impressumModal.classList.remove('active'); document.body.style.overflow = ''; } }
function typeWriter(element, text, speed = 100, cursorHold = 3000, cursorFade = 1000, callback) { if (!element) return; const originalMinHeight = element.style.minHeight || getComputedStyle(element).minHeight; const initialHeight = element.clientHeight > 0 ? element.clientHeight + 'px' : getComputedStyle(element).minHeight; let i = 0; element.textContent = ''; element.setAttribute('data-cursor', ''); if (initialHeight === '0px' || initialHeight === 'auto') { if (element.tagName === 'H1') element.style.minHeight = '3.75rem'; else if (element.tagName === 'P') element.style.minHeight = '2.5rem'; } else { element.style.minHeight = initialHeight; } function typing() { if (i < text.length) { element.textContent += text.charAt(i); i++; requestAnimationFrame(() => setTimeout(typing, speed)); } else { setTimeout(() => { element.classList.add('cursor-fade-out'); setTimeout(() => { element.removeAttribute('data-cursor'); element.classList.remove('cursor-fade-out'); element.style.minHeight = originalMinHeight; if (callback) { callback(); } }, cursorFade); }, cursorHold); } } typing(); }

// Initial setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setupMobileNavLinks();
  if (menuToggle) { menuToggle.addEventListener('click', toggleMobileMenu); }
  setupImpressumModal();
  updateYear();
  handleScroll(); // Initialer Check für Navbar-Scroll-Effekt
  window.addEventListener('scroll', handleScroll); // Event Listener für Scroll

  // Lade Projekte für Index- und Projektübersichtsseite
  // loadProjects wird die Projekte dynamisch laden, falls generate_html.py nicht gelaufen ist
  // oder falls das Grid auf der Seite ist und leer ist.
  loadProjects();
  
  // Lade Projektdetails, wenn wir auf einer Detailseite sind
  loadProjectDetails();

  // Typing animation (nur auf Index-Seite)
  const isIndexPageForTyping = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/Hirsch-Architekten-Website-main/');
  if ((typingElement || typingSecondElement) && isIndexPageForTyping) {
    setTimeout(() => {
      if (typingElement) {
        typingElement.textContent = 'Architektur für Menschen.'; // Initialwert setzen für Höhenberechnung
        typeWriter(typingElement, 'Architektur für Menschen.', 40, 1000, 500, () => {
          if (typingSecondElement) {
            setTimeout(() => {
              typingSecondElement.textContent = 'Wir gestalten individuelle und nachhaltige Raumerlebnisse.'; // Initialwert
              typeWriter(typingSecondElement, 'Wir gestalten individuelle und nachhaltige Raumerlebnisse.', 30, 3000, 1000);
            }, 500); // Kurze Pause bevor der zweite Text startet
          }
        });
      } else if (typingSecondElement) { // Falls nur das zweite Element existiert
        typingSecondElement.textContent = 'Wir gestalten individuelle und nachhaltige Raumerlebnisse.'; // Initialwert
        typeWriter(typingSecondElement, 'Wir gestalten individuelle und nachhaltige Raumerlebnisse.', 30, 3000, 1000);
      }
    }, 500); // Startverzögerung für Animation
  }
});

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && impressumModal && impressumModal.classList.contains('active')) {
    closeModal();
  }
});

// --- END OF FILE scripts.js ---