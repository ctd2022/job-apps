#!/usr/bin/env python3
"""
Entity Taxonomy Module
Extensible dictionaries for entity extraction in CV/JD parsing.
Used by document_parser.py for rule-based NLP.
"""

# =============================================================================
# HARD SKILLS (Technical skills, tools, technologies)
# =============================================================================
HARD_SKILLS = {
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go",
    "golang", "rust", "scala", "kotlin", "swift", "php", "perl", "r",
    "matlab", "julia", "haskell", "clojure", "erlang", "elixir", "lua",
    "objective-c", "dart", "groovy", "f#", "cobol", "fortran", "assembly",
    "bash", "shell", "powershell", "sql", "plsql", "tsql",

    # Web Technologies
    "html", "html5", "css", "css3", "sass", "scss", "less", "tailwind",
    "bootstrap", "react", "reactjs", "angular", "angularjs", "vue", "vuejs",
    "svelte", "nextjs", "nuxtjs", "gatsby", "remix", "astro", "jquery",
    "webpack", "vite", "rollup", "parcel", "babel", "eslint", "prettier",
    "nodejs", "expressjs", "express", "fastify", "nestjs", "deno", "bun",

    # Backend Frameworks
    "django", "flask", "fastapi", "spring", "spring boot", "hibernate",
    "rails", "ruby on rails", "laravel", "symfony", "aspnet", "asp.net",
    ".net", "dotnet", ".net core", "entity framework", "gin", "echo",
    "fiber", "actix", "rocket",

    # Databases
    "mysql", "postgresql", "postgres", "oracle", "sql server", "sqlite",
    "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "couchdb",
    "neo4j", "graphql", "mariadb", "cockroachdb", "timescaledb", "influxdb",
    "firestore", "firebase", "supabase", "prisma", "sequelize", "typeorm",

    # Cloud & DevOps
    "aws", "amazon web services", "azure", "gcp", "google cloud",
    "docker", "kubernetes", "k8s", "terraform", "ansible", "puppet", "chef",
    "jenkins", "gitlab ci", "github actions", "circleci", "travis ci",
    "argocd", "helm", "prometheus", "grafana", "datadog", "splunk",
    "cloudformation", "pulumi", "vagrant", "openshift", "rancher",
    "ec2", "s3", "lambda", "ecs", "eks", "fargate", "rds", "cloudfront",
    "route53", "vpc", "iam", "sns", "sqs", "kinesis", "redshift",
    "api gateway", "cloudwatch", "step functions",

    # Data Science & ML
    "machine learning", "deep learning", "neural networks", "tensorflow",
    "pytorch", "keras", "scikit-learn", "sklearn", "pandas", "numpy",
    "scipy", "matplotlib", "seaborn", "plotly", "jupyter", "notebooks",
    "nlp", "natural language processing", "computer vision", "opencv",
    "transformers", "hugging face", "bert", "gpt", "llm", "llms",
    "large language models", "rag", "langchain", "vector databases",
    "pinecone", "weaviate", "milvus", "qdrant", "embedding", "embeddings",
    "feature engineering", "model training", "mlops", "mlflow", "kubeflow",
    "sagemaker", "vertex ai", "databricks", "spark", "pyspark", "hadoop",
    "airflow", "luigi", "dagster", "dbt", "etl", "data pipeline",
    "data engineering", "data warehouse", "data lake", "snowflake",
    "bigquery", "athena", "glue", "kafka", "flink", "beam",

    # Testing
    "unit testing", "integration testing", "e2e testing", "jest", "mocha",
    "cypress", "playwright", "selenium", "puppeteer", "pytest", "unittest",
    "junit", "testng", "rspec", "cucumber", "postman", "insomnia",
    "load testing", "performance testing", "jmeter", "gatling", "locust",
    "tdd", "bdd", "test automation",

    # Security
    "cybersecurity", "penetration testing", "owasp", "encryption",
    "authentication", "authorization", "oauth", "oauth2", "jwt",
    "saml", "sso", "ldap", "active directory", "keycloak", "okta",
    "ssl", "tls", "https", "certificates", "firewall", "waf", "vpn",
    "siem", "soc", "devsecops", "vulnerability assessment",

    # Mobile Development
    "ios", "android", "react native", "flutter", "xamarin", "ionic",
    "cordova", "swiftui", "jetpack compose", "kotlin multiplatform",

    # APIs & Protocols
    "rest", "restful", "rest api", "graphql", "grpc", "soap", "websocket",
    "websockets", "http", "tcp", "udp", "mqtt", "amqp", "json", "xml",
    "yaml", "protobuf", "openapi", "swagger", "api design",

    # Version Control
    "git", "github", "gitlab", "bitbucket", "svn", "mercurial",
    "version control", "branching", "merging", "code review",

    # IDEs & Tools
    "vscode", "visual studio code", "intellij", "pycharm", "eclipse",
    "vim", "neovim", "emacs", "xcode", "android studio", "sublime",

    # Methodologies & Practices
    "ci/cd", "cicd", "continuous integration", "continuous deployment",
    "continuous delivery", "devops", "gitops", "infrastructure as code",
    "microservices", "monolith", "serverless", "event-driven",
    "domain-driven design", "ddd", "cqrs", "event sourcing",
    "api-first", "design patterns", "solid", "clean architecture",

    # Business Intelligence
    "tableau", "power bi", "looker", "metabase", "qlik", "sap",
    "business intelligence", "data visualization", "reporting",
    "dashboards", "kpi", "analytics",

    # Design
    "figma", "sketch", "adobe xd", "photoshop", "illustrator",
    "ui design", "ux design", "ui/ux", "wireframing", "prototyping",
    "design systems", "accessibility", "wcag", "responsive design",

    # Other Technical
    "linux", "unix", "windows server", "macos", "ubuntu", "centos",
    "debian", "networking", "load balancing", "nginx", "apache",
    "caching", "cdn", "dns", "system administration", "sysadmin",
    "virtualization", "vmware", "hyper-v", "embedded systems",
    "iot", "blockchain", "smart contracts", "solidity", "web3",
    "ar", "vr", "unity", "unreal engine", "game development",
}

