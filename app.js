/* ============================================================
   Contact Lens Cost Calculator — app.js
   ============================================================ */

// ── Global Data Store ──────────────────────────────────────
let allLenses = [];
let filteredLenses = [];
let selectedLens = null;
let eyes = 2;
let patientType = 'new';

// ── Column name map (matches CSV headers exactly) ───────────
const COL = {
  brand:         'Brand',
  lens:          'LensName',
  modality:      'Modality',
  lpb:           'LensesPerBox',
  retail:        'RetailPerBox',
  rebateNew:     'RebateAnnualNew',
  rebateExist:   'RebateAnnualExisting',
  compBox:       'CompetitorPerBox',
  compRebateNew: 'CompetitorRebateNew',
  compRebateEx:  'CompetitorRebateExisting',
  bc:            'BaseCurve',
  diam:          'Diameter'
};

// ── Friendly modality labels ────────────────────────────────
const MODALITY_LABELS = {
  'daily-30':     'Daily — 30 Pack',
  'daily-90':     'Daily — 90 Pack',
  'biweekly-6':   'Bi-Weekly — 6 Pack',
  'biweekly-12':  'Bi-Weekly — 12 Pack',
  'monthly-2':    'Monthly — 2 Pack',
  'monthly-6':    'Monthly — 6 Pack',
  'monthly-12':   'Monthly — 12 Pack',
  'weekly-12':    'Weekly — 12 Pack',
  'weekly-27':    'Weekly — 27 Pack',
};

function friendlyModality(raw) {
  return MODALITY_LABELS[raw] || raw;
}

// ── Currency helper ─────────────────────────────────────────
function fmt(n) {
  if (isNaN(n) || n === null) return 'N/A';
  return '$' + Number(n).toFixed(2);
}

// ── Safe numeric parse ───────────────────────────────────────
function num(val) {
  if (val === undefined || val === null) return NaN;
  const s = String(val).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

// ── Load default CSV from /data/contacts.csv ────────────────
function loadDefaultCSV() {
  fetch('data/contacts.csv')
    .then(r => {
      if (!r.ok) throw new Error('CSV not found');
      return r.text();
    })
    .then(text => parseCSV(text))
    .catch(() => {
      showUploadStatus('⚠️ Could not load default CSV. Please upload one.', 'warn');
    });
}

// ── Parse CSV text via PapaParse ─────────────────────────────
function parseCSV(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim()
  });

  if (!result.data || result.data.length === 0) {
    showUploadStatus('❌ CSV appears empty or invalid.', 'error');
    return;
  }

  allLenses = result.data.map(row => {
    // Trim all string values
    const clean = {};
    Object.keys(row).forEach(k => {
      clean[k.trim()] = typeof row[k] === 'string' ? row[k].trim() : row[k];
    });
    return clean;
  });

  buildFilters();
  buildFullTable(allLenses);
  showUploadStatus('✅ Price list loaded — ' + allLenses.length + ' lenses.', 'success');
}

// ── Build Brand & Modality filter dropdowns ──────────────────
function buildFilters() {
  const brands     = [...new Set(allLenses.map(l => l[COL.brand]).filter(Boolean))].sort();
  const modalities = [...new Set(allLenses.map(l => l[COL.modality]).filter(Boolean))].sort();

  populateSelect('brandFilter',      brands,     'All Brands');
  populateSelect('modalityFilter',   modalities, 'All Modalities', friendlyModality);
  populateSelect('tableBrandFilter', brands,     'All Brands');
}

function populateSelect(id, values, placeholder, labelFn) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = labelFn ? labelFn(v) : v;
    sel.appendChild(opt);
  });
}

// ── Search / Filter Logic ────────────────────────────────────
function getFiltered() {
  const brand    = document.getElementById('brandFilter').value;
  const modality = document.getElementById('modalityFilter').value;
  const search   = document.getElementById('lensSearch').value.trim().toLowerCase();

  return allLenses.filter(l => {
    if (brand    && l[COL.brand]    !== brand)    return false;
    if (modality && l[COL.modality] !== modality) return false;
    if (search   && !l[COL.lens].toLowerCase().includes(search)) return false;
    return true;
  });
}

