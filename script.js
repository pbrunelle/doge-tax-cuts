// 2025 tax brackets - https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2025
const TAX_BRACKETS = {
  single: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 }
  ],
  married: [
    { min: 0, max: 23850, rate: 0.10 },
    { min: 23850, max: 96950, rate: 0.12 },
    { min: 96950, max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 }
  ]
};

const REVENUE_REDUCTION_PER_PERCENT_ALL = 111.3;
const REVENUE_REDUCTION_PER_PERCENT_TOP4 = 0.5 * 57.3;

function calculateBracketTax(income, brackets) {
  let remaining = income;
  let breakdown = [];
  let index = 1;
  
  for (const bracket of brackets) {
    if (income > bracket.min) {
      const taxable = Math.min(remaining, bracket.max - bracket.min);
      const tax = taxable * bracket.rate;
      breakdown.push({
        bracket: index,
        range: `${bracket.min.toLocaleString()} - ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}`,
        taxable,
        rate: formatRate(bracket.rate * 100),
        tax
      });
      remaining -= taxable;
      index++;
      if (remaining <= 0) break;
    }
  }
  return breakdown;
}

function adjustBrackets(brackets, savings, reductionType) {
  const rateReduction = reductionType === 'all' 
    ? savings / REVENUE_REDUCTION_PER_PERCENT_ALL / 100 
    : savings / REVENUE_REDUCTION_PER_PERCENT_TOP4 / 100;

  return brackets.map((b, index) => ({
    min: b.min,
    max: b.max,
    rate: reductionType === 'all' || index >= 3 ? Math.max(b.rate - rateReduction, 0) : b.rate
  }));
}

function formatRate(rate) {
  return rate % 1 === 0 ? `${rate}%` : `${rate.toFixed(1)}%`;
}

function setTaxCut(amount, device) {
  document.querySelectorAll('[id^="btn"]').forEach(btn => {
    btn.classList.replace('bg-selected-blue','bg-light-blue');
    btn.classList.replace('text-white','text-dark-blue');
  });
  document.querySelectorAll(`[id="btn${amount}Desktop"], [id="btn${amount}Mobile"]`).forEach(button => {
    button.classList.remove('bg-light-blue', 'text-dark-blue');
    button.classList.add('bg-selected-blue', 'text-white');
  });
  document.querySelectorAll(`[id="taxCutDesktop"], [id="taxCutMobile"]`).forEach(widget => {
    widget.value = amount;
  });
  calculateTaxes(device);
}

function renderBreakdownTable(currentBreakdown, newBreakdown, device) {
  const dev = device[0].toUpperCase() + device.slice(1);
  const table = document.getElementById(`breakdownTable${dev}`);
  let html = `
    <thead>
      <tr>
        <th>Bracket</th>
        <th>Range</th>
        <th>Taxable</th>
        <th class="current-cell">Rate (Current)</th>
        <th class="current-cell">Tax (Current)</th>
        <th class="new-cell">Rate (New)</th>
        <th class="new-cell">Tax (New)</th>
      </tr>
    </thead>
    <tbody>
  `;

  let totalTaxable = 0;
  let totalCurrentTax = 0;
  let totalNewTax = 0;

  currentBreakdown.forEach((cur, i) => {
    const nw = newBreakdown[i] || {};
    totalTaxable += cur.taxable;
    totalCurrentTax += cur.tax;
    totalNewTax += nw.tax || 0;

    html += `
      <tr>
        <td>${cur.bracket}</td>
        <td>${cur.range}</td>
        <td>$${Math.round(cur.taxable).toLocaleString('en-US')}</td>
        <td class="current-cell">${cur.rate}</td>
        <td class="current-cell">$${Math.round(cur.tax).toLocaleString('en-US')}</td>
        <td class="new-cell">${nw.rate || ''}</td>
        <td class="new-cell">$${Math.round(nw.tax || 0).toLocaleString('en-US')}</td>
      </tr>
    `;
  });

  html += `
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" class="text-right font-medium">Total</td>
        <td>$${Math.round(totalTaxable).toLocaleString('en-US')}</td>
        <td class="current-cell"></td>
        <td class="current-cell">$${Math.round(totalCurrentTax).toLocaleString('en-US')}</td>
        <td class="new-cell"></td>
        <td class="new-cell">$${Math.round(totalNewTax).toLocaleString('en-US')}</td>
      </tr>
    </tfoot>
  `;

  table.innerHTML = html;
  return { totalCurrentTax, totalNewTax };
}