# =============================================================================
# SOFT SKILLS (Interpersonal and professional skills)
# =============================================================================
SOFT_SKILLS = {
    # Communication
    "communication", "written communication", "verbal communication",
    "presentation", "public speaking", "storytelling", "documentation",
    "technical writing", "active listening", "negotiation", "persuasion",

    # Leadership
    "leadership", "team leadership", "people management", "mentoring",
    "coaching", "delegation", "decision making", "strategic thinking",
    "vision", "influence", "motivation", "empowerment", "accountability",

    # Teamwork
    "teamwork", "collaboration", "cross-functional", "interpersonal",
    "relationship building", "conflict resolution", "consensus building",
    "stakeholder management", "partnership",

    # Problem Solving
    "problem solving", "critical thinking", "analytical thinking",
    "troubleshooting", "root cause analysis", "debugging", "creativity",
    "innovation", "lateral thinking", "logical reasoning",

    # Organization
    "organization", "planning", "prioritization", "time management",
    "multitasking", "attention to detail", "deadline management",
    "resource management", "scheduling", "goal setting",

    # Adaptability
    "adaptability", "flexibility", "resilience", "agility",
    "learning agility", "growth mindset", "change management",
    "stress management", "composure",

    # Initiative
    "initiative", "self-motivation", "proactive", "self-starter",
    "entrepreneurial", "ownership", "drive", "ambition", "autonomy",

    # Customer Focus
    "customer service", "customer focus", "client relations",
    "customer success", "user empathy", "service orientation",

    # Other
    "professionalism", "integrity", "ethics", "reliability",
    "dependability", "emotional intelligence", "cultural awareness",
    "diversity", "inclusion", "empathy", "patience",
}

