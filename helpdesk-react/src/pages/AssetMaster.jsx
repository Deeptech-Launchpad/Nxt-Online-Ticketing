import React, { useState, useMemo, useEffect } from 'react';

const DIVISIONS = ['Guntur -AndhraPradesh', 'RS Puram Coimbatore', 'Saibaba Colony-Coimbatore', 'Thudiyalur-coimbatore', 'WFH'];
const ASSET_TYPES = ['Laptop', 'Desktop', 'Printer', 'Networking', 'Monitor', 'UPS', 'Phone', 'Other'];

const WARRANTY_STATUS_OPTIONS = ['Active', 'Expired', 'Expiring Soon', 'No Warranty'];

const defaultForm = {
  division: '',
  id: '',
  name: '',
  brand: '',
  serialNumber: '',
  quantity: '',
  purchaseDate: '',
  warrantyExpiry: '',
  type: 'Laptop',
  ownershipType: '',
  ownedByDivision: '',
  personalOwnerName: '',
  personalOwnerContact: '',
  vendorName: '',
  vendorContact: '',
  rentalType: '',
  rentStartDate: '',
  rentEndDate: '',
  organization: '',
};

const initialAssets = [
  {
    division: 'RS Puram Coimbatore',
    id: 'AST-1001',
    name: 'Dell Latitude 5420 (Rental)',
    brand: 'Dell',
    serialNumber: 'DELL-RENT-001',
    quantity: 1,
    purchaseDate: '2023-01-10',
    warrantyExpiry: '2024-01-10',
    warrantyStatus: 'Active',
    qtyInUse: 1,
    qtyRepairing: 0,
    qtyScrap: 0,
    type: 'Laptop',
    status: 'In Use',
    ownershipType: 'Rent',
    vendorName: 'Global IT Rentals',
    vendorContact: 'rentals@globalit.com',
    rentalType: 'Monthly',
    rentStartDate: '2023-01-01',
    rentEndDate: '2023-12-31'
  },
  {
    division: 'Guntur -AndhraPradesh',
    id: 'AST-2001',
    name: 'Samsung 27" Curved Monitor',
    brand: 'Samsung',
    serialNumber: 'SAM-OFFICE-99',
    quantity: 5,
    purchaseDate: '2023-05-20',
    warrantyExpiry: '2025-05-20',
    warrantyStatus: 'Active',
    qtyInUse: 0,
    qtyRepairing: 0,
    qtyScrap: 0,
    type: 'Monitor',
    status: 'Spare',
    ownershipType: 'Office Owned',
    organization: 'Altius Technologies Pvt Ltd.,',
    ownedByDivision: 'Guntur -AndhraPradesh'
  },
  {
    division: 'WFH',
    id: 'AST-3001',
    name: 'MacBook Air M2 (Personal)',
    brand: 'Apple',
    serialNumber: 'APP-PERS-777',
    quantity: 1,
    purchaseDate: '2023-08-15',
    warrantyExpiry: '2024-08-15',
    warrantyStatus: 'Active',
    qtyInUse: 1,
    qtyRepairing: 0,
    qtyScrap: 0,
    type: 'Laptop',
    status: 'In Use',
    ownershipType: 'Personal',
    organization: 'White&Co',
    assignedTo: 'Sanjana',
    personalOwnerName: 'Sanjana',
    personalOwnerContact: 'sanjana@gmail.com'
  }
];

function generateId(assets) {
  const nums = assets.map(a => parseInt(a.id.replace('AST-', '')) || 0);
  const max = nums.length > 0 ? Math.max(...nums) : 1000;
  return 'AST-' + String(max + 1);
}