function renderBreakdownTableMobile(currentBreakdown, newBreakdown) {
  let html = "", totalTaxable = 0, totalCurrentTax = 0, totalNewTax = 0;
  currentBreakdown.forEach((cur, i) => {
    const nw = newBreakdown[i] || {};
    totalTaxable += cur.taxable;
    totalCurrentTax += cur.tax;
    totalNewTax += nw.tax || 0;
    html += `<h3 class="font-medium">Bracket ${cur.bracket}</h3>
      <div class="mt-3">
      <table class="breakdown-table-mobile">
        <colgroup>
          <col style="width: 50%;">
          <col style="width: 50%;">
        </colgroup>
        <tbody>
          <tr><th>Range</th><td>${cur.range}</td></tr>
          <tr><th>Taxable</th><td>$${Math.round(cur.taxable).toLocaleString('en-US')}</td></tr>
          <tr><th>Current Rate</th><td>${cur.rate}</td></tr>
          <tr><th>Current Tax</th><td>$${Math.round(cur.tax).toLocaleString('en-US')}</td></tr>
          <tr><th>Rate After Cut</th><td>${nw.rate || ''}</td></tr>
          <tr><th>Tax After Cut</th><td>$${Math.round(nw.tax||0).toLocaleString('en-US')}</td></tr>
        </tbody>
      </table>`;
  });
  html += `<h3 class="font-medium">Total</h3>
    <div class="mt-3">
    <table class="breakdown-table-mobile">
      <colgroup>
        <col style="width: 50%;">
        <col style="width: 50%;">
      </colgroup>
      <tbody>
        <tr><th>Taxable</th><td>$${Math.round(totalTaxable).toLocaleString('en-US')}</td></tr>
        <tr><th>Current Tax</th><td>$${Math.round(totalCurrentTax).toLocaleString('en-US')}</td></tr>
        <tr><th>Tax After Cuts</th><td>$${Math.round(totalNewTax).toLocaleString('en-US')}</td></tr>
      </tbody>
    </table>`;
  document.getElementById('breakdownTableMobile').innerHTML = html;
  return { totalCurrentTax, totalNewTax };
}

function formatAndCalculate(device) { formatIncome(device); calculateTaxes(device); }

function formatIncome(device) {
  const dev = device[0].toUpperCase() + device.slice(1);
  const value = document.getElementById(`income${dev}`).value;
  document.getElementById(`incomeValue${dev}`).textContent = `$${parseFloat(value).toLocaleString('en-US')}`;
}

function setMaritalStatus(status, device) {
  if (device === 'mobile') {
    document.querySelectorAll('#singleMobile, #marriedMobile').forEach(btn => {
      btn.classList.replace('bg-selected-blue','bg-light-blue');
      btn.classList.replace('text-white','text-dark-blue');
    });
    document.getElementById(`${status}Mobile`).classList.replace('bg-light-blue','bg-selected-blue');
    document.getElementById(`${status}Mobile`).classList.replace('text-dark-blue','text-white');
    // Sync desktop
    document.getElementById('maritalStatusDesktop').value = status;
  }
  calculateTaxes(device);
}

function setBrackets(bracket, device) {
  if (device === 'mobile') {
    document.querySelectorAll('#allMobile, #top4Mobile').forEach(btn => {
      btn.classList.replace('bg-selected-blue','bg-light-blue');
      btn.classList.replace('text-white','text-dark-blue');
    });
    document.getElementById(`${bracket}Mobile`).classList.replace('bg-light-blue','bg-selected-blue');
    document.getElementById(`${bracket}Mobile`).classList.replace('text-dark-blue','text-white');
    // Sync desktop
    document.getElementById('taxReductionDesktop').value = bracket;
  }
  calculateTaxes(device);
}

