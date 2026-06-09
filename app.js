/* ============================================================
   Contact Lens Cost Calculator — app.js (Fixed)
   ============================================================ */

// Global Data Store
var allLenses = [];
var filteredLenses = [];
var selectedLens = null;
var eyes = 2;
var patientType = 'new';

// Column name map
var COL = {
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

// Friendly modality labels
var MODALITY_LABELS = {
  'daily-30':    'Daily - 30 Pack',
  'daily-90':    'Daily - 90 Pack',
  'biweekly-6':  'Bi-Weekly - 6 Pack',
  'biweekly-12': 'Bi-Weekly - 12 Pack',
  'monthly-2':   'Monthly - 2 Pack',
  'monthly-6':   'Monthly - 6 Pack',
  'monthly-12':  'Monthly - 12 Pack',
  'weekly-12':   'Weekly - 12 Pack',
  'weekly-27':   'Weekly - 27 Pack'
};

function friendlyModality(raw) {
  if (MODALITY_LABELS[raw]) {
    return MODALITY_LABELS[raw];
  }
  return raw;
}

// Format currency
function fmt(n) {
  if (isNaN(n) || n === null) {
    return 'N/A';
  }
  return '$' + Number(n).toFixed(2);
}

// Safe number parse
function num(val) {
  if (val === undefined || val === null) {
    return NaN;
  }
  var s = String(val).replace(/[^0-9.\-]/g, '');
  var n = parseFloat(s);
  if (isNaN(n)) {
    return NaN;
  }
  return n;
}

// Load default CSV
function loadDefaultCSV() {
  fetch('./data/contacts.csv')
    .then(function(r) {
      if (!r.ok) {
        throw new Error('CSV not found');
      }
      return r.text();
    })
    .then(function(text) {
      parseCSV(text);
    })
    .catch(function() {
      showUploadStatus('Could not load default CSV. Please upload one.', 'warn');
    });
}

// Parse CSV text
function parseCSV(text) {
  var result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: function(h) {
      return h.trim();
    }
  });

  if (!result.data || result.data.length === 0) {
    showUploadStatus('CSV appears empty or invalid.', 'error');
    return;
  }

  allLenses = result.data.map(function(row) {
    var clean = {};
    Object.keys(row).forEach(function(k) {
      var val = row[k];
      clean[k.trim()] = typeof val === 'string' ? val.trim() : val;
    });
    return clean;
  });

  buildFilters();
  buildFullTable(allLenses);
  showUploadStatus('Price list loaded - ' + allLenses.length + ' lenses.', 'success');
}

// Build filter dropdowns
function buildFilters() {
  var brands = [];
  var modalities = [];

  allLenses.forEach(function(l) {
    if (l[COL.brand] && brands.indexOf(l[COL.brand]) === -1) {
      brands.push(l[COL.brand]);
    }
    if (l[COL.modality] && modalities.indexOf(l[COL.modality]) === -1) {
      modalities.push(l[COL.modality]);
    }
  });

  brands.sort();
  modalities.sort();

  populateSelect('brandFilter',      brands,     'All Brands',      null);
  populateSelect('modalityFilter',   modalities, 'All Modalities',  friendlyModality);
  populateSelect('tableBrandFilter', brands,     'All Brands',      null);
}

function populateSelect(id, values, placeholder, labelFn) {
  var sel = document.getElementById(id);
  sel.innerHTML = '<option value="">' + placeholder + '</option>';
  values.forEach(function(v) {
    var opt = document.createElement('option');
    opt.value = v;
    opt.textContent = labelFn ? labelFn(v) : v;
    sel.appendChild(opt);
  });
}

// Get filtered lenses
function getFiltered() {
  var brand    = document.getElementById('brandFilter').value;
  var modality = document.getElementById('modalityFilter').value;
  var search   = document.getElementById('lensSearch').value.trim().toLowerCase();

  return allLenses.filter(function(l) {
    if (brand && l[COL.brand] !== brand) {
      return false;
    }
    if (modality && l[COL.modality] !== modality) {
      return false;
    }
    if (search && l[COL.lens].toLowerCase().indexOf(search) === -1) {
      return false;
    }
    return true;
  });
}

