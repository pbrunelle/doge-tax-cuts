// Tax brackets and constants
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

const REVENUE_REDUCTION = {
  all: 111.3,
  top4: 0.5 * 57.3
};

// Utility functions
const formatCurrency = num => `$${Math.round(num).toLocaleString('en-US')}`;
const formatRate = rate => rate % 1 === 0 ? `${rate}%` : `${rate.toFixed(1)}%`;

// UI helper functions
function toggleButtonState(activeId, buttons) {
  buttons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    const isActive = btnId === activeId;
    btn.classList.replace(
      isActive ? 'bg-light-blue' : 'bg-selected-blue',
      isActive ? 'bg-selected-blue' : 'bg-light-blue'
    );
    btn.classList.replace(
      isActive ? 'text-dark-blue' : 'text-white',
      isActive ? 'text-white' : 'text-dark-blue'
    );
  });
}

// Core calculation functions
function calculateBracketTax(income, brackets) {
  let remaining = income, breakdown = [];
  
  brackets.forEach((bracket, index) => {
    if (income > bracket.min) {
      const taxable = Math.min(remaining, bracket.max - bracket.min);
      const tax = taxable * bracket.rate;
      breakdown.push({
        bracket: index + 1,
        range: `${bracket.min.toLocaleString()} - ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}`,
        taxable,
        rate: formatRate(bracket.rate * 100),
        tax
      });
      remaining -= taxable;
    }
  });
  return breakdown;
}

function adjustBrackets(brackets, savings, reductionType) {
  const rateReduction = savings / REVENUE_REDUCTION[reductionType] / 100;
  return brackets.map((b, index) => ({
    ...b,
    rate: (reductionType === 'all' || index >= 3) ? Math.max(b.rate - rateReduction, 0) : b.rate
  }));
}

// Event handlers
function setTaxCut(amount) {
  toggleButtonState(`btn${amount}`, ['btn20', 'btn100', 'btn1000']);
  document.getElementById('taxCut').value = amount;
  calculateTaxes();
}

function setMaritalStatus(status) {
  toggleButtonState(status, ['single', 'married']);
  calculateTaxes();
}

function setBrackets(type) {
  toggleButtonState(type, ['all', 'top4']);
  calculateTaxes();
}

function formatAndCalculate() {
  const income = document.getElementById('income').value;
  document.getElementById('incomeValue').textContent = formatCurrency(parseFloat(income));
  calculateTaxes();
}

function calculateTaxes() {
  const income = parseFloat(document.getElementById('income').value) || 0;
  const maritalStatus = document.querySelector('#single.bg-selected-blue') ? 'single' : 'married';
  const reductionType = document.querySelector('#all.bg-selected-blue') ? 'all' : 'top4';
  const taxCut = parseFloat(document.getElementById('taxCut').value);
  
  const brackets = TAX_BRACKETS[maritalStatus];
  const currentBreakdown = calculateBracketTax(income, brackets);
  const newBreakdown = calculateBracketTax(income, adjustBrackets(brackets, taxCut, reductionType));
  
  renderBreakdown(currentBreakdown, newBreakdown);
  updateSummary(currentBreakdown, newBreakdown, { income, taxCut, maritalStatus, reductionType });
}

function renderBreakdown(current, updated) {
  let html = "", totalTaxable = 0, totalCurrentTax = 0, totalNewTax = 0;
  current.forEach((cur, i) => {
    const nw = updated[i] || {};
    totalTaxable += cur.taxable;
    totalCurrentTax += cur.tax;
    totalNewTax += nw.tax || 0;
    html += `<h3 class="font-medium">Bracket ${cur.bracket}</h3>
      <div class="mt-3">
      <table class="breakdown-table">
        <colgroup>
          <col style="width: 50%;">
          <col style="width: 50%;">
        </colgroup>
        <tbody>
          <tr><th>Range</th><td>${cur.range}</td></tr>
          <tr><th>Taxable</th><td>${formatCurrency(cur.taxable)}</td></tr>
          <tr><th>Current Rate</th><td>${cur.rate}</td></tr>
          <tr><th>Current Tax</th><td>${formatCurrency(cur.tax)}</td></tr>
          <tr><th>Rate After Cut</th><td>${nw.rate || ''}</td></tr>
          <tr><th>Tax After Cut</th><td>${formatCurrency(nw.tax || 0)}</td></tr>
        </tbody>
      </table>`;
  });
  html += `<h3 class="font-medium">Total</h3>
    <div class="mt-3">
    <table class="breakdown-table">
      <colgroup>
        <col style="width: 50%;">
        <col style="width: 50%;">
      </colgroup>
      <tbody>
        <tr><th>Taxable</th><td>${formatCurrency(totalTaxable)}</td></tr>
        <tr><th>Current Tax</th><td>${formatCurrency(totalCurrentTax)}</td></tr>
        <tr><th>Tax After Cuts</th><td>${formatCurrency(totalNewTax)}</td></tr>
      </tbody>
    </table>`;
  document.getElementById('breakdownTable').innerHTML = html;
}

function updateSummary(current, updated, params) {
  const totalCurrentTax = current.reduce((sum, b) => sum + b.tax, 0);
  const totalNewTax = updated.reduce((sum, b) => sum + b.tax, 0);
  const savings = totalCurrentTax - totalNewTax;

  const summaryData = {
    savings: formatCurrency(savings),
    dogeCut: `$${params.taxCut}B`,
    taxBrackets: params.reductionType === 'all' ? 'all' : 'the top 4',
    maritalStatusText: params.maritalStatus,
    incomeText: formatCurrency(params.income),
    savingsText: formatCurrency(savings)
  };

  Object.entries(summaryData).forEach(([id, value]) => {
    document.getElementById(id).textContent = value;
  });
}

// Initialize
window.onload = () => {
  calculateTaxes();
  setMaritalStatus('married');
  setBrackets('all');
};

// Modal handling
const modal = document.getElementById('infoModal');
document.getElementById('infoBtn').onclick = () => modal.style.display = 'block';
document.getElementsByClassName('close')[0].onclick = () => modal.style.display = 'none';
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