# =============================================================================
# CERTIFICATIONS (Professional certifications)
# =============================================================================
CERTIFICATIONS = {
    # Cloud Certifications
    "aws certified", "aws solutions architect", "aws developer",
    "aws sysops", "aws devops", "aws machine learning",
    "aws data analytics", "aws security specialty",
    "azure certified", "azure administrator", "azure developer",
    "azure solutions architect", "azure devops", "azure data engineer",
    "gcp certified", "google cloud certified", "professional cloud architect",
    "professional data engineer", "professional machine learning",

    # Development Certifications
    "oracle certified", "java certified", "oracle java programmer",
    "microsoft certified", "mcsa", "mcse", "mcsd",
    "salesforce certified", "salesforce administrator", "salesforce developer",
    "red hat certified", "rhcsa", "rhce",

    # Project Management
    "pmp", "project management professional", "prince2", "capm",
    "certified scrum master", "csm", "psm", "safe", "safe agilist",
    "pmi-acp", "six sigma", "lean six sigma", "green belt", "black belt",

    # Security Certifications
    "cissp", "cism", "cisa", "ceh", "certified ethical hacker",
    "comptia security+", "comptia network+", "comptia a+",
    "oscp", "ccna", "ccnp", "ccie",

    # Data & Analytics
    "certified data professional", "cdp", "cloudera certified",
    "databricks certified", "snowflake certified",
    "tableau certified", "power bi certified",
    "google analytics certified", "google ads certified",

    # Agile & DevOps
    "kubernetes certified", "cka", "ckad", "cks",
    "docker certified", "dca", "terraform certified",
    "jenkins certified", "gitops certified",

    # Other
    "itil", "togaf", "cobit", "iso 27001", "soc 2",
    "gdpr certified", "hipaa certified",
}

# =============================================================================
# METHODOLOGIES (Development and business methodologies)
# =============================================================================
METHODOLOGIES = {
    # Agile
    "agile", "scrum", "kanban", "lean", "xp", "extreme programming",
    "safe", "scaled agile", "less", "nexus", "spotify model",
    "sprint", "standup", "retrospective", "backlog", "user stories",
    "story points", "velocity", "burndown",

    # Project Management
    "waterfall", "prince2", "pmbok", "six sigma", "lean six sigma",
    "kaizen", "pdca", "plan-do-check-act",

    # Development
    "tdd", "test-driven development", "bdd", "behavior-driven development",
    "ddd", "domain-driven design", "clean code", "solid principles",
    "pair programming", "mob programming", "code review",
    "trunk-based development", "gitflow", "feature flags",

    # DevOps
    "devops", "devsecops", "sre", "site reliability engineering",
    "ci/cd", "continuous integration", "continuous deployment",
    "continuous delivery", "infrastructure as code", "gitops",

    # Architecture
    "microservices", "monolithic", "serverless", "event-driven",
    "cqrs", "event sourcing", "saga pattern", "api-first",
    "service mesh", "hexagonal architecture", "clean architecture",

    # Data
    "etl", "elt", "data mesh", "data lake", "data warehouse",
    "lambda architecture", "kappa architecture",

    # Design
    "design thinking", "user-centered design", "human-centered design",
    "design sprint", "rapid prototyping",
}

# =============================================================================
# DOMAINS (Industry domains and business areas)
# =============================================================================
DOMAINS = {
    # Finance
    "fintech", "banking", "financial services", "investment banking",
    "asset management", "wealth management", "insurance", "insurtech",
    "payments", "trading", "capital markets", "risk management",
    "compliance", "regulatory", "aml", "kyc", "fraud detection",

    # Healthcare
    "healthcare", "healthtech", "medical", "pharmaceutical", "pharma",
    "biotech", "life sciences", "clinical", "telehealth", "telemedicine",
    "electronic health records", "ehr", "emr", "hipaa", "fda",

    # E-commerce & Retail
    "e-commerce", "ecommerce", "retail", "marketplace", "supply chain",
    "logistics", "inventory", "point of sale", "pos", "omnichannel",

    # Technology
    "saas", "paas", "iaas", "cloud computing", "enterprise software",
    "b2b", "b2c", "startup", "scale-up", "big tech", "faang",

    # Media & Entertainment
    "media", "entertainment", "streaming", "gaming", "social media",
    "advertising", "adtech", "martech", "content management",

    # Education
    "edtech", "education", "e-learning", "lms", "learning management",
    "online learning", "mooc", "educational technology",

    # Government & Public Sector
    "government", "public sector", "defense", "aerospace",
    "civic tech", "govtech",

    # Other Industries
    "automotive", "manufacturing", "energy", "utilities", "oil and gas",
    "renewable energy", "cleantech", "real estate", "proptech",
    "travel", "hospitality", "food tech", "agriculture", "agtech",
    "telecommunications", "telecom", "legal tech", "hr tech",
    "non-profit", "ngo", "consulting",
}

