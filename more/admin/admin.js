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

  // Recent 6
  db.ref('Logs')
    .orderByKey()
    .limitToLast(6)
    .once('value')
    .then(snap => {
      const rc = document.getElementById('recentContainer');
      rc.innerHTML = '';
      const tmp = [];
      snap.forEach(daySnap => {
        const date = daySnap.key.replace(/-/g,'/');
        daySnap.forEach(logSnap => {
          const log = logSnap.val();
          const items = (''+log.Payload).split(',').filter(x=>x)
            .map(i=>SNACK_SLOTS[parseInt(i,10)-1]?.name||`#${i}`);
          tmp.push({ date, time: log.Time.replace(/s.*$/,''), user: log.User, items });
        });
      });
      tmp.reverse().forEach(e=>{
        const div = document.createElement('div');
        div.className = 'recent-card';
        div.innerHTML = `
          <p class="time">${e.date} ${e.time}</p>
          <p>User: ${e.user}</p>
          <p>Items: ${e.items.join(', ')}</p>
        `;
        rc.appendChild(div);
      });
      if(tmp.length > 6){
        const mb = document.getElementById('moreBtn');
        mb.style.display = 'inline-block';
        mb.onclick = ()=> document.getElementById('browseWrapper').scrollIntoView({behavior:'smooth'});
      }
    })
    .catch(err=> console.error("Recent load error:", err));

  // Browse last 30 days
  const DAYS = 30;
  db.ref('Logs')
    .orderByKey()
    .limitToLast(DAYS)
    .once('value')
    .then(snap => {
      const datesC = document.getElementById('datesContainer');
      const usersC = document.getElementById('usersContainer');
      datesC.innerHTML = '';
      usersC.innerHTML = '';
      const users = {};
      const keys = [];
      snap.forEach(daySnap => {
        const dk = daySnap.key;
        keys.push(dk);
        daySnap.forEach(ls=> users[ls.val().User]=true);
      });
      // date cards
      keys.sort((a,b)=>b.localeCompare(a)).forEach(dk=>{
        const card = document.createElement('div');
        card.className = 'date-card';
        const disp = dk.replace(/-/g,'/');
        card.innerHTML = `<span>${disp}</span>`;
        card.onclick = ()=> openDateModal(dk);
        datesC.appendChild(card);
      });
      // user cards
      Object.keys(users).sort().forEach(u=>{
        const card = document.createElement('div');
        card.className = 'user-card';
        card.innerHTML = `<span>${u}</span>`;
        card.onclick = ()=> openUserModal(u);
        usersC.appendChild(card);
      });

      // search filter
      document.getElementById('searchInput')
        .addEventListener('input', e=>{
          const q = e.target.value.toLowerCase();
          document.querySelectorAll('.date-card').forEach(c=>{
            c.style.display = c.textContent.toLowerCase().includes(q)?'':'none';
          });
          document.querySelectorAll('.user-card').forEach(c=>{
            c.style.display = c.textContent.toLowerCase().includes(q)?'':'none';
          });
        });
    })
    .catch(err=> console.error("Browse load error:", err));
});

// modals
function closeModal(){
  document.getElementById('modalBackdrop').style.display='none';
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
}

function openDateModal(dateKey){
  const md = document.getElementById('dateModal'),
        bd = document.getElementById('dateModalBody'),
        tt = document.getElementById('dateModalTitle');
  tt.textContent = `Transactions on ${dateKey.replace(/-/g,'/')}`;
  bd.innerHTML = 'Loading…';
  document.getElementById('modalBackdrop').style.display='block';
  md.style.display='block';

  firebase.database().ref(`Logs/${dateKey}`)
    .once('value')
    .then(snap=>{
      const html = Object.values(snap.val()||{}).map(log=>{
        const items = (''+log.Payload).split(',').filter(x=>x)
          .map(i=>SNACK_SLOTS[parseInt(i,10)-1]?.name||`#${i}`);
        return `
          <div class="txn-card">
            <p><strong>${log.Time.replace(/s.*$/,'')}</strong> — ${log.User}</p>
            <p>Items: ${items.join(', ')}</p>
          </div>`;
      }).join('');
      bd.innerHTML = html || '<p>No Transactions</p>';
    })
    .catch(e=>{
      bd.innerHTML = '<p style="color:red;">Error loading</p>';
      console.error(e);
    });
}

function openUserModal(user){
  const md = document.getElementById('userModal'),
        bd = document.getElementById('userModalBody'),
        tt = document.getElementById('userModalTitle');
  tt.textContent = `User “${user}”`;
  bd.innerHTML = 'Loading…';
  document.getElementById('modalBackdrop').style.display='block';
  md.style.display='block';

  firebase.database().ref('Logs')
    .orderByKey()
    .limitToLast(30)
    .once('value')
    .then(snap=>{
      const dates = new Set();
      snap.forEach(daySnap=>{
        Object.values(daySnap.val()).forEach(log=>{
          if(log.User===user) dates.add(daySnap.key);
        });
      });
      if(!dates.size) {
        bd.innerHTML = '<p>No Transactions</p>';
      } else {
        bd.innerHTML = Array.from(dates).sort((a,b)=>b.localeCompare(a))
          .map(dk=>`<button class="btn" style="margin:4px;"
            onclick="openDateModal('${dk}')">${dk.replace(/-/g,'/')}</button>`)
          .join('');
      }
    })
    .catch(e=>{
      bd.innerHTML = '<p style="color:red;">Error loading</p>';
      console.error(e);
    });
}
