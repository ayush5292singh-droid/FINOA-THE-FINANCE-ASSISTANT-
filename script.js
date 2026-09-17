/* =========================================================
   FINOCA — SMART MONEY OS
   Offline-first finance manager
========================================================= */

const KEY="finoca_max_v2";

const defaultDB={
  premium:false,
  settings:{currency:"₹",name:"My Finance",theme:"midnight"},
  transactions:[],
  wallets:[
    {id:1,name:"Cash",balance:0,type:"Cash"},
    {id:2,name:"Bank",balance:0,type:"Bank"}
  ],
  budgets:[],
  savings:[],
  recurring:[],
  loans:[]
};

let db=load();
let currentPage="dashboard";

function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY));
    return x?merge(defaultDB,x):structuredClone(defaultDB);
  }catch(e){return structuredClone(defaultDB)}
}

function merge(a,b){
  return {
    ...structuredClone(a),...b,
    settings:{...a.settings,...(b.settings||{})},
    transactions:b.transactions||[],
    wallets:b.wallets||a.wallets,
    budgets:b.budgets||[],
    savings:b.savings||[],
    recurring:b.recurring||[],
    loans:b.loans||[]
  }
}

function save(){
  localStorage.setItem(KEY,JSON.stringify(db));
}

function money(n){
  return `${db.settings.currency}${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
}

function id(){
  return Date.now()+Math.floor(Math.random()*999);
}

function esc(s){
  return String(s??"").replace(/[&<>"']/g,m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function toast(t){
  const x=document.getElementById("toast");
  x.textContent=t;x.classList.add("show");
  setTimeout(()=>x.classList.remove("show"),2200);
}

function toggleSide(){
  document.getElementById("sidebar").classList.toggle("open");
}

document.querySelectorAll(".nav").forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    currentPage=b.dataset.page;
    render();
    if(innerWidth<700)toggleSide();
  }
});

function setHeader(title,sub){
  document.getElementById("pageTitle").textContent=title;
  document.getElementById("pageSub").textContent=sub||"Personal Financial Command Center";
}

function render(){
  const c=document.getElementById("content");
  const pages={
    dashboard:pageDashboard,
    transactions:pageTransactions,
    wallets:pageWallets,
    budgets:pageBudgets,
    savings:pageSavings,
    recurring:pageRecurring,
    scanner:pageScanner,
    loans:pageLoans,
    analytics:pageAnalytics,
    reports:pageReports,
    backup:pageBackup,
    settings:pageSettings
  };
  c.innerHTML=(pages[currentPage]||pageDashboard)();
  bindDynamic();
}

/* ================= DASHBOARD ================= */

function totals(){
  let income=0,expense=0;
  db.transactions.forEach(t=>{
    if(t.type==="income")income+=Number(t.amount);
    else expense+=Number(t.amount);
  });
  return {income,expense,balance:income-expense};
}

function pageDashboard(){
  setHeader("Dashboard","Personal Financial Command Center");
  const t=totals();
  const savingsRate=t.income?Math.max(0,((t.income-t.expense)/t.income)*100):0;

  return `
  <div class="hero">
    <h2>Welcome to FINOCA.</h2>
    <p>Track your money, understand your spending and stay ahead of your goals.</p>
    <div class="actions" style="margin-top:17px">
      <button class="btn primary" onclick="openTransaction()">+ Add transaction</button>
      <button class="btn" onclick="currentPage='scanner';render()">▤ Scan receipt</button>
      <button class="btn" onclick="showPremium()">◆ Explore Pro</button>
    </div>
  </div>

  <div class="grid grid4">
    <div class="card"><div class="statLabel">TOTAL BALANCE</div><div class="statValue">${money(t.balance)}</div></div>
    <div class="card"><div class="statLabel">TOTAL INCOME</div><div class="statValue green">${money(t.income)}</div></div>
    <div class="card"><div class="statLabel">TOTAL EXPENSE</div><div class="statValue red">${money(t.expense)}</div></div>
    <div class="card"><div class="statLabel">SAVINGS RATE</div><div class="statValue cyan">${savingsRate.toFixed(0)}%</div></div>
  </div>

  <div class="grid grid3" style="margin-top:15px">
    <div class="card">
      <div class="cardTitle"><b>Recent Transactions</b><button class="btn" onclick="go('transactions')">View all</button></div>
      ${recentTransactions(5)}
    </div>

    <div class="card">
      <div class="cardTitle"><b>Budget Status</b><span class="badge">${db.budgets.length} budgets</span></div>
      ${budgetMini()}
    </div>

    <div class="card">
      <div class="cardTitle"><b>Financial Snapshot</b></div>
      ${snapshot()}
    </div>
  </div>

  <div class="grid grid2" style="margin-top:15px">
    <div class="card">
      <div class="cardTitle"><b>Monthly Cash Flow</b><span class="badge">All data</span></div>
      ${miniChart()}
    </div>
    <div class="card">
      <div class="cardTitle"><b>Upcoming</b></div>
      ${upcoming()}
    </div>
  </div>`;
}

function recentTransactions(n){
  if(!db.transactions.length)return `<div class="empty">No transactions yet.<br><button class="btn primary" onclick="openTransaction()">Add your first one</button></div>`;
  return db.transactions.slice().reverse().slice(0,n).map(t=>`
    <div class="row">
      <div class="rowLeft">
        <div class="avatar">${t.type==="income"?"↑":"↓"}</div>
        <div><div class="rowTitle">${esc(t.title)}</div><div class="rowSub">${esc(t.category||"General")} · ${esc(t.date)}</div></div>
      </div>
      <div class="amount ${t.type==="income"?"green":"red"}">${t.type==="income"?"+":"-"}${money(t.amount)}</div>
    </div>`).join("");
}

function budgetMini(){
  if(!db.budgets.length)return `<div class="empty">Create a budget to monitor spending.</div>`;
  return db.budgets.slice(0,4).map(b=>{
    const spent=categorySpent(b.category);
    const p=Math.min(100,b.amount?spent/b.amount*100:0);
    return `<div style="margin-bottom:14px"><div class="row" style="padding:0;border:0"><span>${esc(b.category)}</span><span>${money(spent)} / ${money(b.amount)}</span></div><div class="progress"><i style="width:${p}%"></i></div></div>`;
  }).join("");
}

function snapshot(){
  const loan=db.loans.reduce((a,l)=>a+Number(l.remaining||l.amount||0),0);
  const goal=db.savings.reduce((a,s)=>a+Number(s.saved||0),0);
  return `
  <div class="row"><span class="muted">Wallets</span><b>${db.wallets.length}</b></div>
  <div class="row"><span class="muted">Savings</span><b class="green">${money(goal)}</b></div>
  <div class="row"><span class="muted">Loan balance</span><b class="red">${money(loan)}</b></div>
  <div class="row"><span class="muted">Recurring items</span><b>${db.recurring.length}</b></div>`;
}

function miniChart(){
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const vals=months.map((_,i)=>{
    const m=i+1;
    return db.transactions.filter(t=>new Date(t.date).getMonth()+1===m&&t.type==="expense")
      .reduce((a,t)=>a+Number(t.amount),0);
  });
  const max=Math.max(...vals,1);
  return `<div class="chart">${vals.map((v,i)=>`
    <div class="barWrap"><div class="bar" style="height:${Math.max(4,v/max*170)}px"></div><span>${months[i]}</span></div>
  `).join("")}</div>`;
}

function upcoming(){
  if(!db.recurring.length&&!db.loans.length)return `<div class="empty">No upcoming payments.</div>`;
  let a=[];
  db.recurring.forEach(r=>a.push({name:r.name,amount:r.amount,date:r.next}));
  db.loans.forEach(l=>a.push({name:`EMI · ${l.name}`,amount:l.emi,date:l.next}));
  return a.slice(0,5).map(x=>`<div class="row"><span>${esc(x.name)}<small class="rowSub">${esc(x.date||"Upcoming")}</small></span><b class="red">${money(x.amount)}</b></div>`).join("");
}

/* ================= TRANSACTIONS ================= */

function pageTransactions(){
  setHeader("Transactions","Income and expense history");
  return `
  <div class="card">
    <div class="cardTitle">
      <b>All Transactions</b>
      <button class="btn primary" onclick="openTransaction()">+ Add</button>
    </div>
    <input class="search" id="txSearch" placeholder="Search transactions..." oninput="filterTransactions()">
    <div id="txTable">${transactionTable()}</div>
  </div>`;
}

function transactionTable(){
  if(!db.transactions.length)return `<div class="empty">No transactions recorded.</div>`;
  return `<table><thead><tr><th>Date</th><th>Name</th><th>Category</th><th>Type</th><th>Amount</th><th></th></tr></thead><tbody>
  ${db.transactions.slice().reverse().map(t=>`
  <tr data-search="${esc((t.title+" "+t.category).toLowerCase())}">
    <td>${esc(t.date)}</td><td>${esc(t.title)}</td><td>${esc(t.category)}</td>
    <td><span class="badge">${t.type}</span></td>
    <td class="${t.type==="income"?"green":"red"}">${t.type==="income"?"+":"-"}${money(t.amount)}</td>
    <td><button class="btn danger" onclick="deleteTx(${t.id})">Delete</button></td>
  </tr>`).join("")}</tbody></table>`;
}

function filterTransactions(){
  const q=document.getElementById("txSearch").value.toLowerCase();
  document.querySelectorAll("#txTable tbody tr").forEach(r=>{
    r.style.display=r.dataset.search.includes(q)?"":"none";
  });
}

function openTransaction(prefill={}){
  openModal(`
    <div class="modalHead"><b>ADD TRANSACTION</b><button onclick="closeModal()">×</button></div>
    <form class="form" onsubmit="addTransaction(event)">
      <div class="formGrid">
        <label>Title<input name="title" value="${esc(prefill.title||"")}" required placeholder="e.g. Grocery"></label>
        <label>Amount<input name="amount" type="number" min="0" step="0.01" value="${esc(prefill.amount||"")}" required></label>
      </div>
      <div class="formGrid">
        <label>Type<select name="type"><option value="expense">Expense</option><option value="income">Income</option></select></label>
        <label>Category<select name="category">
          <option>Food</option><option>Transport</option><option>Shopping</option><option>Bills</option>
          <option>Education</option><option>Health</option><option>Entertainment</option><option>Salary</option><option>Other</option>
        </select></label>
      </div>
      <div class="formGrid">
        <label>Date<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
        <label>Wallet<select name="wallet">${db.wallets.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join("")}</select></label>
      </div>
      <label>Notes<textarea name="notes" placeholder="Optional notes"></textarea></label>
      <button class="btn primary">Save transaction</button>
    </form>`);
}

function addTransaction(e){
  e.preventDefault();
  const f=new FormData(e.target);
  const x=Object.fromEntries(f);
  x.id=id();x.amount=Number(x.amount);
  db.transactions.push(x);
  save();closeModal();toast("Transaction added");render();
}

function deleteTx(i){
  if(!confirm("Delete this transaction?"))return;
  db.transactions=db.transactions.filter(x=>x.id!==i);
  save();render();toast("Transaction deleted");
}

/* ================= WALLETS ================= */

function pageWallets(){
  setHeader("Wallets","Cash, bank and account balances");
  return `
  <div class="actions" style="margin-bottom:15px"><button class="btn primary" onclick="addWallet()">+ Add wallet</button></div>
  <div class="grid grid3">${db.wallets.map(w=>`
    <div class="card">
      <div class="cardTitle"><b>${esc(w.name)}</b><span class="badge">${esc(w.type)}</span></div>
      <div class="bigNumber">${money(w.balance)}</div>
      <p class="muted">${db.transactions.filter(t=>String(t.wallet)===String(w.id)).length} transactions</p>
      <button class="btn danger" onclick="deleteWallet(${w.id})">Delete</button>
    </div>`).join("")}</div>`;
}

function addWallet(){
  openModal(`
  <div class="modalHead"><b>NEW WALLET</b><button onclick="closeModal()">×</button></div>
  <form class="form" onsubmit="saveWallet(event)">
   <label>Name<input name="name" required placeholder="Cash / Bank / UPI"></label>
   <label>Type<select name="type"><option>Cash</option><option>Bank</option><option>Card</option><option>UPI</option><option>Other</option></select></label>
   <label>Opening balance<input name="balance" type="number" value="0"></label>
   <button class="btn primary">Create wallet</button>
  </form>`);
}
function saveWallet(e){
  e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  db.wallets.push({id:id(),name:f.name,type:f.type,balance:Number(f.balance)});
  save();closeModal();render();toast("Wallet created");
}
function deleteWallet(i){
  if(db.wallets.length<=1)return toast("Keep at least one wallet");
  db.wallets=db.wallets.filter(x=>x.id!==i);save();render();
}

/* ================= BUDGETS ================= */

function categorySpent(cat){
  return db.transactions.filter(t=>t.type==="expense"&&t.category===cat).reduce((a,t)=>a+Number(t.amount),0);
}

function pageBudgets(){
  setHeader("Budgets","Control spending by category");
  return `
  <div class="actions" style="margin-bottom:15px"><button class="btn primary" onclick="addBudget()">+ Create budget</button></div>
  <div class="grid grid2">${db.budgets.length?db.budgets.map(b=>{
    const spent=categorySpent(b.category),p=Math.min(100,spent/b.amount*100);
    return `<div class="card">
      <div class="cardTitle"><b>${esc(b.category)}</b><button class="btn danger" onclick="deleteBudget(${b.id})">Delete</button></div>
      <div class="row"><span>Spent</span><b>${money(spent)}</b></div>
      <div class="row"><span>Limit</span><b>${money(b.amount)}</b></div>
      <div class="progress"><i style="width:${p}%"></i></div>
      <small class="${p>100?"red":"muted"}">${p.toFixed(0)}% used</small>
    </div>`;
  }).join(""):`<div class="card empty">No budgets yet.</div>`}</div>`;
}

function addBudget(){
  openModal(`
  <div class="modalHead"><b>CREATE BUDGET</b><button onclick="closeModal()">×</button></div>
  <form class="form" onsubmit="saveBudget(event)">
   <label>Category<select name="category"><option>Food</option><option>Transport</option><option>Shopping</option><option>Bills</option><option>Education</option><option>Health</option><option>Entertainment</option><option>Other</option></select></label>
   <label>Monthly limit<input name="amount" type="number" min="1" required></label>
   <button class="btn primary">Create</button>
  </form>`);
}
function saveBudget(e){
  e.preventDefault();let f=Object.fromEntries(new FormData(e.target));
  db.budgets.push({id:id(),category:f.category,amount:Number(f.amount)});
  save();closeModal();render();toast("Budget created");
}
function deleteBudget(i){db.budgets=db.budgets.filter(x=>x.id!==i);save();render()}

/* ================= SAVINGS ================= */

function pageSavings(){
  setHeader("Savings Goals","Build towards what matters");
  return `
  <div class="actions" style="margin-bottom:15px"><button class="btn primary" onclick="addSaving()">+ New goal</button></div>
  <div class="grid grid2">${db.savings.length?db.savings.map(s=>{
    const p=Math.min(100,s.target?s.saved/s.target*100:0);
    return `<div class="card">
      <div class="cardTitle"><b>${esc(s.name)}</b><button class="btn danger" onclick="deleteSaving(${s.id})">Delete</button></div>
      <div class="bigNumber">${money(s.saved)}</div>
      <p class="muted">Target ${money(s.target)}</p>
      <div class="progress"><i style="width:${p}%"></i></div>
      <div class="row"><span>${p.toFixed(0)}% complete</span><button class="btn" onclick="addSavingMoney(${s.id})">+ Add money</button></div>
    </div>`;
  }).join(""):`<div class="card empty">Create your first savings goal.</div>`}</div>`;
}

function addSaving(){
  openModal(`
  <div class="modalHead"><b>NEW SAVINGS GOAL</b><button onclick="closeModal()">×</button></div>
  <form class="form" onsubmit="saveSaving(event)">
   <label>Goal name<input name="name" required placeholder="New laptop"></label>
   <label>Target amount<input name="target" type="number" required></label>
   <label>Already saved<input name="saved" type="number" value="0"></label>
   <button class="btn primary">Create goal</button>
  </form>`);
}
function saveSaving(e){
  e.preventDefault();let f=Object.fromEntries(new FormData(e.target));
  db.savings.push({id:id(),name:f.name,target:Number(f.target),saved:Number(f.saved)});
  save();closeModal();render();
}
function addSavingMoney(i){
  const s=db.savings.find(x=>x.id===i);
  const n=prompt("Amount to add:", "500");
  if(n===null)return;
  s.saved+=Number(n)||0;save();render();toast("Savings updated");
}
function deleteSaving(i){db.savings=db.savings.filter(x=>x.id!==i);save();render()}

/* ================= RECURRING ================= */

function pageRecurring(){
  setHeader("Recurring","Never forget regular payments");
  return `
  <div class="actions" style="margin-bottom:15px"><button class="btn primary" onclick="addRecurring()">+ Add recurring</button></div>
  <div class="card">${db.recurring.length?db.recurring.map(r=>`
    <div class="row">
      <div class="rowLeft"><div class="avatar">↻</div><div><div class="rowTitle">${esc(r.name)}</div><div class="rowSub">${esc(r.frequency)} · Next ${esc(r.next)}</div></div></div>
      <div><b class="red">${money(r.amount)}</b> <button class="btn danger" onclick="deleteRecurring(${r.id})">×</button></div>
    </div>`).join(""):`<div class="empty">No recurring payments.</div>`}</div>`;
}

function addRecurring(){
  openModal(`
  <div class="modalHead"><b>RECURRING PAYMENT</b><button onclick="closeModal()">×</button></div>
  <form class="form" onsubmit="saveRecurring(event)">
   <label>Name<input name="name" required placeholder="Netflix / Rent / EMI"></label>
   <div class="formGrid">
    <label>Amount<input name="amount" type="number" required></label>
    <label>Frequency<select name="frequency"><option>Monthly</option><option>Weekly</option><option>Yearly</option></select></label>
   </div>
   <label>Next payment<input name="next" type="date" required></label>
   <button class="btn primary">Save</button>
  </form>`);
}
function saveRecurring(e){
  e.preventDefault();let f=Object.fromEntries(new FormData(e.target));
  db.recurring.push({id:id(),name:f.name,amount:Number(f.amount),frequency:f.frequency,next:f.next});
  save();closeModal();render();
}
function deleteRecurring(i){db.recurring=db.recurring.filter(x=>x.id!==i);save();render()}

/* ================= SCANNER ================= */

function pageScanner(){
  setHeader("Receipt Scanner","Turn receipt information into an expense");
  return `
  <div class="grid grid2">
    <div class="card">
      <div class="cardTitle"><b>Receipt Scanner</b><span class="badge">${db.premium?"PRO":"FREE"}</span></div>
      <p class="muted">Choose a receipt image. The app prepares a transaction form from the information you enter.</p>
      <input id="receiptFile" type="file" accept="image/*" onchange="receiptSelected(event)">
      <div id="receiptPreview" style="margin-top:14px"></div>
      <button class="btn primary" style="margin-top:12px" onclick="receiptForm()">Create expense from receipt</button>
    </div>

    <div class="card ${db.premium?"":"locked"}">
      <div class="cardTitle"><b>Premium Smart Scan</b></div>
      <div class="row"><span>Merchant detection</span><b class="green">✓</b></div>
      <div class="row"><span>Item extraction</span><b class="green">✓</b></div>
      <div class="row"><span>Tax recognition</span><b class="green">✓</b></div>
      <div class="row"><span>Automatic categorisation</span><b class="green">✓</b></div>
      ${!db.premium?`<button class="btn primary" onclick="showPremium()">Unlock Pro</button>`:""}
    </div>
  </div>`;
}

function receiptSelected(e){
  const file=e.target.files[0];if(!file)return;
  const url=URL.createObjectURL(file);
  document.getElementById("receiptPreview").innerHTML=`<img src="${url}" style="width:100%;max-height:250px;object-fit:contain;border-radius:12px">`;
  toast("Receipt loaded");
}

function receiptForm(){
  if(!db.premium){
    toast("Basic receipt entry opened");
  }
  openTransaction({title:"Receipt expense"});
}

/* ================= LOANS ================= */

function pageLoans(){
  setHeader("Loans & EMI","Track debt, EMI progress and remaining balance");
  const total=db.loans.reduce((a,l)=>a+Number(l.amount),0);
  const remaining=db.loans.reduce((a,l)=>a+Number(l.remaining),0);
  return `
  <div class="grid grid3" style="margin-bottom:15px">
    <div class="card"><span class="statLabel">TOTAL BORROWED</span><div class="statValue">${money(total)}</div></div>
    <div class="card"><span class="statLabel">REMAINING</span><div class="statValue red">${money(remaining)}</div></div>
    <div class="card"><span class="statLabel">PAID DOWN</span><div class="statValue green">${money(total-remaining)}</div></div>
  </div>
  <button class="btn primary" onclick="addLoan()" style="margin-bottom:15px">+ Add loan</button>
  <div class="grid grid2">${db.loans.length?db.loans.map(l=>{
    const paid=Math.max(0,l.amount-l.remaining);
    const p=l.amount?Math.min(100,paid/l.amount*100):0;
    return `<div class="card">
      <div class="cardTitle"><b>${esc(l.name)}</b><button class="btn danger" onclick="deleteLoan(${l.id})">Delete</button></div>
      <div class="row"><span>Original amount</span><b>${money(l.amount)}</b></div>
      <div class="row"><span>EMI</span><b>${money(l.emi)}</b></div>
      <div class="row"><span>Remaining</span><b class="red">${money(l.remaining)}</b></div>
      <div class="progress"><i style="width:${p}%"></i></div>
      <div class="row"><span>${p.toFixed(0)}% completed</span><button class="btn primary" onclick="payEMI(${l.id})">Pay EMI</button></div>
      <small class="muted">Next EMI: ${esc(l.next||"Not set")}</small>
    </div>`;
  }).join(""):`<div class="card empty">No loans added.</div>`}</div>`;
}

function addLoan(){
  openModal(`
  <div class="modalHead"><b>ADD LOAN</b><button onclick="closeModal()">×</button></div>
  <form class="form" onsubmit="saveLoan(event)">
   <label>Loan name<input name="name" required placeholder="Education / Car / Personal"></label>
   <div class="formGrid">
    <label>Original amount<input name="amount" type="number" required></label>
    <label>Current remaining<input name="remaining" type="number" required></label>
   </div>
   <div class="formGrid">
    <label>EMI amount<input name="emi" type="number" required></label>
    <label>Next EMI<input name="next" type="date"></label>
   </div>
   <button class="btn primary">Save loan</button>
  </form>`);
}

function saveLoan(e){
  e.preventDefault();let f=Object.fromEntries(new FormData(e.target));
  db.loans.push({id:id(),name:f.name,amount:Number(f.amount),remaining:Number(f.remaining),emi:Number(f.emi),next:f.next});
  save();closeModal();render();toast("Loan added");
}

function payEMI(i){
  const l=db.loans.find(x=>x.id===i);
  if(!l)return;
  l.remaining=Math.max(0,l.remaining-l.emi);
  if(l.next){
    const d=new Date(l.next);d.setMonth(d.getMonth()+1);
    l.next=d.toISOString().slice(0,10);
  }
  save();render();toast(`EMI paid · ${money(l.emi)}`);
}
function deleteLoan(i){db.loans=db.loans.filter(x=>x.id!==i);save();render()}

/* ================= ANALYTICS ================= */

function pageAnalytics(){
  setHeader("Analytics","Understand where your money goes");
  const t=totals();
  const cats={};
  db.transactions.filter(x=>x.type==="expense").forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount));
  const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  const max=sorted[0]?.[1]||1;

  return `
  <div class="grid grid4">
    <div class="card"><span class="statLabel">INCOME</span><div class="statValue green">${money(t.income)}</div></div>
    <div class="card"><span class="statLabel">EXPENSE</span><div class="statValue red">${money(t.expense)}</div></div>
    <div class="card"><span class="statLabel">NET CASH FLOW</span><div class="statValue cyan">${money(t.income-t.expense)}</div></div>
    <div class="card"><span class="statLabel">TRANSACTIONS</span><div class="statValue">${db.transactions.length}</div></div>
  </div>
  <div class="grid grid2" style="margin-top:15px">
    <div class="card">
      <div class="cardTitle"><b>Spending by Category</b></div>
      ${sorted.length?sorted.map(([c,v])=>`
       <div style="margin:15px 0">
        <div class="row" style="padding:0;border:0"><span>${esc(c)}</span><b>${money(v)}</b></div>
        <div class="progress"><i style="width:${v/max*100}%"></i></div>
       </div>`).join(""):`<div class="empty">Add expenses to see analytics.</div>`}
    </div>
    <div class="card">
      <div class="cardTitle"><b>Monthly Expense Trend</b></div>
      ${miniChart()}
    </div>
  </div>`;
}

/* ================= REPORTS ================= */

function pageReports(){
  setHeader("Reports","Professional financial summaries");
  return `
  <div class="grid grid2">
   <div class="card">
    <div class="cardTitle"><b>Financial Report</b><span class="badge">${db.premium?"PRO":"FREE"}</span></div>
    <p class="muted">Generate a clean summary from your FINOCA data.</p>
    <button class="btn primary" onclick="generateReport()">Generate report</button>
   </div>
   <div class="card ${db.premium?"":"locked"}">
    <div class="cardTitle"><b>Premium Reports</b></div>
    <div class="row"><span>Annual summary</span><b>✓</b></div>
    <div class="row"><span>Category analysis</span><b>✓</b></div>
    <div class="row"><span>Loan report</span><b>✓</b></div>
    <div class="row"><span>Savings report</span><b>✓</b></div>
    ${!db.premium?`<button class="btn primary" onclick="showPremium()">Unlock Pro</button>`:""}
   </div>
  </div>`;
}

function generateReport(){
  const t=totals();
  const text=`FINOCA FINANCIAL REPORT

Income: ${money(t.income)}
Expenses: ${money(t.expense)}
Net: ${money(t.income-t.expense)}

Transactions: ${db.transactions.length}
Wallets: ${db.wallets.length}
Budgets: ${db.budgets.length}
Savings goals: ${db.savings.length}
Loans: ${db.loans.length}

Generated: ${new Date().toLocaleString()}`;
  download("finoca-report.txt",text);
  toast("Report generated");
}

/* ================= BACKUP ================= */

function pageBackup(){
  setHeader("Backup & Restore","Keep your FINOCA data safe");
  return `
  <div class="grid grid2">
    <div class="card">
      <div class="cardTitle"><b>Backup</b></div>
      <p class="muted">Download all your FINOCA data as a JSON backup.</p>
      <button class="btn primary" onclick="backup()">Download backup</button>
    </div>
    <div class="card">
      <div class="cardTitle"><b>Restore</b></div>
      <p class="muted">Restore a previous FINOCA JSON backup.</p>
      <input type="file" accept=".json,application/json" onchange="restore(event)">
    </div>
  </div>`;
}

function backup(){
  download("finoca-backup.json",JSON.stringify(db,null,2));
  toast("Backup downloaded");
}

function restore(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      db=merge(defaultDB,JSON.parse(r.result));save();render();toast("Backup restored");
    }catch(err){toast("Invalid backup file")}
  };
  r.readAsText(file);
}

/* ================= SETTINGS ================= */

function pageSettings(){
  setHeader("Settings","Control your FINOCA experience");
  return `
  <div class="grid grid2">
    <div class="card">
      <div class="cardTitle"><b>General</b></div>
      <form class="form" onsubmit="saveSettings(event)">
       <label>Profile name<input name="name" value="${esc(db.settings.name)}"></label>
       <label>Currency<select name="currency">
        <option ${db.settings.currency==="₹"?"selected":""}>₹</option>
        <option ${db.settings.currency==="$"?"selected":""}>$</option>
        <option ${db.settings.currency==="€"?"selected":""}>€</option>
        <option ${db.settings.currency==="£"?"selected":""}>£</option>
       </select></label>
       <button class="btn primary">Save settings</button>
      </form>
    </div>
    <div class="card">
      <div class="cardTitle"><b>FINOCA Pro</b></div>
      <div class="premiumBox">
       <div class="proIcon">◆</div>
       <h2>${db.premium?"PRO ACTIVE":"Unlock FINOCA PRO"}</h2>
       <div class="price">₹99<span style="font-size:14px">/month</span></div>
       <p class="muted">Advanced tools, reports and deeper financial insights.</p>
       <button class="btn primary" onclick="showPremium()">${db.premium?"View Pro":"Upgrade"}</button>
      </div>
    </div>
  </div>`;
}

function saveSettings(e){
  e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  db.settings.name=f.name;db.settings.currency=f.currency;
  save();render();toast("Settings saved");
}

/* ================= PREMIUM ================= */

function showPremium(){
  openModal(`
  <div class="modalHead"><b>FINOCA PRO</b><button onclick="closeModal()">×</button></div>
  <div class="premiumBox">
   <div class="proIcon">◆</div>
   <h2>${db.premium?"PRO IS ACTIVE":"Upgrade to FINOCA PRO"}</h2>
   <div class="price">₹99<span style="font-size:14px">/month</span></div>
   <p class="muted">Unlock the advanced side of FINOCA.</p>
   <div class="row"><span>Advanced receipt workflow</span><b>✓</b></div>
   <div class="row"><span>Advanced analytics</span><b>✓</b></div>
   <div class="row"><span>Loan & EMI insights</span><b>✓</b></div>
   <div class="row"><span>Professional reports</span><b>✓</b></div>
   <div class="row"><span>Advanced budget insights</span><b>✓</b></div>
   <div class="row"><span>Premium dashboard tools</span><b>✓</b></div>
   ${
     db.premium
     ? `<button class="btn" onclick="closeModal()">Close</button>`
     : `<button class="btn primary" onclick="activateDemoPro()">Activate Pro Demo</button>
        <p style="font-size:10px;color:var(--muted)">Payment integration should be connected to a real billing provider before publishing paid subscriptions.</p>`
   }
  </div>`);
}

function activateDemoPro(){
  db.premium=true;save();closeModal();toast("FINOCA Pro activated");render();
}

/* ================= MODAL / UTILS ================= */

function openModal(html){
  document.getElementById("modalBox").innerHTML=html;
  document.getElementById("modal").classList.add("show");
}
function closeModal(){
  document.getElementById("modal").classList.remove("show");
}
document.getElementById("modal").addEventListener("click",e=>{
  if(e.target.id==="modal")closeModal();
});

function go(page){
  currentPage=page;
  document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  render();
}

function download(name,text){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type:"text/plain"}));
  a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function bindDynamic(){}

/* Start */
render();
