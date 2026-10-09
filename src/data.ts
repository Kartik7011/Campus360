import type { AppData } from './types'

export const seedData: AppData = {
  version: 3,
  students: [
    {
      id: 'kartik',
      name: 'Kartik Chauhan',
      initials: 'KC',
      email: 'kartik.chauhan@galgotiasuniversity.ac.in',
      phone: '+91 98765 40182',
      semester: 7,
      branch: 'Computer Science & Engineering',
      program: 'B.Tech',
      cgpa: 7.76,
      activeBacklogs: 0,
      backlogSubjects: [],
      debarred: false,
      graduationYear: 2027,
      attendance: 86,
      creditsCompleted: 128,
      totalCredits: 160,
      skills: ['React', 'TypeScript', 'Node.js', 'SQL', 'Git'],
      profileNote: 'Focused on product engineering, campus systems, and building useful tools for students.',
    },
    {
      id: 'shreyansh',
      name: 'Shreyansh Pandey',
      initials: 'SP',
      email: 'shreyansh.pandey@galgotiasuniversity.ac.in',
      phone: '+91 98765 77826',
      semester: 7,
      branch: 'Electronics & Communication Engineering',
      program: 'B.Tech',
      cgpa: 7.2,
      activeBacklogs: 1,
      backlogSubjects: ['EM2'],
      debarred: false,
      graduationYear: 2027,
      attendance: 91,
      creditsCompleted: 132,
      totalCredits: 160,
      skills: ['Python', 'Embedded C', 'IoT', 'MATLAB', 'Data Analysis'],
      profileNote:
        'Exploring embedded systems, applied data work, and the connection between hardware and software.',
    },
  ],
  mentor: {
    id: 'mentor-avinash',
    name: 'Dr. Avinash Dwivedi',
    initials: 'AD',
    department: 'Department of Computer Science & Engineering',
    email: 'kartikchauhan0206@gmail.com',
    phone: '+91 70117 56999',
    officeHours: 'Tue & Thu · 2:00–4:00 PM',
    availability: 'Available this week',
    focus: 'Academic planning, rechecking support, and placement readiness',
  },
  notices: [
    {
      id: 'notice-1',
      title: 'End-semester registration window opens',
      category: 'Academic',
      summary: 'Complete semester registration and fee verification before your hall ticket is generated.',
      date: '2026-10-08',
      deadline: '2026-10-12',
      priority: 'High',
      audience: 'All 7th semester students',
      source: 'Academic Section',
    },
    {
      id: 'notice-2',
      title: 'Northstar Finance pre-placement talk',
      category: 'Placement',
      summary: 'Join the role briefing and live Q&A for the Associate Product Analyst opening.',
      date: '2026-10-07',
      deadline: '2026-10-10',
      priority: 'High',
      audience: 'Eligible final and pre-final year students',
      source: 'Training & Placement Cell',
    },
    {
      id: 'notice-3',
      title: 'Rechecking applications — September results',
      category: 'Rechecking',
      summary:
        'Students can submit rechecking requests through the examination portal for four working days.',
      date: '2026-10-06',
      deadline: '2026-10-11',
      priority: 'High',
      audience: 'Students with published September results',
      source: 'Controller of Examinations',
    },
    {
      id: 'notice-4',
      title: 'Mock interview rooms are open for booking',
      category: 'Placement',
      summary: 'Book a 25-minute practice slot with an alumni interviewer through the placement desk.',
      date: '2026-10-05',
      deadline: '2026-10-18',
      priority: 'Medium',
      audience: 'Placement-registered students',
      source: 'Career Development Cell',
    },
    {
      id: 'notice-5',
      title: 'Mid-term attendance correction window',
      category: 'Academic',
      summary: 'Review your attendance ledger and report discrepancies to the department office.',
      date: '2026-10-03',
      deadline: '2026-10-16',
      priority: 'Medium',
      audience: 'All enrolled students',
      source: 'Dean Academics',
    },
  ],
  rechecks: [
    {
      id: 'recheck-1',
      studentId: 'kartik',
      subject: 'Operating Systems',
      code: 'CSE-601',
      requestDate: '2026-09-28',
      status: 'Under Review',
      remarks: 'Answer script has been sent to the moderation desk.',
      expectedBy: '2026-10-14',
    },
    {
      id: 'recheck-2',
      studentId: 'kartik',
      subject: 'Computer Networks',
      code: 'CSE-603',
      requestDate: '2026-09-29',
      status: 'Submitted',
      remarks: 'Fee receipt verified. Awaiting evaluator allocation.',
      expectedBy: '2026-10-15',
    },
    {
      id: 'recheck-3',
      studentId: 'shreyansh',
      subject: 'Digital Signal Processing',
      code: 'ECE-605',
      requestDate: '2026-09-30',
      status: 'Resolved',
      remarks: 'Marks unchanged after rechecking.',
      expectedBy: '2026-10-09',
    },
  ],
  companies: [
    {
      id: 'technova',
      name: 'TechNova Systems',
      initials: 'TN',
      sector: 'Product engineering',
      location: 'Bengaluru · India',
      website: 'technova.example',
      description: 'Builds developer tools and workflow software for fast-moving teams.',
      accent: '#4b5a8c',
    },
    {
      id: 'orbit',
      name: 'Orbit Labs',
      initials: 'OL',
      sector: 'Cloud & data',
      location: 'Pune · Hybrid',
      website: 'orbitlabs.example',
      description: 'A cloud data platform helping operations teams turn messy signals into decisions.',
      accent: '#2e6b66',
    },
    {
      id: 'northstar',
      name: 'Northstar Finance',
      initials: 'NF',
      sector: 'Fintech',
      location: 'Mumbai · India',
      website: 'northstar.example',
      description: 'A digital finance company focused on transparent, accessible financial products.',
      accent: '#94551d',
    },
  ],
  opportunities: [
    {
      id: 'opp-technova-frontend',
      companyId: 'technova',
      title: 'Frontend Engineer',
      location: 'Bengaluru',
      workMode: 'Hybrid',
      deadline: '2026-10-17',
      posted: '2026-10-04',
      minCgpa: 8,
      allowedBranches: ['Computer Science & Engineering', 'Information Technology'],
      maxActiveBacklogs: 0,
      graduationYears: [2027],
      requiredSkills: ['React', 'TypeScript', 'HTML/CSS'],
      preferredSkills: ['Testing', 'Git', 'Accessibility'],
      jobDescription:
        'Work with a product engineering team to build accessible, high-quality web experiences using React and TypeScript. You will partner with designers, write maintainable UI, and contribute to frontend testing and performance improvements.',
      package: '₹12–16 LPA',
      jobType: 'Full-time',
      status: 'Open',
    },
    {
      id: 'opp-orbit-data',
      companyId: 'orbit',
      title: 'Data Platform Intern',
      location: 'Pune',
      workMode: 'Hybrid',
      deadline: '2026-10-22',
      posted: '2026-10-06',
      minCgpa: 7.5,
      allowedBranches: [
        'Computer Science & Engineering',
        'Information Technology',
        'Electronics & Communication Engineering',
      ],
      maxActiveBacklogs: 1,
      graduationYears: [2027, 2028],
      requiredSkills: ['Python', 'SQL'],
      preferredSkills: ['Data Analysis', 'Docker', 'AWS'],
      jobDescription:
        'Join the data platform team to prepare reliable datasets, build Python utilities, and query operational data with SQL. Curiosity, clear documentation, and a willingness to learn cloud tooling are valued.',
      package: '₹45k / month',
      jobType: 'Internship + PPO',
      status: 'Open',
    },
    {
      id: 'opp-northstar-analyst',
      companyId: 'northstar',
      title: 'Associate Product Analyst',
      location: 'Mumbai',
      workMode: 'On-site',
      deadline: '2026-10-10',
      posted: '2026-10-01',
      minCgpa: 7.8,
      allowedBranches: [
        'Computer Science & Engineering',
        'Information Technology',
        'Electronics & Communication Engineering',
        'Electrical Engineering',
      ],
      maxActiveBacklogs: 0,
      graduationYears: [2027],
      requiredSkills: ['SQL', 'Data Analysis', 'Communication'],
      preferredSkills: ['Excel', 'A/B Testing', 'Product Thinking'],
      jobDescription:
        'Support product decisions with clear analysis, SQL-based reporting, and user research. The role works closely with product managers and engineering teams to turn customer questions into measurable experiments.',
      package: '₹9–12 LPA',
      jobType: 'Full-time',
      status: 'Closing soon',
    },
  ],
  applications: [
    {
      id: 'application-kartik-orbit',
      studentId: 'kartik',
      opportunityId: 'opp-orbit-data',
      stage: 'Technical',
      appliedOn: '2026-10-06',
      note: 'Technical round scheduled for 14 Oct.',
    },
    {
      id: 'application-kartik-northstar',
      studentId: 'kartik',
      opportunityId: 'opp-northstar-analyst',
      stage: 'Aptitude',
      appliedOn: '2026-10-03',
      note: 'Aptitude results expected by 12 Oct.',
    },
    {
      id: 'application-shreyansh-orbit',
      studentId: 'shreyansh',
      opportunityId: 'opp-orbit-data',
      stage: 'Applied',
      appliedOn: '2026-10-07',
      note: 'Application submitted through the campus portal.',
    },
  ],
  resumes: [
    {
      id: 'resume-kartik-product',
      studentId: 'kartik',
      name: 'Kartik · Product engineering resume',
      updatedAt: '2026-10-07',
      text: `Kartik Chauhan
Computer Science & Engineering | B.Tech | 2027
kartik.chauhan@galgotiasuniversity.ac.in | github.com/Kartik7011

SUMMARY
Product-minded frontend developer who builds accessible student tools and data-rich web experiences.

EDUCATION
B.Tech Computer Science & Engineering, 7.76 CGPA, graduating 2027

SKILLS
React, TypeScript, JavaScript, HTML/CSS, Node.js, SQL, Git

PROJECTS
Campus360 — Built a React and TypeScript dashboard that surfaces academic status, placement eligibility, and resume feedback for students. Added responsive design and local persistence.
StudySprint — Created a Node.js and SQL study planner with reminders and progress reporting.

EXPERIENCE
Frontend Intern, Student Innovation Lab — translated Figma flows into reusable React components and wrote basic UI tests.

ACHIEVEMENTS
Finalist in a university product hackathon; mentored two juniors during the web development sprint.`,
    },
    {
      id: 'resume-kartik-analyst',
      studentId: 'kartik',
      name: 'Kartik · Analytics-focused resume',
      updatedAt: '2026-10-02',
      text: `Kartik Chauhan
B.Tech Computer Science & Engineering · 2027 · 7.76 CGPA

EDUCATION
Bachelor of Technology, Computer Science & Engineering

SKILLS
SQL, Excel, Python, React, Data Analysis, Communication

PROJECTS
Campus analytics notebook — cleaned student survey data with Python and SQL and published a dashboard of attendance trends.
Campus360 — designed a transparent placement tracker for students.

EXPERIENCE
Student Research Assistant — interviewed users and documented requirements for a campus workflow tool.

ACHIEVEMENTS
Presented findings to a panel of four faculty members and reduced manual report preparation time by 30%.`,
    },
    {
      id: 'resume-shreyansh-iot',
      studentId: 'shreyansh',
      name: 'Shreyansh · Embedded systems resume',
      updatedAt: '2026-10-05',
      text: `Shreyansh Pandey
Electronics & Communication Engineering · 2027 · 7.20 CGPA

EDUCATION
B.Tech Electronics & Communication Engineering

SKILLS
Python, Embedded C, IoT, MATLAB, Data Analysis, SQL

PROJECTS
Smart campus energy monitor — built an IoT prototype to collect sensor readings and visualize usage trends.
Signal classifier — evaluated noisy sensor data in MATLAB and documented model accuracy.

EXPERIENCE
Hardware Lab Assistant — supported microcontroller experiments and maintained clear lab notes.

ACHIEVEMENTS
Won second place in the department prototype showcase.`,
    },
  ],
}
