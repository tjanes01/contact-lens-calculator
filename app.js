/* Contact Lens Calculator */

var allLenses = [];
var selectedLens = null;
var eyes = 2;
var patientType = 'new';

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
  if (!raw) { return ''; }
  if (MODALITY_LABELS[raw]) { return MODALITY_LABELS[raw]; }
  return raw;
}

function fmt(n) {
  if (isNaN(n) || n === null) { return 'N/A'; }
  return '$' + Number(n).toFixed(2);
}

function num(val) {
  if (val === undefined || val === null) { return NaN; }
  var s = String(val).replace(/[^0-9.\-]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

function showUploadStatus(msg, type) {
  var el = document.getElementById('uploadStatus');
  if (!el) { return; }
  el.textContent = msg;
  el.className = 'upload-status upload-' + type;
  setTimeout(function() {
    el.textContent = '';
    el.className = 'upload-status';
  }, 6000);
}

function populateSelect(id, values, placeholder, labelFn) {
  var sel = document.getElementById(id);
  if (!sel) { return; }
  sel.innerHTML = '<option value="">' + placeholder + '</option>';
  for (var i = 0; i < values.length; i++) {
    var opt = document.createElement('option');
    opt.value = values[i];
    opt.textContent = labelFn ? labelFn(values[i]) : values[i];
    sel.appendChild(opt);
  }
}

function buildFilters() {
  var brands = [];
  var modalities = [];
  for (var i = 0; i < allLenses.length; i++) {
    var l = allLenses[i];
    if (l[COL.brand] && brands.indexOf(l[COL.brand]) === -1) {
      brands.push(l[COL.brand]);
    }
    if (l[COL.modality] && modalities.indexOf(l[COL.modality]) === -1) {
      modalities.push(l[COL.modality]);
    }
  }
  brands.sort();
  modalities.sort();
  populateSelect('brandFilter',      brands,     'All Brands',     null);
  populateSelect('modalityFilter',   modalities, 'All Modalities', friendlyModality);
  populateSelect('tableBrandFilter', brands,     'All Brands',     null);
}

function buildFullTable(data) {
  var tbody = document.getElementById('priceTableBody');
  if (!tbody) { return; }
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;">No data available</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < data.length; i++) {
    var l = data[i];
    var rowClass = i % 2 === 0 ? 'row-even' : 'row-odd';
    var rebNew  = num(l[COL.rebateNew])     > 0 ? fmt(num(l[COL.rebateNew]))     : '-';
    var rebEx   = num(l[COL.rebateExist])   > 0 ? fmt(num(l[COL.rebateExist]))   : '-';
    var cRebNew = num(l[COL.compRebateNew]) > 0 ? fmt(num(l[COL.compRebateNew])) : '-';
    var cRebEx  = num(l[COL.compRebateEx])  > 0 ? fmt(num(l[COL.compRebateEx]))  : '-';
    html += '<tr class="' + rowClass + '">';
    html += '<td><span class="badge badge-brand badge-sm">' + (l[COL.brand] || '-') + '</span></td>';
    html += '<td class="lens-name-cell"><span class="lens-link" data-lens="' + (l[COL.lens] || '') + '" data-modality="' + (l[COL.modality] || '') + '">' + (l[COL.lens] || '-') + '</span></td>';
    html += '<td>' + friendlyModality(l[COL.modality] || '') + '</td>';
    html += '<td class="text-center">' + (l[COL.lpb]  || '-') + '</td>';
    html += '<td class="text-center">' + (l[COL.bc]   || '-') + '</td>';
    html += '<td class="text-center">' + (l[COL.diam] || '-') + '</td>';
    html += '<td class="text-right price-cell">'  + fmt(num(l[COL.retail]))   + '</td>';
    html += '<td class="text-right rebate-cell">' + rebNew  + '</td>';
    html += '<td class="text-right rebate-cell">' + rebEx   + '</td>';
    html += '<td class="text-right comp-cell">'   + fmt(num(l[COL.compBox])) + '</td>';
    html += '<td class="text-right comp-cell">'   + cRebNew + '</td>';
    html += '<td class="text-right comp-cell">'   + cRebEx  + '</td>';
    html += '</tr>';
  }
  tbody.innerHTML = html;
  attachTableLinkEvents();
}

function attachTableLinkEvents() {
  var links = document.querySelectorAll('.lens-link');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function() {
      var lensName = this.dataset.lens;
      var modality = this.dataset.modality;
      var match = null;
      for (var j = 0; j < allLenses.length; j++) {
        if (allLenses[j][COL.lens] === lensName && allLenses[j][COL.modality] === modality) {
          match = allLenses[j];
          break;
        }
      }
      if (match) {
        document.getElementById('lensSearch').value = lensName;
        document.getElementById('modalityFilter').value = modality;
        setSelectedLens(match);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}

function parseCSV(text) {
  var result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: function(h) { return h.trim(); }
  });
  if (!result.data || result.data.length === 0) {
    showUploadStatus('CSV appears empty or invalid.', 'error');
    return;
  }
  allLenses = [];
  for (var i = 0; i < result.data.length; i++) {
    var row = result.data[i];
    var clean = {};
    var keys = Object.keys(row);
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j].trim();
      var v = row[keys[j]];
      clean[k] = typeof v === 'string' ? v.trim() : v;
    }
    allLenses.push(clean);
  }
  buildFilters();
  buildFullTable(allLenses);
  showUploadStatus('Price list loaded - ' + allLenses.length + ' lenses.', 'success');
}