// Update search dropdown
function updateSearchDropdown() {
  var dropdown = document.getElementById('searchDropdown');
  var input    = document.getElementById('lensSearch').value.trim().toLowerCase();

  if (!input) {
    dropdown.classList.add('hidden');
    return;
  }

  filteredLenses = getFiltered();

  var seen = [];
  var uniqueNames = [];
  filteredLenses.forEach(function(l) {
    if (seen.indexOf(l[COL.lens]) === -1) {
      seen.push(l[COL.lens]);
      uniqueNames.push(l[COL.lens]);
    }
  });

  uniqueNames = uniqueNames.slice(0, 12);

  if (uniqueNames.length === 0) {
    dropdown.innerHTML = '<div class="dd-item dd-no-result">No lenses found</div>';
    dropdown.classList.remove('hidden');
    return;
  }

  var html = '';
  uniqueNames.forEach(function(name) {
    var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var highlighted = name.replace(
      new RegExp('(' + escaped + ')', 'gi'),
      '<mark>$1</mark>'
    );
    html += '<div class="dd-item" data-name="' + name + '">' + highlighted + '</div>';
  });

  dropdown.innerHTML = html;
  dropdown.classList.remove('hidden');

  var items = dropdown.querySelectorAll('.dd-item[data-name]');
  items.forEach(function(item) {
    item.addEventListener('click', function() {
      document.getElementById('lensSearch').value = item.dataset.name;
      dropdown.classList.add('hidden');
      selectLensByName(item.dataset.name);
    });
  });
}

// Select lens by name
function selectLensByName(name) {
  var matches = allLenses.filter(function(l) {
    return l[COL.lens] === name;
  });

  if (matches.length === 0) {
    return;
  }

  var modalityFilter = document.getElementById('modalityFilter').value;
  var scoped = modalityFilter
    ? matches.filter(function(l) { return l[COL.modality] === modalityFilter; })
    : matches;

  var pool = scoped.length > 0 ? scoped : matches;
  setSelectedLens(pool<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>);
}

