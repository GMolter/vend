// admin-v2.js

// inline console‐hook in index.html captures these logs
console.log('🔥 admin-v2.js loaded');

// Firebase init
const cfg = {
  apiKey: "AIzaSyB3rahMcbUqRAetLoEKwwTDKf89I2sn85Y",
  authDomain: "cyberflashvend.firebaseapp.com",
  databaseURL: "https://cyberflashvend-default-rtdb.firebaseio.com/",
  projectId: "cyberflashvend",
  storageBucket: "cyberflashvend.firebasestorage.app",
  messagingSenderId: "63786658773",
  appId: "1:63786658773:web:7792d3693ef45e9ec4eb5c"
};
console.log('Initializing Firebase…');
firebase.initializeApp(cfg);
const db = firebase.database();
console.log('Firebase ready');

// snack slots lookup
const SNACK_SLOTS = [
  { slot:"C2", name:"Chips"       },
  { slot:"E1", name:"Cookies"     },
  { slot:"E2", name:"Pretzels"    },
  { slot:"E3", name:"Candy Bar"   },
  { slot:"E4", name:"Granola Bar" },
  { slot:"E5", name:"Trail Mix"   }
];

// storage for search
window._dates = [];
window._users = [];

// fire immediately
console.log('Calling fetchRecent() & fetchBrowse()');
fetchRecent();
fetchBrowse();

// Recent 6
function fetchRecent(){
  console.log('fetchRecent() start');
  db.ref('Logs').orderByKey().limitToLast(6).once('value')
    .then(snap=>{
      console.log('fetchRecent snap:', snap.val());
      const rc = document.getElementById('recentContainer');
      rc.innerHTML = '';
      const rows = [];
      snap.forEach(day=>{
        const date = day.key.replace(/-/g,'/');
        day.forEach(ls=>{
          const l = ls.val();
          const items = (''+l.Payload).split(',')
            .filter(x=>x)
            .map(i=> SNACK_SLOTS[+i-1]?.name || `#${i}`);
          rows.push({ date, time: l.Time.replace(/s.*$/,''), user: l.User, items });
        });
      });
      rows.reverse().forEach(e=>{
        const d = document.createElement('div');
        d.className = 'recent-card';
        d.innerHTML = `
          <p class="time">${e.date} ${e.time}</p>
          <p>User: ${e.user}</p>
          <p>Items: ${e.items.join(', ')}</p>`;
        rc.appendChild(d);
      });
      if(rows.length>6){
        const mb = document.getElementById('moreBtn');
        mb.style.display='inline-block';
        mb.onclick = ()=> document.getElementById('browseWrapper')
                              .scrollIntoView({behavior:'smooth'});
      }
    })
    .catch(err=>console.error('fetchRecent error:', err));
}

// Browse last 30 days
function fetchBrowse(){
  console.log('fetchBrowse() start');
  db.ref('Logs').orderByKey().limitToLast(30).once('value')
    .then(snap=>{
      console.log('fetchBrowse snap keys:', Object.keys(snap.val()||{}));
      const dc = document.getElementById('datesContainer');
      const uc = document.getElementById('usersContainer');
      dc.innerHTML = ''; uc.innerHTML = '';
      const users={}, keys=[];
      snap.forEach(day=>{
        keys.push(day.key);
        day.forEach(ls=> users[ls.val().User]=true);
      });
      window._dates = keys.slice();
      window._users = Object.keys(users).slice();
      // dates
      keys.sort((a,b)=>b.localeCompare(a)).forEach(dk=>{
        const c = document.createElement('div');
        c.className='date-card';
        c.innerHTML=`<span>${dk.replace(/-/g,'/')}</span>`;
        c.onclick = ()=>openDateModal(dk);
        dc.appendChild(c);
      });
      // users
      window._users.sort().forEach(u=>{
        const c = document.createElement('div');
        c.className='user-card';
        c.innerHTML=`<span>${u}</span>`;
        c.onclick = ()=>openUserModal(u);
        uc.appendChild(c);
      });
    })
    .catch(err=>console.error('fetchBrowse error:', err));
}

