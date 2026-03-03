// ================================
// Configuration
// ================================

const GITHUB_USERNAME = "dellimone";
const EXCLUDED_REPOS = ["dellimone"];
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=30&sort=pushed`;

const CACHE_KEY = "gh_repos_cache";
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const LANGUAGE_COLORS = {
  Python: "#3572A5",
  Java: "#B07219",
  C: "#555555",
  Shell: "#89E051",
  HTML: "#E34C26",
  "Jupyter Notebook": "#DA5B0B",
  JavaScript: "#F1E05A",
  CSS: "#563D7C",
  TypeScript: "#3178C6",
  Go: "#00ADD8",
  Rust: "#DEA584",
};

const FALLBACK_DESCRIPTIONS = {
  "Cloud-Performance-Benchmarks":
    "Benchmarked CPU, memory, disk I/O, and network across VMs (VirtualBox, KVM), Docker, and Kubernetes. Deployed Prometheus/Grafana monitoring for K8s workloads.",
  HeatDiffusionHPC:
    "Hybrid MPI+OpenMP heat diffusion simulation with AVX2 vectorization. Tested on Leonardo and Orfeo HPC systems.",
  "Missing-Data-Mechanisms-and-Imputation-Study":
    "Statistical study on missing data mechanisms and imputation methods",
  OpenModelsHub: "A platform for open-source machine learning models",
  SuperResolutionFlow:
    "Implemented and compared two flow-based architectures (Normalizing Flow and Flow Matching with U-Net) for 2x/4x image super-resolution.",
  TimeserieDiffusion:
    "DDPM-based generative model with U-Net architecture for synthetic time series generation. Trained on pollution sensor data.",
};

// Tech stacks per project (from CV)
const PROJECT_TECH = {
  SuperResolutionFlow: ["Python", "PyTorch"],
  TimeserieDiffusion: ["Python", "PyTorch"],
  HeatDiffusionHPC: ["C", "MPI", "OpenMP", "Slurm"],
  "Cloud-Performance-Benchmarks": [
    "Docker",
    "Kubernetes",
    "Vagrant",
    "Ansible",
    "Prometheus",
  ],
  "CNN-Scene-classifier-CVPR": ["Python", "PyTorch"],
  RAG: ["Python", "LangChain"],
  Quoridor: ["Java"],
  "Missing-Data-Mechanisms-and-Imputation-Study": ["R", "Statistics"],
  OpenModelsHub: ["HTML", "JavaScript"],
};

// Category mapping for filtering
const PROJECT_CATEGORIES = {
  SuperResolutionFlow: "ml",
  TimeserieDiffusion: "ml",
  "CNN-Scene-classifier-CVPR": "ml",
  RAG: "ml",
  HeatDiffusionHPC: "hpc",
  "Cloud-Performance-Benchmarks": "devops",
  Quoridor: "software",
  "Missing-Data-Mechanisms-and-Imputation-Study": "data",
  OpenModelsHub: "software",
};

// ================================
// localStorage Cache
// ================================

function getCachedRepos() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedRepos(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // localStorage full or unavailable — ignore
  }
}

// ================================
// GitHub API Fetch & Render
// ================================

async function fetchAndRenderProjects() {
  const grid = document.getElementById("projects-grid");

  try {
    let repos = getCachedRepos();

    if (!repos) {
      const response = await fetch(GITHUB_API_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      repos = await response.json();
      setCachedRepos(repos);
    }

    const filteredRepos = repos
      .filter((repo) => !EXCLUDED_REPOS.includes(repo.name) && !repo.fork)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

    grid.innerHTML = "";
    grid.classList.add("fade-in-stagger");

    // Build filter bar
    buildFilterBar(filteredRepos);

    filteredRepos.forEach((repo, i) => {
      const card = createProjectCard(repo);
      grid.appendChild(card);
      // Stagger animation
      setTimeout(() => card.classList.add("visible"), 80 * i);
    });
  } catch (error) {
    console.error("Failed to fetch repos:", error);
    grid.innerHTML = `
      <p class="projects-error">
        Unable to load projects. Please visit
        <a href="https://github.com/${GITHUB_USERNAME}" target="_blank" rel="noopener">my GitHub profile</a>
        directly.
      </p>`;
  }
}

function buildFilterBar(repos) {
  const section = document.getElementById("projects");
  const grid = document.getElementById("projects-grid");
  const existing = section.querySelector(".filter-bar");
  if (existing) existing.remove();

  const categories = new Map();
  categories.set("all", "All");
  repos.forEach((repo) => {
    const cat = PROJECT_CATEGORIES[repo.name];
    if (cat && !categories.has(cat)) {
      const labels = {
        ml: "ML / AI",
        hpc: "HPC",
        devops: "DevOps",
        data: "Data Science",
        software: "Software",
      };
      categories.set(cat, labels[cat] || cat);
    }
  });

  // Only show filter bar if there are multiple categories
  if (categories.size <= 2) return;

  const bar = document.createElement("div");
  bar.className = "filter-bar";

  categories.forEach((label, key) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (key === "all" ? " active" : "");
    btn.textContent = label;
    btn.dataset.filter = key;
    btn.addEventListener("click", () => handleFilter(key, bar));
    bar.appendChild(btn);
  });

  grid.parentNode.insertBefore(bar, grid);
}

function handleFilter(category, bar) {
  // Update active button
  bar.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === category);
  });

  // Filter cards
  const cards = document.querySelectorAll(".project-card");
  cards.forEach((card) => {
    const repoName = card.dataset.repo;
    const cardCat = PROJECT_CATEGORIES[repoName] || "other";
    const show = category === "all" || cardCat === category;
    card.classList.toggle("hidden", !show);
  });
}

function createProjectCard(repo) {
  const card = document.createElement("article");
  card.className = "project-card";
  card.dataset.repo = repo.name;

  const description =
    repo.description ||
    FALLBACK_DESCRIPTIONS[repo.name] ||
    "No description available.";
  const language = repo.language || "Unknown";
  const languageColor = LANGUAGE_COLORS[language] || "#858585";

  const topicsHTML =
    repo.topics && repo.topics.length > 0
      ? `<div class="project-card__topics">
           ${repo.topics.map((t) => `<span class="topic-tag">${escapeHTML(t)}</span>`).join("")}
         </div>`
      : "";

  // Tech badges from our mapping
  const tech = PROJECT_TECH[repo.name] || [];
  const techHTML =
    tech.length > 0
      ? `<div class="project-card__tech">
           ${tech.map((t) => `<span class="tech-badge">${escapeHTML(t)}</span>`).join("")}
         </div>`
      : "";

  card.innerHTML = `
    <div class="project-card__header">
      <h3 class="project-card__name">
        <a href="${repo.html_url}" target="_blank" rel="noopener">${escapeHTML(formatRepoName(repo.name))}</a>
      </h3>
    </div>
    <p class="project-card__description">${escapeHTML(description)}</p>
    ${techHTML}
    ${topicsHTML}
    <div class="project-card__footer">
      <span class="language-badge">
        <span class="language-dot" style="background-color: ${languageColor}"></span>
        <span class="language-name">${escapeHTML(language)}</span>
      </span>
      <a href="${repo.html_url}" class="project-card__link" target="_blank" rel="noopener">
        View on GitHub &rarr;
      </a>
    </div>
  `;

  return card;
}

function formatRepoName(name) {
  return name.replace(/-/g, " ");
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ================================
// Scroll Animations
// ================================

function initScrollAnimations() {
  const elements = document.querySelectorAll(".fade-in");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  elements.forEach((el) => observer.observe(el));
}

// ================================
// Navigation
// ================================

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        const navHeight = document.getElementById("navbar").offsetHeight;
        const top = target.offsetTop - navHeight;
        window.scrollTo({ top, behavior: "smooth" });
      }
      // Close mobile menu if open
      document.querySelector(".nav-links").classList.remove("active");
      document.querySelector(".nav-toggle").classList.remove("active");
    });
  });
}

function initScrollSpy() {
  const sections = document.querySelectorAll("section[id], header[id]");
  const navLinks = document.querySelectorAll(".nav-link");
  const navHeight = document.getElementById("navbar").offsetHeight;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === `#${id}`
            );
          });
        }
      });
    },
    {
      rootMargin: `-${navHeight + 1}px 0px -60% 0px`,
      threshold: 0,
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");

  toggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
    toggle.classList.toggle("active");
  });
}

// ================================
// Initialization
// ================================

document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderProjects();
  initSmoothScroll();
  initScrollSpy();
  initMobileNav();
  initScrollAnimations();
});