// ── Autocomplete Dropdown ────────────────────────────────────
function updateSearchDropdown() {
  const dropdown = document.getElementById('searchDropdown');
  const input    = document.getElementById('lensSearch').value.trim().toLowerCase();

  if (!input) {
    dropdown.classList.add('hidden');
    return;
  }

  filteredLenses = getFiltered();

  // Unique lens names in filtered set
  const uniqueNames = [...new Set(filteredLenses.map(l => l[COL.lens]))].slice(0, 12);

  if (uniqueNames.length === 0) {
    dropdown.innerHTML = '<div class="dd-item dd-no-result">No lenses found</div>';
    dropdown.classList.remove('hidden');
    return;
  }

  dropdown.innerHTML = uniqueNames.map(name => {
    const highlighted = name.replace(
      new RegExp(`(${escapeRegex(input)})`, 'gi'),
      '<mark>$1</mark>'
    );
    return `<div class="dd-item" data-name="${name}">${highlighted}</div>`;
  }).join('');

  dropdown.classList.remove('hidden');

  dropdown.querySelectorAll('.dd-item[data-name]').forEach(item => {
    item.addEventListener('click', () => {
      document.getElementById('lensSearch').value = item.dataset.name;
      dropdown.classList.add('hidden');
      selectLensByName(item.dataset.name);
    });
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Select a lens by name (shows modality picker if multiple) ─
function selectLensByName(name) {
  const matches = allLenses.filter(l => l[COL.lens] === name);

  if (matches.length === 0) return;

  // Apply modality filter if set
  const modalityFilter = document.getElementById('modalityFilter').value;
  const scoped = modalityFilter
    ? matches.filter(l => l[COL.modality] === modalityFilter)
    : matches;

  const pool = scoped.length > 0 ? scoped : matches;

  if (pool.length === 1) {
    setSelectedLens(pool<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>);
  } else {
    // Multiple pack sizes — let the modality dropdown guide
    setSelectedLens(pool<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>);
  }
}

// ── Set active lens and render ───────────────────────────────
function setSelectedLens(lens) {
  selectedLens = lens;

  // Update badges
  document.getElementById('resultBrand').textContent    = lens[COL.brand];
  document.getElementById('resultModality').textContent = friendlyModality(lens[COL.modality]);
  document.getElementById('bcVal').textContent          = lens[COL.bc]   || 'N/A';
  document.getElementById('diamVal').textContent        = lens[COL.diam] || 'N/A';
  document.getElementById('lpbVal').textContent         = lens[COL.lpb]  || 'N/A';
  document.getElementById('resultLensName').textContent = lens[COL.lens];

  document.getElementById('lensResult').classList.remove('hidden');
  document.getElementById('calculatorSection').classList.remove('hidden');

  calculate();
  scrollToCalculator();
}

function scrollToCalculator() {
  setTimeout(() => {
    document.getElementById('calculatorSection')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ── MAIN CALCULATE FUNCTION ──────────────────────────────────
function calculate() {
  if (!selectedLens) return;

  const boxes        = parseInt(document.getElementById('boxQty').value) || 1;
  const retailPerBox = num(selectedLens[COL.retail]);
  const compPerBox   = num(selectedLens[COL.compBox]);

  const rebateAmt = patientType === 'new'
    ? num(selectedLens[COL.rebateNew])
    : num(selectedLens[COL.rebateExist]);

  const compRebateAmt = patientType === 'new'
    ? num(selectedLens[COL.compRebateNew])
    : num(selectedLens[COL.compRebateEx]);

  // ── Our pricing ──────────────────────────────────────────
  const ourGrossPerEye  = isNaN(retailPerBox) ? NaN : retailPerBox * boxes;
  const ourGrossTotal   = isNaN(ourGrossPerEye) ? NaN : ourGrossPerEye * eyes;
  const rebateApplied   = isNaN(rebateAmt)    ? 0   : rebateAmt;
  const ourNetTotal     = isNaN(ourGrossTotal) ? NaN : Math.max(0, ourGrossTotal - rebateApplied);

  // ── Competitor pricing ───────────────────────────────────
  const compGrossPerEye = isNaN(compPerBox)   ? NaN : compPerBox * boxes;
  const compGrossTotal  = isNaN(compGrossPerEye) ? NaN : compGrossPerEye * eyes;
  const compRebate      = isNaN(compRebateAmt) ? 0  : compRebateAmt;
  const compNetTotal    = isNaN(compGrossTotal) ? NaN : Math.max(0, compGrossTotal - compRebate);

  // ── Update tiles ─────────────────────────────────────────
  document.getElementById('tileOurGross').textContent = fmt(ourGrossTotal);
  document.getElementById('tileRebate').textContent   = rebateApplied > 0 ? '-' + fmt(rebateApplied) : 'No Rebate';
  document.getElementById('tileOurNet').textContent   = fmt(ourNetTotal);
  document.getElementById('tileCompNet').textContent  = fmt(compNetTotal);

  document.getElementById('tileRebateSub').textContent =
    rebateApplied > 0 ? `${patientType === 'new' ? 'New' : 'Existing'} patient rebate` : 'No rebate available';

  // ── Populate detail table ────────────────────────────────
  const tbody = document.getElementById('detailBody');
  const rows = [
    ['Price Per Box',   fmt(retailPerBox),   fmt(compPerBox)],
    ['Boxes (per eye)', boxes,               boxes],
    ['Eyes',            eyes,                eyes],
    ['Gross Total',     fmt(ourGrossTotal),  fmt(compGrossTotal)],
    ['Rebate Applied',  rebateApplied > 0 ? '-' + fmt(rebateApplied) : '—',
                        compRebate > 0    ? '-' + fmt(compRebate)    : '—'],
    ['<strong>Net Total</strong>',
      `<strong>${fmt(ourNetTotal)}</strong>`,
      `<strong>${fmt(compNetTotal)}</strong>`],
  ];

  tbody.innerHTML = rows.map(([label, ours, comp]) =>
    `<tr>
      <td>${label}</td>
      <td class="col-ours">${ours}</td>
      <td class="col-comp">${comp}</td>
    </tr>`
  ).join('');

  // ── Savings callout ──────────────────────────────────────
  const callout = document.getElementById('savingsCallout');
  if (!isNaN(ourNetTotal) && !isNaN(compNetTotal)) {
    const diff = compNetTotal - ourNetTotal;
    callout.classList.remove('hidden', 'savings-better', 'savings-worse', 'savings-same');
    if (diff > 0.01) {
      callout.classList.add('savings-better');
      callout.innerHTML = `<i class="fa-solid fa-trophy"></i> <strong>We save the patient ${fmt(diff)}</strong> compared to 1-800 Contacts!`;
    } else if (diff < -0.01) {
      callout.classList.add('savings-worse');
      callout.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> 1-800 Contacts is ${fmt(Math.abs(diff))} less in this scenario. Highlight our <strong>convenience, care & service</strong>!`;
    } else {
      callout.classList.add('savings-same');
      callout.innerHTML = `<i class="fa-solid fa-equals"></i> Pricing is about the same. Emphasize our <strong>in-office expertise & service</strong>!`;
    }
  } else {
    callout.classList.add('hidden');
  }

  // ── Rebate note ──────────────────────────────────────────
  const rebateNote     = document.getElementById('rebateNote');
  const rebateNoteText = document.getElementById('rebateNoteText');
  if (rebateApplied > 0) {
    rebateNote.classList.remove('hidden');
    rebateNoteText.textContent =
      `Rebate of ${fmt(rebateApplied)} applies to an annual supply for a ${patientType} patient. ` +
      `Patient submits rebate form after purchase.`;
  } else {
    rebateNote.classList.add('hidden');
  }
}

// ── Full Price Table ─────────────────────────────────────────
function buildFullTable(data) {
  const tbody = document.getElementById('priceTableBody');

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:var(--gray-400);">No data available</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((l, i) => {
    const brandClass = (l[COL.brand] || '').toLowerCase().replace(/[^a-z]/g, '');
    return `<tr class="brand-row-${brandClass} ${i % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td><span class="badge badge-brand badge-sm">${l[COL.brand] || '—'}</span></td>
      <td class="lens-name-cell">
        <span class="lens-link" data-lens="${l[COL.lens]}" data-modality="${l[COL.modality]}">
          ${l[COL.lens] || '—'}
        </span>
      </td>
      <td>${friendlyModality(l[COL.modality]) || '—'}</td>
      <td class="text-center">${l[COL.lpb] || '—'}</td>
      <td class="text-center">${l[COL.bc]   || '—'}</td>
      <td class="text-center">${l[COL.diam] || '—'}</td>
      <td class="text-right price-cell">${fmt(num(l[COL.retail]))}</td>
      <td class="text-right rebate-cell">${num(l[COL.rebateNew]) > 0   ? fmt(num(l[COL.rebateNew]))   : '—'}</td>
      <td class="text-right rebate-cell">${num(l[COL.rebateExist]) > 0 ? fmt(num(l[COL.rebateExist])) : '—'}</td>
      <td class="text-right comp-cell">${fmt(num(l[COL.compBox]))}</td>
      <td class="text-right comp-cell">${num(l[COL.compRebateNew]) > 0 ? fmt(num(l[COL.compRebateNew])) : '—'}</td>
      <td class="text-right comp-cell">${num(l[COL.compRebateEx])  > 0 ? fmt(num(l[COL.compRebateEx]))  : '—'}</td>
    </tr>`;
  }).join('');

  // Click lens name in table to auto-select it
  tbody.querySelectorAll('.lens-link').forEach(link => {
    link.addEventListener('click', () => {
      const lensName = link.dataset.lens;
      const modality = link.dataset.modality;
      const match = allLenses.find(
        l => l[COL.lens] === lensName && l[COL.modality] === modality
      );
      if (match) {
        document.getElementById('lensSearch').value = lensName;
        document.getElementById('modalityFilter').value = modality;
        setSelectedLens(match);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

// ── Full table search & filter ───────────────────────────────
function filterFullTable() {
  const search = document.getElementById('tableSearch').value.trim().toLowerCase();
  const brand  = document.getElementById('tableBrandFilter').value;

  const filtered = allLenses.filter(l => {
    if (brand && l[COL.brand] !== brand) return false;
    if (search) {
      const haystack = (l[COL.lens] + ' ' + l[COL.brand] + ' ' + l[COL.modality]).toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  buildFullTable(filtered);
}

// ── Upload Status Message ────────────────────────────────────
function showUploadStatus(msg, type) {
  const el = document.getElementById('uploadStatus');
  el.textContent = msg;
  el.className   = 'upload-status upload-' + type;
  setTimeout(() => { el.textContent = ''; el.className = 'upload-status'; }, 6000);
}

// ── Collapsible Full Table ───────────────────────────────────
function initCollapsible() {
  const header  = document.getElementById('tableToggleHeader');
  const wrapper = document.getElementById('fullTableWrapper');
  const chevron = document.getElementById('tableChevron');

  header.addEventListener('click', () => {
    const isHidden = wrapper.classList.toggle('hidden');
    chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
  });
}

// ── EVENT LISTENERS ──────────────────────────────────────────
function initEvents() {

  // Brand filter change
  document.getElementById('brandFilter').addEventListener('change', () => {
    document.getElementById('lensSearch').value = '';
    document.getElementById('searchDropdown').classList.add('hidden');
    selectedLens = null;
    document.getElementById('lensResult').classList.add('hidden');
    document.getElementById('calculatorSection').classList.add('hidden');
  });

  // Modality filter change — recalc if lens selected
  document.getElementById('modalityFilter').addEventListener('change', () => {
    if (selectedLens) {
      const name     = selectedLens[COL.lens];
      const modality = document.getElementById('modalityFilter').value;
      if (modality) {
        const match = allLenses.find(
          l => l[COL.lens] === name && l[COL.modality] === modality
        );
        if (match) setSelectedLens(match);
      }
    }
  });

  // Lens search input
  document.getElementById('lensSearch').addEventListener('input', updateSearchDropdown);
  document.getElementById('lensSearch').addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('searchDropdown').classList.add('hidden');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('#lensSearch') && !e.target.closest('#searchDropdown')) {
      document.getElementById('searchDropdown').classList.add('hidden');
    }
  });

  // Eye toggle
  document.getElementById('eyeToggle').querySelectorAll('.btn-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('eyeToggle').querySelectorAll('.btn-toggle')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      eyes = parseInt(btn.dataset.value);
      calculate();
    });
  });

  // Patient type toggle
  document.getElementById('patientToggle').querySelectorAll('.btn-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('patientToggle').querySelectorAll('.btn-toggle')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      patientType = btn.dataset.value;
      calculate();
    });
  });

  // Box quantity change
  document.getElementById('boxQty').addEventListener('input', calculate);

  // CSV file upload
  document.getElementById('csvUpload').addEventListener('change', e => {
    const file = e.target.files<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>;
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      showUploadStatus('❌ Please upload a .csv file only.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      parseCSV(ev.target.result);
      // Reset UI
      selectedLens = null;
      document.getElementById('lensSearch').value = '';
      document.getElementById('lensResult').classList.add('hidden');
      document.getElementById('calculatorSection').classList.add('hidden');
    };
    reader.readAsText(file);
  });

  // Full table search & filter
  document.getElementById('tableSearch').addEventListener('input', filterFullTable);
  document.getElementById('tableBrandFilter').addEventListener('change', filterFullTable);
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  initCollapsible();
  loadDefaultCSV();
});