// search on Enter
document.getElementById('searchInput')
  .addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      const q=e.target.value.trim();
      if(q) openSearchModal(q);
    }
  });

// Search Modal
window.openSearchModal = function(q){
  console.log('openSearchModal:', q);
  closeModal();
  const md=document.getElementById('searchModal'),
        bd=document.getElementById('searchModalBody'),
        tt=document.getElementById('searchModalTitle'),
        bp=document.getElementById('modalBackdrop');
  tt.textContent=`Search: "${q}"`;
  bd.innerHTML='Searching…';
  bp.style.display='block'; md.style.display='block';
  const ql=q.toLowerCase();
  let html='';
  const mD = window._dates.filter(dk=>dk.replace(/-/g,'/').includes(ql));
  console.log('search dates:', mD);
  if(mD.length) html+='<h4>Dates</h4>'+mD.map(dk=>
    `<button class="btn" onclick="openDateModal('${dk}')">${dk.replace(/-/g,'/')}</button>`
  ).join('');
  const mU = window._users.filter(u=>u.toLowerCase().includes(ql));
  console.log('search users:', mU);
  if(mU.length) html+='<h4>Users</h4>'+mU.map(u=>
    `<button class="btn" onclick="openUserModal('${u}')">${u}</button>`
  ).join('');
  bd.innerHTML = html||'<p>No matches found.</p>';
};

// Date Modal
window.openDateModal = function(dk){
  console.log('openDateModal:', dk);
  closeModal();
  const md=document.getElementById('dateModal'),
        bd=document.getElementById('dateModalBody'),
        tt=document.getElementById('dateModalTitle'),
        bp=document.getElementById('modalBackdrop');
  tt.textContent=`Transactions on ${dk.replace(/-/g,'/')}`;
  bd.innerHTML='Loading…';
  bp.style.display='block'; md.style.display='block';
  firebase.database().ref(`Logs/${dk}`).once('value')
    .then(snap=>{
      console.log('date snap:', snap.val());
      const html=Object.values(snap.val()||{}).map(l=>{
        const items=(l.Payload+'').split(',')
          .filter(x=>x)
          .map(i=>SNACK_SLOTS[+i-1]?.name||`#${i}`);
        return `<div class="txn-card">
          <p><strong>${l.Time.replace(/s.*$/,'')}</strong> — ${l.User}</p>
          <p>Items: ${items.join(', ')}</p>
        </div>`;
      }).join('');
      bd.innerHTML=html||'<p>No Transactions</p>';
    })
    .catch(e=>{ console.error(e); bd.innerHTML='<p style="color:red;">Error</p>'; });
};

// User Modal
window.openUserModal = function(u){
  console.log('openUserModal:', u);
  closeModal();
  const md=document.getElementById('userModal'),
        bd=document.getElementById('userModalBody'),
        tt=document.getElementById('userModalTitle'),
        bp=document.getElementById('modalBackdrop');
  tt.textContent=`User “${u}”`;
  bd.innerHTML='Loading…';
  bp.style.display='block'; md.style.display='block';
  firebase.database().ref('Logs').orderByKey().limitToLast(30).once('value')
    .then(snap=>{
      console.log('user snap keys:', Object.keys(snap.val()||{}));
      const dates=new Set();
      snap.forEach(day=>{
        Object.values(day.val()).forEach(l=>{ if(l.User===u) dates.add(day.key); });
      });
      console.log('user dates:', Array.from(dates));
      if(!dates.size) bd.innerHTML='<p>No Transactions</p>';
      else bd.innerHTML=Array.from(dates)
        .sort((a,b)=>b.localeCompare(a))
        .map(dk=>`<button class="btn" onclick="openDateModal('${dk}')">${dk.replace(/-/g,'/')}</button>`)
        .join('');
    })
    .catch(e=>{ console.error(e); bd.innerHTML='<p style="color:red;">Error</p>'; });
};

// close all
function closeModal(){
  document.getElementById('modalBackdrop').style.display='none';
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
}