function WarrantyBadge({ status }) {
  const map = {
    'Active':        { cls: 'badge-resolved', icon: 'verified' },
    'Expiring Soon': { cls: 'badge-medium',   icon: 'warning' },
    'Expired':       { cls: 'badge-high',      icon: 'cancel' },
    'No Warranty':   { cls: 'badge-closed',    icon: 'block' },
  };
  const { cls, icon } = map[status] || map['No Warranty'];
  return (
    <span className={`badge ${cls}`} style={{ gap: 5 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{icon}</span>
      {status}
    </span>
  );
}

function StatusTag({ status }) {
  if (status === 'In Use')
    return <span className="tag remote-tag">In Use</span>;
  if (status === 'Repair')
    return <span className="tag no-remote-tag" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>Repair</span>;
  if (status === 'Scrap')
    return <span className="tag no-remote-tag" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>Scrap</span>;
  return <span className="tag no-remote-tag">Spare</span>;
}

function FormField({ label, required, children, span }) {
  return (
    <div className="form-group-light" style={span ? { gridColumn: `span ${span}` } : {}}>
      <label className="form-label-light">
        {label}{required && <span style={{ color: 'var(--blue)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const API = '/api';

export default function AssetMaster() {
  const [assets, setAssets] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  // Load all data from backend on mount
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [assetsRes, orgsRes, usersRes] = await Promise.all([
          fetch(`${API}/assets`),
          fetch(`${API}/organizations`),
          fetch(`${API}/users`),
        ]);
        const assetsData = await assetsRes.json();
        const orgsData   = await orgsRes.json();
        const usersData  = await usersRes.json();

        // Merge DB orgs with placeholders
        const placeholders = [
          { id: null, name: 'Altius Technologies Pvt Ltd.,' },
          { id: null, name: 'White&Co' },
          { id: null, name: 'Antlab' },
          { id: null, name: 'Infra Corp' }
        ];
        const combinedOrgs = [...orgsData];
        placeholders.forEach(p => {
          if (!combinedOrgs.find(o => o.name === p.name)) {
            combinedOrgs.push(p);
          }
        });

        // Map snake_case from DB to camelCase for React
        setAssets(assetsData.map(a => ({
          id:                   a.id,
          name:                 a.name,
          brand:                a.brand,
          type:                 a.type,
          serialNumber:         a.serial_number,
          division:             a.division,
          organization:         a.organization_name || '',
          organizationId:       a.organization_id,
          ownershipType:        a.ownership_type,
          ownedByDivision:      a.owned_by_division,
          personalOwnerName:    a.personal_owner_name,
          personalOwnerContact: a.personal_owner_contact,
          vendorName:           a.vendor_name,
          vendorContact:        a.vendor_contact,
          rentalType:           a.rental_type,
          rentStartDate:        a.rent_start_date,
          rentEndDate:          a.rent_end_date,
          quantity:             Number(a.quantity),
          qtyInUse:             Number(a.qty_in_use),
          qtyRepairing:         Number(a.qty_repairing),
          qtyScrap:             Number(a.qty_scrap),
          status:               a.status,
          warrantyStatus:       a.warranty_status,
          warrantyExpiry:       a.warranty_expiry,
          purchaseDate:         a.purchase_date,
          assignedTo:           a.assigned_to,
          createdAt:            a.created_at,
        })));
        setOrganizations(combinedOrgs);
        // Keep full user objects so allocate flow can look up email by name
        setDemoUsers(usersData.map(u => ({ name: u.name, email: u.email || '' })));
      } catch (err) {
        setApiError('Cannot connect to backend. Is the server running on port 5000?');
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const refreshAssets = async () => {
    try {
      const res  = await fetch(`${API}/assets`);
      const data = await res.json();
      setAssets(data.map(a => ({
        id: a.id, name: a.name, brand: a.brand, type: a.type,
        serialNumber: a.serial_number, division: a.division,
        organization: a.organization_name || '', organizationId: a.organization_id,
        ownershipType: a.ownership_type, ownedByDivision: a.owned_by_division,
        personalOwnerName: a.personal_owner_name, personalOwnerContact: a.personal_owner_contact,
        vendorName: a.vendor_name, vendorContact: a.vendor_contact,
        rentalType: a.rental_type, rentStartDate: a.rent_start_date, rentEndDate: a.rent_end_date,
        quantity: Number(a.quantity), qtyInUse: Number(a.qty_in_use),
        qtyRepairing: Number(a.qty_repairing), qtyScrap: Number(a.qty_scrap),
        status: a.status, warrantyStatus: a.warranty_status,
        warrantyExpiry: a.warranty_expiry, purchaseDate: a.purchase_date, assignedTo: a.assigned_to,
        createdAt: a.created_at,
      })));
    } catch (err) { console.error('Refresh failed:', err); }
  };

  const [selectedIds, setSelectedIds] = useState([]);
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const selectAll = (e) => {
    if (e.target.checked) setSelectedIds(filtered.map(a => a.id));
    else setSelectedIds([]);
  };

  const [search, setSearch] = useState('');
  const [filterDivision, setFilterDivision] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrg, setFilterOrg] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [activeCardFilter, setActiveCardFilter] = useState('all');

  const categories = ['Laptop', 'Monitor', 'Printer', 'Networking', 'Desktop', 'Mobile', 'UPS', 'Phone', 'Other'];
  const locations  = ['RS Puram Coimbatore', 'Guntur -AndhraPradesh', 'WFH', 'Saibaba Colony-Coimbatore', 'Chennai', 'Bangalore'];

  const [allocatingAsset, setAllocatingAsset] = useState(null);
  const [allocationType, setAllocationType] = useState('Allocate to User');
  const [allocationForm, setAllocationForm] = useState({
    date: new Date().toISOString().split('T')[0],
    division: '',
    userName: '',
    qty: 1,
    returnFrom: 'User',
    returnTo: 'Stock'
  });

  const [viewingHistory, setViewingHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState('');

  const totalAssets = assets.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
  const totalInUse = assets.reduce((s, a) => s + (Number(a.qtyInUse) || 0), 0);
  const totalRepairing = assets.reduce((s, a) => s + (Number(a.qtyRepairing) || 0), 0);
  const totalScrap = assets.reduce((s, a) => s + (Number(a.qtyScrap) || 0), 0);

  const filtered = useMemo(() => {
    return assets.filter(a => {
      const q = search.toLowerCase();
      const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.brand.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q);
      const matchesDiv = filterDivision === 'all' || a.division === filterDivision;
      const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
      const matchesOrg = filterOrg === 'all' || a.organization === filterOrg;
      const matchesCat = filterCat === 'all' || a.type === filterCat;
      const matchesUser = filterUser === 'all' || a.assignedTo === filterUser;
      
      let matchCard = true;
      if (activeCardFilter === 'inUse') matchCard = Number(a.qtyInUse) > 0;
      if (activeCardFilter === 'repairing') matchCard = Number(a.qtyRepairing) > 0;
      if (activeCardFilter === 'scrap') matchCard = Number(a.qtyScrap) > 0;

      return matchesSearch && matchesDiv && matchesStatus && matchCard && matchesOrg && matchesCat && matchesUser;
    });
  }, [assets, search, filterDivision, filterStatus, filterOrg, filterCat, filterUser, activeCardFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm, id: generateId(assets) });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (e, asset) => {
    e.stopPropagation();
    setEditingId(asset.id);
    setForm({
      division: asset.division,
      id: asset.id,
      name: asset.name,
      brand: asset.brand,
      serialNumber: asset.serialNumber,
      quantity: String(asset.quantity),
      purchaseDate: asset.purchaseDate,
      warrantyExpiry: asset.warrantyExpiry,
      warrantyStatus: asset.warrantyStatus,
      qtyInUse: String(asset.qtyInUse),
      qtyRepairing: String(asset.qtyRepairing),
      qtyScrap: String(asset.qtyScrap),
      type: asset.type,
      status: asset.status,
      ownershipType: asset.ownershipType || '',
      ownedByDivision: asset.ownedByDivision || '',
      personalOwnerName: asset.personalOwnerName || '',
      personalOwnerContact: asset.personalOwnerContact || '',
      vendorName: asset.vendorName || '',
      vendorContact: asset.vendorContact || '',
      rentalType: asset.rentalType || '',
      rentStartDate: asset.rentStartDate || '',
      rentEndDate: asset.rentEndDate || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormError('');
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.division) return 'Division is required.';
    if (!form.name.trim()) return 'Asset Name is required.';
    if (!form.brand.trim()) return 'Brand is required.';
    if (!form.serialNumber.trim()) return 'Serial Number is required.';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0) return 'Valid Quantity is required.';
    const qty = Number(form.quantity);
    const inUse = Number(form.qtyInUse) || 0;
    const rep = Number(form.qtyRepairing) || 0;
    const scrap = Number(form.qtyScrap) || 0;
    if (inUse + rep + scrap > qty) return 'Qty In Use + Repairing + Scrap cannot exceed total Quantity.';
    return '';
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }

    const org = organizations.find(o => o === form.organization);
    const payload = {
      name:                 form.name.trim(),
      brand:                form.brand.trim(),
      serial_number:        form.serialNumber.trim(),
      type:                 form.type,
      division:             form.division,
      organization_id:      organizations.find(o => o.name === form.organization)?.id || null,
      ownership_type:       form.ownershipType,
      owned_by_division:    form.ownershipType === 'Office Owned' ? form.ownedByDivision : '',
      personal_owner_name:  form.ownershipType === 'Personal' ? form.personalOwnerName : '',
      personal_owner_contact: form.ownershipType === 'Personal' ? form.personalOwnerContact : '',
      vendor_name:          form.ownershipType === 'Rent' ? form.vendorName : '',
      vendor_contact:       form.ownershipType === 'Rent' ? form.vendorContact : '',
      rental_type:          form.ownershipType === 'Rent' ? form.rentalType : '',
      rent_start_date:      form.ownershipType === 'Rent' ? form.rentStartDate : null,
      rent_end_date:        form.ownershipType === 'Rent' ? form.rentEndDate : null,
      quantity:             Number(form.quantity),
      qty_in_use:           Number(form.qtyInUse) || 0,
      qty_repairing:        Number(form.qtyRepairing) || 0,
      qty_scrap:            Number(form.qtyScrap) || 0,
      status:               form.status || 'Spare',
      warranty_status:      form.warrantyStatus || 'Active',
      warranty_expiry:      form.warrantyExpiry || null,
      purchase_date:        form.purchaseDate || null,
      assigned_to:          form.assignedTo || null,
    };

    try {
      if (editingId) {
        await fetch(`${API}/assets/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      await refreshAssets();
      closeModal();
    } catch (err) {
      setFormError('Failed to save. Check backend connection.');
    }
  };

  const exportToCSV = () => {
    const headers = ["Asset ID", "Date", "Purchase Date", "Name", "Brand", "Organization", "Ownership", "Location", "Serial No", "Recd Qty", "In Stock", "In Use", "Under Repair", "Scraped", "Owned By Office", "Rented", "Owned By User", "Warranty Status", "Warranty Expiry Date"];
    const rows = filtered.map(a => {
      const spare = a.quantity - a.qtyInUse - (a.qtyRepairing||0) - (a.qtyScrap||0);
      const ownedByOffice = (!a.ownershipType || a.ownershipType === 'Office Owned') ? a.quantity : 0;
      const rented = a.ownershipType === 'Rent' ? a.quantity : 0;
      const ownedByUser = a.ownershipType === 'Personal' ? a.quantity : 0;
      return [
        a.id,
        a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'N/A',
        a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : 'N/A',
        a.name, a.brand, a.organization || 'N/A', a.ownershipType || 'Office Owned', a.division, a.serialNumber,
        a.quantity, spare, a.qtyInUse, a.qtyRepairing || 0, a.qtyScrap || 0,
        ownedByOffice, rented, ownedByUser, a.warrantyStatus,
        a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString() : 'N/A'
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Asset_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await fetch(`${API}/assets/${id}`, { method: 'DELETE' });
        await refreshAssets();
      } catch (err) {
        alert('Delete failed. Check backend connection.');
      }
    }
  };

  const openHistory = async (asset) => {
    setViewingHistory(asset);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/assets/${asset.id}/history`);
      const data = await res.json();
      setHistoryData(data);
    } catch (err) {
      console.error('History fetch failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner"></div>
    </div>
  );

  if (apiError) return (
    <div style={{ padding: 60, textAlign: 'center', background: 'var(--white)', borderRadius: 24, margin: 40, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--danger)', marginBottom: 20 }}>cloud_off</span>
      <h2 style={{ color: 'var(--navy)', marginBottom: 12 }}>Backend Connection Error</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 24px' }}>
        We couldn't connect to the asset database. Please ensure your backend server is running on <strong>port 5000</strong>.
      </p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
        Retry Connection
      </button>
    </div>
  );

  return (
    <div className="page-fade" style={{ paddingBottom: 40 }}>

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="page-title">Asset Master</div>
          <div className="page-sub">Manage and track IT hardware inventory globally</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={openCreate}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add Asset
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { id: 'all', label: 'Total Assets', value: totalAssets, icon: 'inventory_2', color: '#CC3A3A', bg: 'rgba(204,58,58,0.1)' },
          { id: 'inUse', label: 'In Use', value: totalInUse, icon: 'computer', color: '#95BF47', bg: 'rgba(149,191,71,0.1)' },
          { id: 'repairing', label: 'Under Repair', value: totalRepairing, icon: 'build', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { id: 'scrap', label: 'Scrapped', value: totalScrap, icon: 'delete_forever', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
        ].map((s, i) => (
          <div 
            key={i} 
            className="card" 
            onClick={() => setActiveCardFilter(s.id)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer',
              border: activeCardFilter === s.id ? `1.5px solid ${s.color}` : '1px solid var(--slate)',
              boxShadow: activeCardFilter === s.id ? `0 4px 18px ${s.color}20` : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 11, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 21, color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-1px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', background: 'var(--white)' }}>
        <div className="search-bar" style={{ flex: '1 1 240px', minWidth: 200 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 18 }}>search</span>
          <input type="text" placeholder="Search by name, ID, serial..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="form-select-light" value={filterOrg} onChange={e => setFilterOrg(e.target.value)} style={{ flex: '1 1 140px', fontSize: 13 }}>
          <option value="all">All Organizations</option>
          {organizations.map(org => <option key={org.id} value={org.name}>{org.name}</option>)}
        </select>

        <select className="form-select-light" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ flex: '1 1 120px', fontSize: 13 }}>
          <option value="all">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <select className="form-select-light" value={filterDivision} onChange={e => setFilterDivision(e.target.value)} style={{ flex: '1 1 140px', fontSize: 13 }}>
          <option value="all">All Locations</option>
          {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>

        <select className="form-select-light" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ flex: '1 1 120px', fontSize: 13 }}>
          <option value="all">All Users</option>
          {demoUsers.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
        </select>

        <select className="form-select-light" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: '1 1 120px', fontSize: 13 }}>
          <option value="all">All Status</option>
          <option value="In Use">In Use</option>
          <option value="Repair">Repair</option>
          <option value="Scrap">Scrap</option>
          <option value="Spare">Spare</option>
        </select>

        {(search || filterDivision !== 'all' || filterStatus !== 'all' || filterOrg !== 'all' || filterCat !== 'all' || filterUser !== 'all' || activeCardFilter !== 'all') && (
          <button className="btn btn-white btn-sm" onClick={() => { 
            setSearch(''); setFilterDivision('all'); setFilterStatus('all'); 
            setFilterOrg('all'); setFilterCat('all'); setFilterUser('all');
            setActiveCardFilter('all'); 
          }}>
            Clear
          </button>
        )}

        <button className="btn btn-white btn-sm" onClick={exportToCSV} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
          Export CSV
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={selectAll} />
              </th>
              <th>Asset ID</th>
              <th>Date</th>
              <th>Purchase Date</th>
              <th>Asset Name &amp; Brand</th>
              <th>Organization</th>
              <th>Ownership</th>
              <th>Location</th>
              <th>Serial No.</th>
              <th>Recd Qty</th>
              <th>In Stock</th>
              <th>In Use</th>
              <th>Under Repair</th>
              <th>Scraped</th>
              <th>Owned By Office</th>
              <th>Rented</th>
              <th>Owned By User</th>
              <th>Warranty Status</th>
              <th>Warrant Expiry Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(asset => (
              <tr key={asset.id} onClick={() => toggleSelect(asset.id)} style={{ background: selectedIds.includes(asset.id) ? '#eef4ff' : 'inherit', cursor: 'pointer' }}>
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(asset.id)} onChange={() => toggleSelect(asset.id)} />
                </td>
                <td><span style={{ fontSize: 12.5, fontFamily: "'DM Mono',monospace", color: 'var(--blue)', fontWeight: 700 }}>{asset.id}</span></td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : '-'}</td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '-'}</td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14 }}>{asset.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{asset.brand}</div>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{asset.organization || '---'}</td>
                <td>
                  <span className={`tag ${asset.ownershipType === 'Rent' ? 'remote-tag' : asset.ownershipType === 'Personal' ? 'badge-reopened' : 'no-remote-tag'}`} style={{ fontSize: 11, padding: '2px 6px' }}>
                    {asset.ownershipType || 'Office Owned'}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {asset.division}
                </td>
                <td style={{ fontSize: 12.5, fontFamily: "'DM Mono',monospace", color: 'var(--text-secondary)' }}>{asset.serialNumber}</td>
                <td style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', fontFamily: "'DM Mono',monospace", textAlign: 'center' }}>{asset.quantity}</td>
                <td style={{ textAlign: 'center' }}>
                  {(() => { const spare = asset.quantity - asset.qtyInUse - (asset.qtyRepairing||0) - (asset.qtyScrap||0); return <span style={{ background: spare > 0 ? 'rgba(149,191,71,0.12)' : 'rgba(204,58,58,0.1)', color: spare > 0 ? '#3a6e00' : 'var(--danger)', borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>{spare}</span>; })()}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ background: 'rgba(16,185,129,0.12)', color: '#065f46', borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>{asset.qtyInUse}</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ background: 'rgba(245,158,11,0.12)', color: '#92400e', borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>{asset.qtyRepairing}</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ background: 'rgba(107,114,128,0.12)', color: '#374151', borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>{asset.qtyScrap}</span>
                </td>
                <td style={{ textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{(!asset.ownershipType || asset.ownershipType === 'Office Owned') ? asset.quantity : 0}</td>
                <td style={{ textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{asset.ownershipType === 'Rent' ? asset.quantity : 0}</td>
                <td style={{ textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{asset.ownershipType === 'Personal' ? asset.quantity : 0}</td>
                <td><WarrantyBadge status={asset.warrantyStatus} /></td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '-'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="action-btn-gray" title="Allocate/Return" onClick={(e) => { 
                    e.stopPropagation(); 
                    setAllocatingAsset(asset); 
                    setAllocationType('Allocate to User'); 
                    let returnToVal = 'Stock';
                    if (asset.ownershipType === 'Rent') returnToVal = 'Vendor';
                    if (asset.ownershipType === 'Personal') returnToVal = 'User';
                    setAllocationForm(prev => ({...prev, division: asset.division || '', userName: '', qty: 1, returnTo: returnToVal})); 
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>assignment_ind</span>
                  </button>
                  <button className="action-btn-gray" title="Edit Asset" onClick={e => openEdit(e, asset)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>edit</span>
                  </button>
                  <button className="action-btn-gray" title="View Asset" onClick={e => { e.stopPropagation(); openHistory(asset); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>visibility</span>
                  </button>
                  <button className="action-btn-gray" title="Delete Asset" onClick={e => handleDelete(e, asset.id)} style={{ color: 'var(--danger)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--text-muted)' }}>devices_off</span>
            </div>
            <div className="empty-title">No assets found</div>
            <div className="empty-sub">Try a different search term or filter.</div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--white)',
              borderRadius: 20,
              padding: '28px 32px',
              width: '100%',
              maxWidth: 720,
              maxHeight: '92vh',
              overflowY: 'auto',
              animation: 'fadeIn 0.2s ease',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.3px' }}>
                  {editingId ? 'Edit Asset' : 'Add New Asset'}
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'var(--off-white)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {/* Basic Information Section */}
            <div style={{ borderRadius: 12, border: '1px solid var(--slate)', padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--blue)' }}>info</span>
                Basic Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Organization" required>
                  <select className="form-select-light" value={form.organization} onChange={e => handleChange('organization', e.target.value)}>
                    <option value="">Select Organization</option>
                    {organizations.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                </FormField>
                <FormField label="Division" required>
                  <select className="form-select-light" value={form.division} onChange={e => handleChange('division', e.target.value)}>
                    <option value="">Select Division</option>
                    {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </FormField>
                <FormField label="Asset ID">
                  <input className="form-input-light" value={form.id} readOnly style={{ background: 'var(--off-white)', color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace", fontSize: 14 }} />
                </FormField>
                <FormField label="Asset Name" required>
                  <input className="form-input-light" placeholder="e.g. MacBook Pro 16" value={form.name} onChange={e => handleChange('name', e.target.value)} />
                </FormField>
                <FormField label="Brand" required>
                  <input className="form-input-light" placeholder="e.g. Apple, Dell, HP" value={form.brand} onChange={e => handleChange('brand', e.target.value)} />
                </FormField>
                <FormField label="Asset Type">
                  <select className="form-select-light" value={form.type} onChange={e => handleChange('type', e.target.value)}>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="Serial Number" required>
                  <input className="form-input-light" placeholder="e.g. SN123456" value={form.serialNumber} onChange={e => handleChange('serialNumber', e.target.value)} />
                </FormField>
                {/* Removed Assigned To */}
              </div>
            </div>

            {/* Ownership Section */}
            <div style={{ borderRadius: 12, border: '1px solid var(--slate)', padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#6366f1' }}>person</span>
                Asset Ownership
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Asset Owned By">
                  <select className="form-select-light" value={form.ownershipType} onChange={e => handleChange('ownershipType', e.target.value)}>
                    <option value="">Select Option</option>
                    <option value="Rent">Rent</option>
                    <option value="Office Owned">Office Owned</option>
                    <option value="Personal">Personal</option>
                  </select>
                </FormField>

                {form.ownershipType === 'Office Owned' && (
                  <FormField label="Owning Company">
                    <select className="form-select-light" value={form.ownedByDivision} onChange={e => handleChange('ownedByDivision', e.target.value)}>
                      <option value="">Select Company</option>
                      {['antlabs', 'white&co', 'Yantra24/7', 'Profimax'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </FormField>
                )}

                {form.ownershipType === 'Personal' && (
                  <>
                    <FormField label="Owner Name">
                      <input className="form-input-light" placeholder="e.g. John Doe" value={form.personalOwnerName} onChange={e => handleChange('personalOwnerName', e.target.value)} />
                    </FormField>
                    <FormField label="Owner Contact">
                      <input className="form-input-light" placeholder="Phone or Email" value={form.personalOwnerContact} onChange={e => handleChange('personalOwnerContact', e.target.value)} />
                    </FormField>
                  </>
                )}
              </div>
            </div>

            {/* Rental Details Section */}
            {form.ownershipType === 'Rent' && (
              <div style={{ borderRadius: 12, border: '1px solid var(--slate)', padding: '18px 20px', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Vendor Name">
                    <input className="form-input-light" placeholder="e.g. ABC Rentals" value={form.vendorName} onChange={e => handleChange('vendorName', e.target.value)} />
                  </FormField>
                  <FormField label="Vendor Contact">
                    <input className="form-input-light" placeholder="Phone or Email" value={form.vendorContact} onChange={e => handleChange('vendorContact', e.target.value)} />
                  </FormField>
                  <FormField label="Rental Type">
                    <select className="form-select-light" value={form.rentalType} onChange={e => handleChange('rentalType', e.target.value)}>
                      <option value="">Select Type</option>
                      <option value="Daily">Daily</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <FormField label="Rent Start Date">
                    <input className="form-input-light" type="date" value={form.rentStartDate} onChange={e => handleChange('rentStartDate', e.target.value)} />
                  </FormField>
                  <FormField label="Rent End Date">
                    <input className="form-input-light" type="date" value={form.rentEndDate} onChange={e => handleChange('rentEndDate', e.target.value)} />
                  </FormField>
                </div>
              </div>
            )}

            {/* Quantity Details Section */}
            <div style={{ borderRadius: 12, border: '1px solid var(--slate)', padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#10b981' }}>inventory_2</span>
                Quantity
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <FormField label="Total Qty" required>
                  <input className="form-input-light" type="number" min="1" value={form.quantity} onChange={e => handleChange('quantity', e.target.value)} />
                </FormField>
              </div>
            </div>

            {/* Dates Section */}
            <div style={{ borderRadius: 12, border: '1px solid var(--slate)', padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Purchase Date">
                  <input className="form-input-light" type="date" value={form.purchaseDate} onChange={e => handleChange('purchaseDate', e.target.value)} />
                </FormField>
                <FormField label="Warranty Expiry Date">
                  <input className="form-input-light" type="date" value={form.warrantyExpiry} onChange={e => handleChange('warrantyExpiry', e.target.value)} />
                </FormField>
              </div>
            </div>

            {formError && (
              <div style={{ background: 'var(--danger-bg)', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 500, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-white" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{editingId ? 'save' : 'add'}</span>
                {editingId ? 'Save Changes' : 'Add Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {allocatingAsset && (
        <div className="modal-overlay" onClick={() => setAllocatingAsset(null)}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 28, width: '100%', maxWidth: 500, borderRadius: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>Allocate / Return Asset</div>
              <button onClick={() => setAllocatingAsset(null)} className="action-btn-gray"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <FormField label="Allocation Type">
              <select className="form-select-light" value={allocationType} onChange={e => setAllocationType(e.target.value)}>
                <option value="Allocate to User">Allocate to User</option>
                <option value="Return">Return</option>
              </select>
            </FormField>

            {allocationType === 'Allocate to User' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Date">
                    <input type="date" className="form-input-light" value={allocationForm.date} onChange={e => setAllocationForm({...allocationForm, date: e.target.value})} />
                  </FormField>
                  <FormField label="Division">
                    <select className="form-select-light" value={allocationForm.division} onChange={e => setAllocationForm({...allocationForm, division: e.target.value})}>
                      <option value="">Select Division</option>
                      {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Select User">
                    <select className="form-select-light" value={allocationForm.userName} onChange={e => setAllocationForm({...allocationForm, userName: e.target.value})}>
                      <option value="">Select User</option>
                      {demoUsers.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Qty">
                    <select className="form-select-light" value={allocationForm.qty} onChange={e => setAllocationForm({...allocationForm, qty: Number(e.target.value)})}>
                      {(() => {
                        const spare = allocatingAsset.quantity - allocatingAsset.qtyInUse - (allocatingAsset.qtyRepairing||0) - (allocatingAsset.qtyScrap||0);
                        const maxQty = spare > 0 ? spare : 1;
                        return [...Array(maxQty)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ));
                      })()}
                    </select>
                  </FormField>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Return From">
                    <input type="text" className="form-input-light" value="User" disabled />
                  </FormField>
                  <FormField label="Select User">
                    <select className="form-select-light" value={allocationForm.userName} onChange={e => setAllocationForm({...allocationForm, userName: e.target.value})}>
                      <option value="">Select User</option>
                      {demoUsers.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                    </select>
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Return To">
                    <select className="form-select-light" value={allocationForm.returnTo} onChange={e => setAllocationForm({...allocationForm, returnTo: e.target.value})} disabled={true}>
                      <option value="Stock">Stock (Office Owned)</option>
                      <option value="Vendor">Vendor (Rented)</option>
                      <option value="User">User (Personal)</option>
                    </select>
                  </FormField>
                  {allocationForm.returnTo === 'Vendor' && (
                    <FormField label="Select Vendor">
                      <input type="text" className="form-input-light" value={allocatingAsset.vendorName || 'N/A'} disabled />
                    </FormField>
                  )}
                  {allocationForm.returnTo === 'User' && (
                    <FormField label="Asset Owner">
                      <input type="text" className="form-input-light" value={allocatingAsset.personalOwnerName || 'N/A'} disabled />
                    </FormField>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Date">
                    <input type="date" className="form-input-light" value={allocationForm.date} onChange={e => setAllocationForm({...allocationForm, date: e.target.value})} />
                  </FormField>
                  <FormField label="Qty">
                    <select className="form-select-light" value={allocationForm.qty} onChange={e => setAllocationForm({...allocationForm, qty: Number(e.target.value)})}>
                      {[...Array(allocatingAsset.qtyInUse || 1)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-white" onClick={() => setAllocatingAsset(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  if (allocationType === 'Allocate to User') {
                    if (!allocationForm.userName) return alert('Please select a user');
                    const spare = allocatingAsset.quantity - allocatingAsset.qtyInUse - (allocatingAsset.qtyRepairing||0) - (allocatingAsset.qtyScrap||0);
                    if (allocationForm.qty > spare) return alert('Not enough spare stock available');

                    // Look up email by name from the users list
                    const picked = demoUsers.find(u => u.name === allocationForm.userName);
                    await fetch(`${API}/assets/${allocatingAsset.id}/allocate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        user_name:  allocationForm.userName,
                        user_email: picked?.email || '',
                        allocated_by: 'Admin',
                      })
                    });
                  } else {
                    if (!allocationForm.userName) return alert('Please select which user is returning the asset');
                    let retCategory = 'To Infra';
                    if (allocationForm.returnTo === 'Vendor') retCategory = 'To Vendor';
                    else if (allocationForm.returnTo === 'User' || allocatingAsset.ownershipType === 'Personal') retCategory = 'To User';

                    await fetch(`${API}/assets/${allocatingAsset.id}/return`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        return_category: retCategory,
                        returned_by: 'Admin',
                        user_name: allocationForm.userName,   // â† target this specific allocation
                      })
                    });
                  }
                  await refreshAssets();
                  setAllocatingAsset(null);
                } catch (err) {
                  alert('Action failed. Check connection.');
                }
              }}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div style={{
          position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)',
          width: 220, background: 'var(--white)', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)', border: '2px solid var(--blue-light)',
          padding: 20, zIndex: 2000
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)' }}>{selectedIds.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Selected</div>
            </div>
            <button onClick={() => setSelectedIds([])} style={{ background: 'var(--off-white)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--text-muted)' }}>close</span>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-white btn-sm" style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(204,58,58,0.3)', fontSize: 13 }} onClick={() => {
              if (window.confirm('Delete ' + selectedIds.length + ' selected asset(s)?')) {
                setAssets(prev => prev.filter(a => !selectedIds.includes(a.id)));
                setSelectedIds([]);
                showToast('Selected assets deleted', 'success');
              }
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
              Delete
            </button>
          </div>
        </div>
      )}
      {viewingHistory && (
        <div className="modal-overlay" onClick={() => setViewingHistory(null)}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 28, width: '100%', maxWidth: 700, borderRadius: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>Asset Allocation Details</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{viewingHistory.name} · {viewingHistory.id}</div>
              </div>
              <button onClick={() => setViewingHistory(null)} className="action-btn-gray"><span className="material-symbols-outlined">close</span></button>
            </div>

            {historyLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--slate)' }}>
                      <th style={{ padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>USER</th>
                      <th style={{ padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>ALLOCATED AT</th>
                      <th style={{ padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>RETURNED AT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No allocation history found.</td></tr>
                    ) : (
                      historyData.map(h => (
                        <tr key={h.id} style={{ borderBottom: '1px solid var(--off-white)' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{h.user_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.user_email || 'No email provided'}</div>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: 13 }}>
                            {new Date(h.allocated_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            {h.returned_at ? (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--slate)', color: 'var(--navy)' }}>Returned</span>
                            ) : (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(149,191,71,0.15)', color: '#7a9c3a', fontWeight: 600 }}>In Use</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text-muted)' }}>
                            {h.returned_at ? new Date(h.returned_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-primary" onClick={() => setViewingHistory(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