function loadDefaultCSV() {
  fetch('./data/contacts.csv')
    .then(function(response) {
      if (!response.ok) {
        throw new Error('File not found: ' + response.status);
      }
      return response.text();
    })
    .then(function(text) {
      parseCSV(text);
    })
    .catch(function(err) {
      console.log('CSV load error: ' + err.message);
      showUploadStatus('Could not load CSV. Please use Upload CSV button.', 'warn');
    });
}

function getFiltered() {
  var brand    = document.getElementById('brandFilter').value;
  var modality = document.getElementById('modalityFilter').value;
  var search   = document.getElementById('lensSearch').value.trim().toLowerCase();
  var results  = [];
  for (var i = 0; i < allLenses.length; i++) {
    var l = allLenses[i];
    if (brand && l[COL.brand] !== brand) { continue; }
    if (modality && l[COL.modality] !== modality) { continue; }
    if (search && (l[COL.lens] || '').toLowerCase().indexOf(search) === -1) { continue; }
    results.push(l);
  }
  return results;
}

function updateSearchDropdown() {
  var dropdown = document.getElementById('searchDropdown');
  var input    = document.getElementById('lensSearch').value.trim().toLowerCase();
  if (!input) {
    dropdown.classList.add('hidden');
    return;
  }
  var filtered = getFiltered();
  var seen = [];
  var uniqueNames = [];
  for (var i = 0; i < filtered.length; i++) {
    var name = filtered[i][COL.lens];
    if (seen.indexOf(name) === -1) {
      seen.push(name);
      uniqueNames.push(name);
    }
    if (uniqueNames.length >= 12) { break; }
  }
  if (uniqueNames.length === 0) {
    dropdown.innerHTML = '<div class="dd-item dd-no-result">No lenses found</div>';
    dropdown.classList.remove('hidden');
    return;
  }

  // Build dropdown items using mousedown instead of click
  // This fires BEFORE the input loses focus, fixing the blur/click race condition
  dropdown.innerHTML = '';
  for (var i = 0; i < uniqueNames.length; i++) {
    (function(lensName) {
      var div = document.createElement('div');
      div.className = 'dd-item';
      div.dataset.name = lensName;
      div.textContent = lensName;
      div.addEventListener('mousedown', function(e) {
        // preventDefault stops the input from losing focus before we handle the click
        e.preventDefault();
        document.getElementById('lensSearch').value = lensName;
        dropdown.classList.add('hidden');
        selectLensByName(lensName);
      });
      dropdown.appendChild(div);
    })(uniqueNames[i]);
  }
  dropdown.classList.remove('hidden');
}

