// mini-console hook
document.addEventListener('touchmove', e=>e.preventDefault(),{passive:false});
(function(){
  const orig = console, mc = document.getElementById("miniConsole");
  function out(t,a){
    const d = document.createElement("div");
    d.textContent = `[${t}] ${Array.from(a).join(" ")}`;
    mc.appendChild(d);
    mc.scrollTop = mc.scrollHeight;
  }
  console.log   = function(){ out("LOG",arguments);   orig.log  .apply(orig,arguments) };
  console.warn  = function(){ out("WARN",arguments);  orig.warn .apply(orig,arguments) };
  console.error = function(){ out("ERR",arguments);   orig.error.apply(orig,arguments) };
})();

document.addEventListener('DOMContentLoaded', ()=>{
  console.log("🛠️ Admin panel up—UI painted");

  // init firebase
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
    { slot:"C2", name:"Chips" },
    { slot:"E1", name:"Cookies" },
    { slot:"E2", name:"Pretzels" },
    { slot:"E3", name:"Candy Bar" },
    { slot:"E4", name:"Granola Bar" },
    { slot:"E5", name:"Trail Mix" },
  ];

  // do the heavy lifting when browser is idle
  function fetchAll(){
    fetchRecent();
    fetchBrowse();
  }
  if ('requestIdleCallback' in window) requestIdleCallback(fetchAll);
  else setTimeout(fetchAll, 50);

  // recent 6
  function fetchRecent(){
    db.ref('Logs').orderByKey().limitToLast(6).once('value')
      .then(snap=>{
        const rc = document.getElementById('recentContainer');
        rc.innerHTML = "";
        const tmp = [];
        snap.forEach(day=>{
          const date = day.key.replace(/-/g,'/');
          day.forEach(logSnap=>{
            const l = logSnap.val();
            const items = (""+l.Payload).split(",")
              .filter(x=>x).map(i=>SNACK_SLOTS[+i-1]?.name||`#${i}`);
            tmp.push({ date, time:l.Time.replace(/s.*$/,""), user:l.User, items });
          });
        });
        tmp.reverse().forEach(e=>{
          const d = document.createElement("div");
          d.className = "recent-card";
          d.innerHTML = `
            <p class="time">${e.date} ${e.time}</p>
            <p>User: ${e.user}</p>
            <p>Items: ${e.items.join(", ")}</p>`;
          rc.appendChild(d);
        });
        if(tmp.length>6){
          const mb = document.getElementById('moreBtn');
          mb.style.display='inline-block';
          mb.onclick = ()=> document.getElementById('browseWrapper')
            .scrollIntoView({behavior:'smooth'});
        }
      })
      .catch(e=>console.error("Recent err:",e));
  }

  // browse last 30 days
  function fetchBrowse(){
    const DAYS = 30;
    db.ref('Logs').orderByKey().limitToLast(DAYS).once('value')
      .then(snap=>{
        const dc = document.getElementById('datesContainer');
        const uc = document.getElementById('usersContainer');
        dc.innerHTML=""; uc.innerHTML="";
        const users = {};
        const keys = [];
        snap.forEach(day=>{
          keys.push(day.key);
          day.forEach(l=> users[l.val().User]=true);
        });
        keys.sort((a,b)=>b.localeCompare(a)).forEach(k=>{
          const c = document.createElement("div");
          c.className="date-card";
          const disp = k.replace(/-/g,'/');
          c.innerHTML=`<span>${disp}</span>`;
          c.onclick=()=>openDateModal(k);
          dc.appendChild(c);
        });
        Object.keys(users).sort().forEach(u=>{
          const c = document.createElement("div");
          c.className="user-card";
          c.innerHTML=`<span>${u}</span>`;
          c.onclick=()=>openUserModal(u);
          uc.appendChild(c);
        });
        // live-search
        document.getElementById('searchInput')
          .addEventListener('input',e=>{
            const q=e.target.value.toLowerCase();
            document.querySelectorAll('.date-card').forEach(c=>{
              c.style.display = c.textContent.toLowerCase().includes(q)?'':'none';
            });
            document.querySelectorAll('.user-card').forEach(c=>{
              c.style.display = c.textContent.toLowerCase().includes(q)?'':'none';
            });
          });
      })
      .catch(e=>console.error("Browse err:",e));
  }
});

// modals
function closeModal(){
  document.getElementById('modalBackdrop').style.display='none';
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
}

function openDateModal(k){
  const md=document.getElementById('dateModal'),
        bd=document.getElementById('dateModalBody'),
        tt=document.getElementById('dateModalTitle');
  tt.textContent=`Transactions on ${k.replace(/-/g,'/')}`;
  bd.innerHTML='Loading…';
  document.getElementById('modalBackdrop').style.display='block';
  md.style.display='block';
  firebase.database().ref(`Logs/${k}`).once('value')
    .then(snap=>{
      const html = Object.values(snap.val()||{}).map(l=>{
        const items = (""+l.Payload).split(",").filter(x=>x)
          .map(i=>SNACK_SLOTS[+i-1]?.name||`#${i}`);
        return `
          <div class="txn-card">
            <p><strong>${l.Time.replace(/s.*$/,"")}</strong> — ${l.User}</p>
            <p>Items: ${items.join(", ")}</p>
          </div>`;
      }).join("");
      bd.innerHTML = html || '<p>No Transactions</p>';
    })
    .catch(e=>{
      bd.innerHTML=`<p style="color:red;">Error</p>`;
      console.error(e);
    });
}

function openUserModal(u){
  const md=document.getElementById('userModal'),
        bd=document.getElementById('userModalBody'),
        tt=document.getElementById('userModalTitle');
  tt.textContent=`User “${u}”`;
  bd.innerHTML='Loading…';
  document.getElementById('modalBackdrop').style.display='block';
  md.style.display='block';
  firebase.database().ref('Logs').orderByKey().limitToLast(30).once('value')
    .then(snap=>{
      const ds=new Set();
      snap.forEach(day=>{
        Object.values(day.val()).forEach(l=>{
          if(l.User===u) ds.add(day.key);
        });
      });
      if(!ds.size) bd.innerHTML='<p>No Transactions</p>';
      else bd.innerHTML = Array.from(ds).sort((a,b)=>b.localeCompare(a))
        .map(k=>`<button class="btn" style="margin:4px;"
          onclick="openDateModal('${k}')">${k.replace(/-/g,'/')}</button>`)
        .join("");
    })
    .catch(e=>{
      bd.innerHTML=`<p style="color:red;">Error</p>`;
      console.error(e);
    });
}
