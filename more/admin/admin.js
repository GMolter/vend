// disable touch-scroll
document.addEventListener('touchmove', e=>e.preventDefault(),{passive:false});

// hook console to miniConsole
(function(){
  const orig = console;
  const mc = document.getElementById("miniConsole");
  function logToMini(type, args){
    const d = document.createElement("div");
    d.textContent = `[${type}] ${Array.from(args).join(" ")}`;
    mc.appendChild(d);
    mc.scrollTop = mc.scrollHeight;
  }
  console.log = function(){ logToMini("LOG", arguments); orig.log.apply(console,arguments); };
  console.warn = function(){ logToMini("WARN", arguments); orig.warn.apply(console,arguments); };
  console.error = function(){ logToMini("ERR", arguments); orig.error.apply(console,arguments); };
})();

document.addEventListener('DOMContentLoaded', ()=>{
  console.log("🛠️ Admin panel loading…");

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
  firebase.initializeApp(cfg);
  const db = firebase.database();

  const SNACK_SLOTS = [
    { slot:"C2", name:"Chips"       },
    { slot:"E1", name:"Cookies"     },
    { slot:"E2", name:"Pretzels"    },
    { slot:"E3", name:"Candy Bar"   },
    { slot:"E4", name:"Granola Bar" },
    { slot:"E5", name:"Trail Mix"   }
  ];

  // 1) fetch & render recent 6
  db.ref('Logs')
    .orderByKey()
    .limitToLast(6)
    .once('value')
    .then(snap => {
      const entries = [];
      snap.forEach(daySnap => {
        const dateKey = daySnap.key;
        daySnap.forEach(logSnap => {
          const log = logSnap.val();
          const ids = (''+log.Payload).split(',').filter(x=>x);
          const items = ids.map(i=>{
            const idx = parseInt(i,10)-1;
            return SNACK_SLOTS[idx]?.name||`#${i}`;
          });
          entries.push({
            displayDate: dateKey.replace(/-/g,'/'),
            time: log.Time.replace(/s.*$/,''),
            user: log.User,
            items
          });
        });
      });
      const rc = document.getElementById('recentContainer');
      rc.innerHTML = '';
      entries.reverse().forEach(e=>{
        const c = document.createElement('div');
        c.className = 'recent-card';
        c.innerHTML = `
          <p class="time">${e.displayDate} ${e.time}</p>
          <p>User: ${e.user}</p>
          <p>Items: ${e.items.join(', ')}</p>
        `;
        rc.appendChild(c);
      });
      if(entries.length>6){
        const mb = document.getElementById('moreBtn');
        mb.style.display = 'inline-block';
        mb.onclick = ()=> document.getElementById('browseWrapper').scrollIntoView({behavior:'smooth'});
      }
    })
    .catch(err=> console.error("Failed loading recent:", err));

  // 2) fetch date-keys & users for Browse
  db.ref('Logs').once('value')
    .then(snap => {
      const entriesByUser = {};
      const datesContainer = document.getElementById('datesContainer');
      const usersContainer = document.getElementById('usersContainer');
      const dateKeys = [];
      snap.forEach(daySnap => {
        dateKeys.push(daySnap.key);
        daySnap.forEach(logSnap => {
          const u = logSnap.val().User;
          entriesByUser[u] = entriesByUser[u]||new Set();
          entriesByUser[u].add(daySnap.key);
        });
      });
      datesContainer.innerHTML = '';
      dateKeys.sort((a,b)=>b.localeCompare(a)).forEach(dateKey=>{
        const display = dateKey.replace(/-/g,'/');
        const card = document.createElement('div');
        card.className = 'date-card';
        card.innerHTML = `<span>${display}</span>`;
        card.onclick = ()=> openDateModal(dateKey);
        datesContainer.appendChild(card);
      });
      usersContainer.innerHTML = '';
      Object.keys(entriesByUser).sort().forEach(user=>{
        const card = document.createElement('div');
        card.className = 'user-card';
        card.innerHTML = `<span>${user}</span>`;
        card.onclick = ()=> openUserModal(user);
        usersContainer.appendChild(card);
      });
    })
    .catch(err=> console.error("Failed loading browse:", err));
});

function closeModal(){
  document.getElementById('modalBackdrop').style.display='none';
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
}

function openDateModal(dateKey){
  const backdrop = document.getElementById('modalBackdrop');
  const modal    = document.getElementById('dateModal');
  const title    = document.getElementById('dateModalTitle');
  const body     = document.getElementById('dateModalBody');
  title.textContent = `Transactions on ${dateKey.replace(/-/g,'/')}`;
  body.innerHTML = 'Loading…';
  backdrop.style.display = 'block';
  modal.style.display = 'block';

  firebase.database()
    .ref(`Logs/${dateKey}`)
    .once('value')
    .then(daySnap => {
      const logs = daySnap.val()||{};
      const html = Object.values(logs).map(log=>{
        const ids = (''+log.Payload).split(',').filter(x=>x);
        const items = ids.map(i=>{
          const idx = parseInt(i,10)-1;
          return SNACK_SLOTS[idx]?.name||`#${i}`;
        });
        return `
          <div class="txn-card">
            <p><strong>${log.Time.replace(/s.*$/,'')}</strong> — ${log.User}</p>
            <p>Items: ${items.join(', ')}</p>
          </div>
        `;
      }).join('');
      body.innerHTML = html || '<p>No Transactions</p>';
    })
    .catch(err=>{
      body.innerHTML = `<p style="color:red;">Error loading data</p>`;
      console.error("Date modal error:", err);
    });
}

function openUserModal(user){
  const backdrop = document.getElementById('modalBackdrop');
  const modal    = document.getElementById('userModal');
  const title    = document.getElementById('userModalTitle');
  const body     = document.getElementById('userModalBody');
  title.textContent = `User “${user}”`;
  body.innerHTML = 'Loading…';
  backdrop.style.display = 'block';
  modal.style.display = 'block';

  firebase.database()
    .ref('Logs')
    .once('value')
    .then(snap => {
      const userDates = new Set();
      snap.forEach(daySnap => {
        daySnap.forEach(logSnap => {
          if (logSnap.val().User === user) {
            userDates.add(daySnap.key);
          }
        });
      });
      if (!userDates.size) {
        body.innerHTML = '<p>No Transactions</p>';
      } else {
        body.innerHTML = Array.from(userDates)
          .sort((a,b)=>b.localeCompare(a))
          .map(dk => {
            return `<button class="btn" style="margin:4px;"
                      onclick="openDateModal('${dk}')">${dk.replace(/-/g,'/')}</button>`;
          }).join('');
      }
    })
    .catch(err=>{
      body.innerHTML = `<p style="color:red;">Error loading user data</p>`;
      console.error("User modal error:", err);
    });
}