function selectLensByName(name) {
  var matches = [];
  for (var i = 0; i < allLenses.length; i++) {
    if (allLenses[i][COL.lens] === name) {
      matches.push(allLenses[i]);
    }
  }
  if (matches.length === 0) { return; }
  var modalityVal = document.getElementById('modalityFilter').value;
  var scoped = [];
  if (modalityVal) {
    for (var i = 0; i < matches.length; i++) {
      if (matches[i][COL.modality] === modalityVal) {
        scoped.push(matches[i]);
      }
    }
  }
  var pool = scoped.length > 0 ? scoped : matches;
  setSelectedLens(pool<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>);
}

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
    document.getElementById('calculatorSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function calculate() {
  if (!selectedLens) { return; }
  var boxes        = parseInt(document.getElementById('boxQty').value) || 1;
  var retailPerBox = num(selectedLens[COL.retail]);
  var compPerBox   = num(selectedLens[COL.compBox]);
  var rebateAmt    = patientType === 'new'
                       ? num(selectedLens[COL.rebateNew])
                       : num(selectedLens[COL.rebateExist]);
  var compRebAmt   = patientType === 'new'
                       ? num(selectedLens[COL.compRebateNew])
                       : num(selectedLens[COL.compRebateEx]);
  var ourGross     = isNaN(retailPerBox) ? NaN : retailPerBox * boxes * eyes;
  var rebate       = isNaN(rebateAmt)    ? 0   : rebateAmt;
  var ourNet       = isNaN(ourGross)     ? NaN : Math.max(0, ourGross - rebate);
  var compGross    = isNaN(compPerBox)   ? NaN : compPerBox  * boxes * eyes;
  var compRebate   = isNaN(compRebAmt)   ? 0   : compRebAmt;
  var compNet      = isNaN(compGross)    ? NaN : Math.max(0, compGross - compRebate);

  document.getElementById('tileOurGross').textContent = fmt(ourGross);
  document.getElementById('tileRebate').textContent   = rebate > 0 ? '-' + fmt(rebate) : 'No Rebate';
  document.getElementById('tileOurNet').textContent   = fmt(ourNet);
  document.getElementById('tileCompNet').textContent  = fmt(compNet);
  document.getElementById('tileRebateSub').textContent = rebate > 0
    ? (patientType === 'new' ? 'New' : 'Existing') + ' patient rebate'
    : 'No rebate available';

  var rows = [
    ['Price Per Box',             fmt(retailPerBox),               fmt(compPerBox)],
    ['Boxes (per eye)',           String(boxes),                   String(boxes)],
    ['Eyes',                      String(eyes),                    String(eyes)],
    ['Gross Total',               fmt(ourGross),                   fmt(compGross)],
    ['Rebate Applied',            rebate     > 0 ? '-' + fmt(rebate)     : '-',
                                  compRebate > 0 ? '-' + fmt(compRebate) : '-'],
    ['<strong>Net Total</strong>','<strong>' + fmt(ourNet)  + '</strong>',
                                  '<strong>' + fmt(compNet) + '</strong>']
  ];

  var tbodyHtml = '';
  for (var i = 0; i < rows.length; i++) {
    tbodyHtml += '<tr>';
    tbodyHtml += '<td>'               + rows[i]<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a> + '</td>';
    tbodyHtml += '<td class="col-ours">' + rows[i]<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[1]</a> + '</td>';
    tbodyHtml += '<td class="col-comp">' + rows[i]<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[2]</a> + '</td>';
    tbodyHtml += '</tr>';
  }
  document.getElementById('detailBody').innerHTML = tbodyHtml;

  var callout = document.getElementById('savingsCallout');
  callout.classList.remove('hidden', 'savings-better', 'savings-worse', 'savings-same');
  if (!isNaN(ourNet) && !isNaN(compNet)) {
    var diff = compNet - ourNet;
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

  var rebateNote     = document.getElementById('rebateNote');
  var rebateNoteText = document.getElementById('rebateNoteText');
  if (rebate > 0) {
    rebateNote.classList.remove('hidden');
    rebateNoteText.textContent = 'Rebate of ' + fmt(rebate) + ' applies to an annual supply for a '
      + patientType + ' patient. Patient submits rebate form after purchase.';
  } else {
    rebateNote.classList.add('hidden');
  }
}

function filterFullTable() {
  var search = document.getElementById('tableSearch').value.trim().toLowerCase();
  var brand  = document.getElementById('tableBrandFilter').value;
  var filtered = [];
  for (var i = 0; i < allLenses.length; i++) {
    var l = allLenses[i];
    if (brand && l[COL.brand] !== brand) { continue; }
    if (search) {
      var haystack = (
        (l[COL.lens]      || '') + ' ' +
        (l[COL.brand]     || '') + ' ' +
        (l[COL.modality]  || '')
      ).toLowerCase();
      if (haystack.indexOf(search) === -1) { continue; }
    }
    filtered.push(l);
  }
  buildFullTable(filtered);
}

function initCollapsible() {
  var header  = document.getElementById('tableToggleHeader');
  var wrapper = document.getElementById('fullTableWrapper');
  var chevron = document.getElementById('tableChevron');
  if (!header || !wrapper || !chevron) { return; }
  header.addEventListener('click', function() {
    var isHidden = wrapper.classList.toggle('hidden');
    chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
  });
}

function initEvents() {
  document.getElementById('brandFilter').addEventListener('change', function() {
    document.getElementById('lensSearch').value = '';
    document.getElementById('searchDropdown').classList.add('hidden');
    selectedLens = null;
    document.getElementById('lensResult').classList.add('hidden');
    document.getElementById('calculatorSection').classList.add('hidden');
  });

  document.getElementById('modalityFilter').addEventListener('change', function() {
    if (selectedLens) {
      var name     = selectedLens[COL.lens];
      var modality = document.getElementById('modalityFilter').value;
      if (modality) {
        for (var i = 0; i < allLenses.length; i++) {
          if (allLenses[i][COL.lens] === name && allLenses[i][COL.modality] === modality) {
            setSelectedLens(allLenses[i]);
            break;
          }
        }
      }
    }
  });

  document.getElementById('lensSearch').addEventListener('input', updateSearchDropdown);

  document.getElementById('lensSearch').addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.getElementById('searchDropdown').classList.add('hidden');
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    var search   = document.getElementById('lensSearch');
    var dropdown = document.getElementById('searchDropdown');
    if (search && dropdown && !search.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  var eyeBtns = document.getElementById('eyeToggle').querySelectorAll('.btn-toggle');
  for (var i = 0; i < eyeBtns.length; i++) {
    eyeBtns[i].addEventListener('click', function() {
      for (var j = 0; j < eyeBtns.length; j++) { eyeBtns[j].classList.remove('active'); }
      this.classList.add('active');
      eyes = parseInt(this.dataset.value);
      calculate();
    });
  }

  var patientBtns = document.getElementById('patientToggle').querySelectorAll('.btn-toggle');
  for (var i = 0; i < patientBtns.length; i++) {
    patientBtns[i].addEventListener('click', function() {
      for (var j = 0; j < patientBtns.length; j++) { patientBtns[j].classList.remove('active'); }
      this.classList.add('active');
      patientType = this.dataset.value;
      calculate();
    });
  }

  document.getElementById('boxQty').addEventListener('input', calculate);

  document.getElementById('csvUpload').addEventListener('change', function(e) {
    var file = e.target.files<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>;
    if (!file) { return; }
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

  document.getElementById('tableSearch').addEventListener('input', filterFullTable);
  document.getElementById('tableBrandFilter').addEventListener('change', filterFullTable);
}

document.addEventListener('DOMContentLoaded', function() {
  initEvents();
  initCollapsible();
  loadDefaultCSV();
});