// Set selected lens and render
function setSelectedLens(lens) {
  selectedLens = lens;

  document.getElementById('resultBrand').textContent    = lens[COL.brand]    || '';
  document.getElementById('resultModality').textContent = friendlyModality(lens[COL.modality]);
  document.getElementById('bcVal').textContent          = lens[COL.bc]       || 'N/A';
  document.getElementById('diamVal').textContent        = lens[COL.diam]     || 'N/A';
  document.getElementById('lpbVal').textContent         = lens[COL.lpb]      || 'N/A';
  document.getElementById('resultLensName').textContent = lens[COL.lens]     || '';

  document.getElementById('lensResult').classList.remove('hidden');
  document.getElementById('calculatorSection').classList.remove('hidden');

  calculate();

  setTimeout(function() {
    document.getElementById('calculatorSection')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Main calculate function
function calculate() {
  if (!selectedLens) {
    return;
  }

  var boxes        = parseInt(document.getElementById('boxQty').value) || 1;
  var retailPerBox = num(selectedLens[COL.retail]);
  var compPerBox   = num(selectedLens[COL.compBox]);

  var rebateAmt = patientType === 'new'
    ? num(selectedLens[COL.rebateNew])
    : num(selectedLens[COL.rebateExist]);

  var compRebateAmt = patientType === 'new'
    ? num(selectedLens[COL.compRebateNew])
    : num(selectedLens[COL.compRebateEx]);

  // Our pricing
  var ourGrossPerEye = isNaN(retailPerBox) ? NaN : retailPerBox * boxes;
  var ourGrossTotal  = isNaN(ourGrossPerEye) ? NaN : ourGrossPerEye * eyes;
  var rebateApplied  = isNaN(rebateAmt) ? 0 : rebateAmt;
  var ourNetTotal    = isNaN(ourGrossTotal) ? NaN : Math.max(0, ourGrossTotal - rebateApplied);

  // Competitor pricing
  var compGrossPerEye = isNaN(compPerBox) ? NaN : compPerBox * boxes;
  var compGrossTotal  = isNaN(compGrossPerEye) ? NaN : compGrossPerEye * eyes;
  var compRebate      = isNaN(compRebateAmt) ? 0 : compRebateAmt;
  var compNetTotal    = isNaN(compGrossTotal) ? NaN : Math.max(0, compGrossTotal - compRebate);

  // Update tiles
  document.getElementById('tileOurGross').textContent = fmt(ourGrossTotal);
  document.getElementById('tileRebate').textContent   = rebateApplied > 0 ? '-' + fmt(rebateApplied) : 'No Rebate';
  document.getElementById('tileOurNet').textContent   = fmt(ourNetTotal);
  document.getElementById('tileCompNet').textContent  = fmt(compNetTotal);

  var rebateSubText = rebateApplied > 0
    ? (patientType === 'new' ? 'New' : 'Existing') + ' patient rebate'
    : 'No rebate available';
  document.getElementById('tileRebateSub').textContent = rebateSubText;

  // Detail table rows
  var rows = [
    ['Price Per Box',   fmt(retailPerBox),  fmt(compPerBox)],
    ['Boxes (per eye)', boxes,              boxes],
    ['Eyes',            eyes,               eyes],
    ['Gross Total',     fmt(ourGrossTotal), fmt(compGrossTotal)],
    ['Rebate Applied',
      rebateApplied > 0 ? '-' + fmt(rebateApplied) : '-',
      compRebate > 0    ? '-' + fmt(compRebate)    : '-'],
    ['<strong>Net Total</strong>',
      '<strong>' + fmt(ourNetTotal)  + '</strong>',
      '<strong>' + fmt(compNetTotal) + '</strong>']
  ];

  var tbodyHtml = '';
  rows.forEach(function(row) {
    tbodyHtml += '<tr>';
    tbodyHtml += '<td>' + row<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a> + '</td>';
    tbodyHtml += '<td class="col-ours">' + row<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[1]</a> + '</td>';
    tbodyHtml += '<td class="col-comp">' + row<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[2]</a> + '</td>';
    tbodyHtml += '</tr>';
  });
  document.getElementById('detailBody').innerHTML = tbodyHtml;

  // Savings callout
  var callout = document.getElementById('savingsCallout');
  callout.classList.remove('hidden', 'savings-better', 'savings-worse', 'savings-same');

  if (!isNaN(ourNetTotal) && !isNaN(compNetTotal)) {
    var diff = compNetTotal - ourNetTotal;
    if (diff > 0.01) {
      callout.classList.add('savings-better');
      callout.innerHTML = '<i class="fa-solid fa-trophy"></i> <strong>We save the patient ' + fmt(diff) + '</strong> compared to 1-800 Contacts!';
    } else if (diff < -0.01) {
      callout.classList.add('savings-worse');
      callout.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 1-800 Contacts is ' + fmt(Math.abs(diff)) + ' less. Highlight our <strong>convenience, care and service!</strong>';
    } else {
      callout.classList.add('savings-same');
      callout.innerHTML = '<i class="fa-solid fa-equals"></i> Pricing is about the same. Emphasize our <strong>in-office expertise and service!</strong>';
    }
  } else {
    callout.classList.add('hidden');
  }

  // Rebate note
  var rebateNote     = document.getElementById('rebateNote');
  var rebateNoteText = document.getElementById('rebateNoteText');
  if (rebateApplied > 0) {
    rebateNote.classList.remove('hidden');
    rebateNoteText.textContent =
      'Rebate of ' + fmt(rebateApplied) + ' applies to an annual supply for a ' +
      patientType + ' patient. Patient submits rebate form after purchase.';
  } else {
    rebateNote.classList.add('hidden');
  }
}

// Build full price table
function buildFullTable(data) {
  var tbody = document.getElementById('priceTableBody');

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:#94a3b8;">No data available</td></tr>';
    return;
  }

  var html = '';
  data.forEach(function(l, i) {
    var brandClass = (l[COL.brand] || '').toLowerCase().replace(/[^a-z]/g, '');
    var rowClass   = i % 2 === 0 ? 'row-even' : 'row-odd';
    var rebNew  = num(l[COL.rebateNew])    > 0 ? fmt(num(l[COL.rebateNew]))    : '-';
    var rebEx   = num(l[COL.rebateExist])  > 0 ? fmt(num(l[COL.rebateExist]))  : '-';
    var cRebNew = num(l[COL.compRebateNew]) > 0 ? fmt(num(l[COL.compRebateNew])) : '-';
    var cRebEx  = num(l[COL.compRebateEx])  > 0 ? fmt(num(l[COL.compRebateEx]))  : '-';

    html += '<tr class="brand-row-' + brandClass + ' ' + rowClass + '">';
    html += '<td><span class="badge badge-brand badge-sm">' + (l[COL.brand] || '-') + '</span></td>';
    html += '<td class="lens-name-cell"><span class="lens-link" data-lens="' + (l[COL.lens] || '') + '" data-modality="' + (l[COL.modality] || '') + '">' + (l[COL.lens] || '-') + '</span></td>';
    html += '<td>' + friendlyModality(l[COL.modality] || '') + '</td>';
    html += '<td class="text-center">' + (l[COL.lpb]  || '-') + '</td>';
    html += '<td class="text-center">' + (l[COL.bc]   || '-') + '</td>';
    html += '<td class="text-center">' + (l[COL.diam] || '-') + '</td>';
    html += '<td class="text-right price-cell">'  + fmt(num(l[COL.retail]))  + '</td>';
    html += '<td class="text-right rebate-cell">' + rebNew  + '</td>';
    html += '<td class="text-right rebate-cell">' + rebEx   + '</td>';
    html += '<td class="text-right comp-cell">'   + fmt(num(l[COL.compBox])) + '</td>';
    html += '<td class="text-right comp-cell">'   + cRebNew + '</td>';
    html += '<td class="text-right comp-cell">'   + cRebEx  + '</td>';
    html += '</tr>';
  });

  tbody.innerHTML = html;

  // Click lens name to select it
  var links = tbody.querySelectorAll('.lens-link');
  links.forEach(function(link) {
    link.addEventListener('click', function() {
      var lensName = link.dataset.lens;
      var modality = link.dataset.modality;
      var match = null;
      allLenses.forEach(function(l) {
        if (l[COL.lens] === lensName && l[COL.modality] === modality) {
          match = l;
        }
      });
      if (match) {
        document.getElementById('lensSearch').value = lensName;
        document.getElementById('modalityFilter').value = modality;
        setSelectedLens(match);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

// Filter full table
function filterFullTable() {
  var search = document.getElementById('tableSearch').value.trim().toLowerCase();
  var brand  = document.getElementById('tableBrandFilter').value;

  var filtered = allLenses.filter(function(l) {
    if (brand && l[COL.brand] !== brand) {
      return false;
    }
    if (search) {
      var haystack = (
        (l[COL.lens]     || '') + ' ' +
        (l[COL.brand]    || '') + ' ' +
        (l[COL.modality] || '')
      ).toLowerCase();
      if (haystack.indexOf(search) === -1) {
        return false;
      }
    }
    return true;
  });

  buildFullTable(filtered);
}

// Show upload status message
function showUploadStatus(msg, type) {
  var el = document.getElementById('uploadStatus');
  el.textContent = msg;
  el.className   = 'upload-status upload-' + type;
  setTimeout(function() {
    el.textContent = '';
    el.className   = 'upload-status';
  }, 6000);
}

// Collapsible full table
function initCollapsible() {
  var header  = document.getElementById('tableToggleHeader');
  var wrapper = document.getElementById('fullTableWrapper');
  var chevron = document.getElementById('tableChevron');

  header.addEventListener('click', function() {
    var isHidden = wrapper.classList.toggle('hidden');
    chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
  });
}

// All event listeners
function initEvents() {

  // Brand filter
  document.getElementById('brandFilter').addEventListener('change', function() {
    document.getElementById('lensSearch').value = '';
    document.getElementById('searchDropdown').classList.add('hidden');
    selectedLens = null;
    document.getElementById('lensResult').classList.add('hidden');
    document.getElementById('calculatorSection').classList.add('hidden');
  });

  // Modality filter
  document.getElementById('modalityFilter').addEventListener('change', function() {
    if (selectedLens) {
      var name     = selectedLens[COL.lens];
      var modality = document.getElementById('modalityFilter').value;
      if (modality) {
        var match = null;
        allLenses.forEach(function(l) {
          if (l[COL.lens] === name && l[COL.modality] === modality) {
            match = l;
          }
        });
        if (match) {
          setSelectedLens(match);
        }
      }
    }
  });

  // Lens search input
  document.getElementById('lensSearch').addEventListener('input', updateSearchDropdown);
  document.getElementById('lensSearch').addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.getElementById('searchDropdown').classList.add('hidden');
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', function(e) {
    var search   = document.getElementById('lensSearch');
    var dropdown = document.getElementById('searchDropdown');
    if (!search.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // Eye toggle
  var eyeBtns = document.getElementById('eyeToggle').querySelectorAll('.btn-toggle');
  eyeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      eyeBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      eyes = parseInt(btn.dataset.value);
      calculate();
    });
  });

  // Patient type toggle
  var patientBtns = document.getElementById('patientToggle').querySelectorAll('.btn-toggle');
  patientBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      patientBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      patientType = btn.dataset.value;
      calculate();
    });
  });

  // Box quantity
  document.getElementById('boxQty').addEventListener('input', calculate);

  // CSV file upload
  document.getElementById('csvUpload').addEventListener('change', function(e) {
    var file = e.target.files<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>;
    if (!file) {
      return;
    }
    if (!file.name.endsWith('.csv')) {
      showUploadStatus('Please upload a .csv file only.', 'error');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(ev) {
      parseCSV(ev.target.result);
      selectedLens = null;
      document.getElementById('lensSearch').value = '';
      document.getElementById('lensResult').classList.add('hidden');
      document.getElementById('calculatorSection').classList.add('hidden');
    };
    reader.readAsText(file);
  });

  // Full table search and filter
  document.getElementById('tableSearch').addEventListener('input', filterFullTable);
  document.getElementById('tableBrandFilter').addEventListener('change', filterFullTable);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
  initEvents();
  initCollapsible();
  loadDefaultCSV();
});