function calculateTaxes(device) {
  const dev = device[0].toUpperCase() + device.slice(1);
  const income = parseFloat(document.getElementById(`income${dev}`).value) || 0;
  let maritalStatus, reductionType;
  if (device === 'desktop') {
    maritalStatus = document.getElementById(`maritalStatus${dev}`).value;
    reductionType = document.getElementById(`taxReduction${dev}`).value;
  } else {
    maritalStatus = document.querySelector('#singleMobile.bg-selected-blue') ? 'single' : 'married';
    reductionType = document.querySelector('#allMobile.bg-selected-blue') ? 'all' : 'top4';
  }
  const selectedBrackets = TAX_BRACKETS[maritalStatus];
  const taxCut = parseFloat(document.getElementById(`taxCut${dev}`).value);
  
  const currentBreakdown = calculateBracketTax(income, selectedBrackets);
  const newBreakdown = calculateBracketTax(income, adjustBrackets(selectedBrackets, taxCut, reductionType));
  
  const { totalCurrentTax, totalNewTax } = renderBreakdownTable(currentBreakdown, newBreakdown, device);
  renderBreakdownTableMobile(currentBreakdown, newBreakdown);

  document.getElementById("currentTaxDesktop").textContent = 
    `$${Math.round(totalCurrentTax).toLocaleString('en-US')}`;
  document.getElementById("newTaxDesktop").textContent = 
    `$${Math.round(totalNewTax).toLocaleString('en-US')}`;
  document.getElementById("savingsDesktop").textContent = 
    `$${Math.round(totalCurrentTax - totalNewTax).toLocaleString('en-US')}`;

  document.getElementById("savingsMobile").textContent = 
    `$${Math.round(totalCurrentTax - totalNewTax).toLocaleString('en-US')}`;
}

// Synchronize Income: update the counterpart on input change
document.getElementById('incomeDesktop').addEventListener('input', function() {
  if(document.getElementById('incomeMobile').value !== this.value) {
    document.getElementById('incomeMobile').value = this.value;
    document.getElementById('incomeValueMobile').textContent = `$${parseFloat(this.value).toLocaleString('en-US')}`;
  }
});
document.getElementById('incomeMobile').addEventListener('input', function() {
  if(document.getElementById('incomeDesktop').value !== this.value) {
    document.getElementById('incomeDesktop').value = this.value;
    document.getElementById('incomeValueDesktop').textContent = `$${parseFloat(this.value).toLocaleString('en-US')}`;
  }
});

// Synchronize Marital Status: update mobile when desktop changes
document.getElementById('maritalStatusDesktop').addEventListener('change', function() {
  const status = this.value;
  if(status === 'single') {
    document.getElementById('singleMobile').classList.replace('bg-light-blue','bg-selected-blue');
    document.getElementById('singleMobile').classList.replace('text-dark-blue','text-white');
    document.getElementById('marriedMobile').classList.replace('bg-selected-blue','bg-light-blue');
    document.getElementById('marriedMobile').classList.replace('text-white','text-dark-blue');
  } else {
    document.getElementById('marriedMobile').classList.replace('bg-light-blue','bg-selected-blue');
    document.getElementById('marriedMobile').classList.replace('text-dark-blue','text-white');
    document.getElementById('singleMobile').classList.replace('bg-selected-blue','bg-light-blue');
    document.getElementById('singleMobile').classList.replace('text-white','text-dark-blue');
  }
  calculateTaxes('desktop');
});

// Synchronize Tax Reduction: update mobile when desktop changes
document.getElementById('taxReductionDesktop').addEventListener('change', function() {
  const reduction = this.value;
  if(reduction === 'all'){
    document.getElementById('allMobile').classList.replace('bg-light-blue','bg-selected-blue');
    document.getElementById('allMobile').classList.replace('text-dark-blue','text-white');
    document.getElementById('top4Mobile').classList.replace('bg-selected-blue','bg-light-blue');
    document.getElementById('top4Mobile').classList.replace('text-white','text-dark-blue');
  } else {
    document.getElementById('top4Mobile').classList.replace('bg-light-blue','bg-selected-blue');
    document.getElementById('top4Mobile').classList.replace('text-dark-blue','text-white');
    document.getElementById('allMobile').classList.replace('bg-selected-blue','bg-light-blue');
    document.getElementById('allMobile').classList.replace('text-white','text-dark-blue');
  }
  calculateTaxes('desktop');
});

// Initialize calculations on page load
window.onload = () => {
  calculateTaxes('desktop');
  setMaritalStatus('married', 'mobile');
  setBrackets('all', 'mobile');
};

// Get the modal
var modal = document.getElementById("infoModal");

// Get the button that opens the modal
var btn = document.getElementById("infoBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
