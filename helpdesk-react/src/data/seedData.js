// Seed users and initial tickets data

export const SEED_USERS = {
  employee: { id: 'EMP-2041', name: 'Arjun Kumar', division: 'RS Puram Coimbatore', dept: 'Finance', avatar: 'AK', email: 'arjun@company.com' },
  admin:    { id: 'ADM-001',  name: 'Suresh M.',   division: 'All Divisions',           dept: 'IT Admin', avatar: 'SM', email: 'suresh@company.com' }
};

export const initialTickets = [
  {
    id: 'TKT-0041', subject: 'Network down – floor 2', category: 'Network',
    division: 'RS Puram Coimbatore', dept: 'Operations',
    employeeId: 'EMP-2041', employeeName: 'Arjun Kumar',
    priority: 'Very High', status: 'open', remote: 'In Person',
    device: 'NET-CHN-02', 
    desc: 'Entire floor 2 is without network. Router seems unresponsive. Multiple users affected.',
    createdAt: '2 Apr 2026, 8:50 AM', updatedAt: '2 Apr 2026, 8:50 AM', resolvedAt: null, inProgressAt: null, assignedTo: 'Suresh M.', attachments: ['router_error.png'], messages: [], resolutionNote: '',
    history: [{ label: 'Submitted', time: '8:50 AM' }]
  },
  {
    id: 'TKT-0040', subject: 'Excel crashes on launch', category: 'Software',
    division: 'RS Puram Coimbatore', dept: 'Finance',
    employeeId: 'EMP-2041', employeeName: 'Arjun Kumar',
    priority: 'Medium', status: 'in-progress', remote: 'AnyDesk',
    device: 'PC-CHN-045', 
    desc: 'Since this morning, Microsoft Excel crashes immediately after opening. Tried restarting PC but same issue persists. Blocking daily reporting.',
    createdAt: '2 Apr 2026, 9:14 AM', updatedAt: '2 Apr 2026, 10:05 AM', resolvedAt: null, inProgressAt: '2 Apr 2026, 10:05 AM', assignedTo: 'Suresh M.', attachments: [],
    messages: [
      { from: 'admin',    name: 'Suresh M.',   time: '10:03 AM', text: 'I have taken up your ticket. Please open AnyDesk and share your ID so I can connect and investigate.' },
      { from: 'employee', name: 'Arjun Kumar', time: '10:06 AM', text: 'Sure, my AnyDesk ID is 123 456 789. Ready when you are.' }
    ],
    resolutionNote: 'Connected via AnyDesk. Found corrupt Excel installation. Running repair via Control Panel.',
    history: [{ label: 'Submitted', time: '9:14 AM' }, { label: 'Assigned to Suresh M.', time: '9:30 AM' }, { label: 'In Progress', time: '10:05 AM' }]
  },
  {
    id: 'TKT-0039', subject: 'VPN login failure', category: 'Network',
    division: 'Guntur -AndhraPradesh', dept: 'Sales',
    employeeId: 'EMP-2099', employeeName: 'Priya S.',
    priority: 'High', status: 'open', remote: 'TeamViewer',
    device: 'PC-MDU-012', 
    desc: 'Cannot connect to VPN. Error: "Authentication failed". Tried resetting password but same issue.',
    createdAt: '1 Apr 2026, 2:15 PM', updatedAt: '1 Apr 2026, 2:15 PM', resolvedAt: null, inProgressAt: null, assignedTo: '', attachments: [], messages: [], resolutionNote: '',
    history: [{ label: 'Submitted', time: '2:15 PM' }]
  },
  {
    id: 'TKT-0038', subject: 'Printer offline – HR', category: 'Hardware',
    division: 'Thudiyalur-coimbatore', dept: 'HR',
    employeeId: 'EMP-3011', employeeName: 'Meena R.',
    priority: 'Low', status: 'closed', remote: 'In Person',
    device: 'PRN-CBE-01', 
    desc: 'Shared printer on floor 3 shows offline. Checked cables – all connected. Other PCs also unable to print.',
    createdAt: '31 Mar 2026, 11:00 AM', updatedAt: '31 Mar 2026, 11:50 AM', resolvedAt: '31 Mar 2026, 11:50 AM', inProgressAt: '31 Mar 2026, 11:20 AM', assignedTo: 'Suresh M.', attachments: [],
    messages: [
      { from: 'admin',    name: 'Suresh M.', time: '11:30 AM', text: 'Checked the print spooler. Restarted the service. Printer is back online now.' },
      { from: 'employee', name: 'Meena R.', time: '11:45 AM', text: 'Working perfectly now! Thank you.' }
    ],
    resolutionNote: 'Restarted print spooler service on print server. Cleared stuck jobs.',
    history: [{ label: 'Submitted', time: '11:00 AM' }, { label: 'Assigned', time: '11:15 AM' }, { label: 'In Progress', time: '11:20 AM' }, { label: 'Resolved & Closed', time: '11:50 AM' }]
  },
  {
    id: 'TKT-0037', subject: 'VPN disconnects on login', category: 'Network',
    division: 'RS Puram Coimbatore', dept: 'Finance',
    employeeId: 'EMP-2041', employeeName: 'Arjun Kumar',
    priority: 'High', status: 'open', remote: 'TeamViewer',
    device: 'PC-CHN-045', 
    desc: 'VPN disconnects immediately after connecting. Issue started after Windows Update yesterday.',
    createdAt: '30 Mar 2026, 3:40 PM', updatedAt: '30 Mar 2026, 3:40 PM', resolvedAt: null, inProgressAt: null, assignedTo: '', attachments: [], messages: [], resolutionNote: '',
    history: [{ label: 'Submitted', time: '3:40 PM' }]
  },
  {
    id: 'TKT-0031', subject: 'Printer not found on network', category: 'Hardware',
    division: 'RS Puram Coimbatore', dept: 'Finance',
    employeeId: 'EMP-2041', employeeName: 'Arjun Kumar',
    priority: 'Low', status: 'resolved', remote: 'In Person',
    device: 'PRN-CHN-02', 
    desc: 'HP LaserJet Pro not visible on network. Was working last week. Other users on same floor can print.',
    createdAt: '25 Mar 2026, 10:00 AM', updatedAt: '25 Mar 2026, 10:40 AM', resolvedAt: '25 Mar 2026, 10:40 AM', inProgressAt: '25 Mar 2026, 10:15 AM', assignedTo: 'Suresh M.', attachments: [],
    messages: [
      { from: 'admin',    name: 'Suresh M.',   time: '10:30 AM', text: 'Re-added the printer using IP address. Should be working now.' },
      { from: 'employee', name: 'Arjun Kumar', time: '10:45 AM', text: 'Yes, it is working now. Thank you!' }
    ],
    resolutionNote: 'Re-installed printer using static IP. Updated TCP/IP port settings.',
    history: [{ label: 'Submitted', time: '10:00 AM' }, { label: 'Assigned', time: '10:15 AM' }, { label: 'Resolved', time: '10:40 AM' }]
  }
];