# =============================================================================
# JOB TITLE PATTERNS (Regex patterns for detecting job titles)
# =============================================================================
JOB_TITLE_PATTERNS = [
    # Engineering titles
    r"\b(senior|junior|lead|principal|staff|distinguished)?\s*(software|backend|frontend|full[- ]?stack|devops|data|ml|machine learning|platform|infrastructure|site reliability|sre|qa|test|mobile|ios|android|embedded|systems?|security|cloud|solutions?)\s*(engineer|developer|architect|specialist)\b",

    # Manager titles
    r"\b(engineering|product|project|program|technical|delivery|development|it|software)\s*manager\b",
    r"\b(senior|junior|associate)?\s*(product|project|program|technical)\s*(manager|lead|director)\b",

    # Director/VP/C-level
    r"\b(director|head|vp|vice president|chief)\s*(of\s+)?(engineering|technology|product|data|analytics|information|digital|operations)\b",
    r"\b(cto|cio|cpo|cdo|ciso)\b",

    # Data roles
    r"\b(data|business|product|marketing|financial)?\s*(analyst|scientist|engineer|architect)\b",

    # Designer roles
    r"\b(senior|junior|lead)?\s*(ui|ux|ui/ux|product|visual|graphic|interaction)\s*designer\b",

    # Consultant/Specialist
    r"\b(technical|it|management|business|strategy)?\s*(consultant|specialist|advisor)\b",

    # Generic seniority + role
    r"\b(intern|trainee|associate|junior|mid[- ]?level|senior|lead|principal|staff|distinguished)\s+\w+\b",
]

# =============================================================================
# YEARS OF EXPERIENCE PATTERNS (Regex patterns for extracting experience)
# =============================================================================
YEARS_EXPERIENCE_PATTERNS = [
    # "5+ years of experience"
    r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)\b",

    # "minimum 5 years"
    r"(?:minimum|min|at least)\s*(\d+)\s*(?:years?|yrs?)",

    # "5-7 years"
    r"(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)",

    # "5 years experience required"
    r"(\d+)\s*(?:years?|yrs?)\s*(?:experience|exp)?\s*(?:required|needed|necessary)",

    # "over 5 years"
    r"(?:over|more than)\s*(\d+)\s*(?:years?|yrs?)",
]

# =============================================================================
# ACTION VERBS (For evidence strength scoring)
# =============================================================================
ACTION_VERBS = {
    # Leadership
    "led", "managed", "directed", "supervised", "coordinated", "oversaw",
    "headed", "spearheaded", "orchestrated", "mentored", "coached",

    # Achievement
    "achieved", "accomplished", "delivered", "completed", "exceeded",
    "attained", "earned", "won", "secured",

    # Creation/Building
    "built", "created", "developed", "designed", "architected",
    "established", "founded", "launched", "implemented", "deployed",
    "engineered", "constructed", "formulated",

    # Improvement
    "improved", "enhanced", "optimized", "streamlined", "modernized",
    "transformed", "revamped", "upgraded", "accelerated", "boosted",
    "increased", "reduced", "decreased", "minimized", "eliminated",

    # Analysis/Research
    "analyzed", "researched", "investigated", "evaluated", "assessed",
    "identified", "discovered", "diagnosed", "resolved",

    # Communication
    "presented", "communicated", "negotiated", "collaborated",
    "partnered", "facilitated", "influenced", "persuaded",

    # Other
    "drove", "executed", "performed", "conducted", "maintained",
    "supported", "contributed", "participated", "assisted",
}

# =============================================================================
# METRIC PATTERNS (For detecting quantified achievements)
# =============================================================================
METRIC_PATTERNS = [
    r"\d+%",  # Percentages
    r"\$[\d,]+[KMB]?",  # Dollar amounts
    r"[\d,]+\s*(?:users?|customers?|clients?)",  # User counts
    r"[\d,]+\s*(?:team members?|engineers?|developers?)",  # Team size
    r"\d+x\b",  # Multipliers (2x, 10x)
    r"#\d+\b",  # Rankings
    r"\d+\s*(?:projects?|applications?|systems?)",  # Project counts
]


def get_all_skills() -> set:
    """Return combined set of hard and soft skills."""
    return HARD_SKILLS | SOFT_SKILLS


def get_all_entities() -> set:
    """Return all entity terms for matching."""
    return HARD_SKILLS | SOFT_SKILLS | CERTIFICATIONS | METHODOLOGIES | DOMAINS
