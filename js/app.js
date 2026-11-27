(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const STORAGE = "neon-dash-ultimate-v2";
  const MODES = { classic: {label:"CLASSIC",lives:3,time:0}, time:{label:"TIME ATTACK",lives:3,time:60}, endless:{label:"ENDLESS",lives:1,time:0} };
  const defaultData = { name:"GUEST RIDER", best:0, runs:0, achievements:{first:false,score:false,level:false}, sound:true };
  let data = loadData(), supabase = null, user = null, authMode = "signup", selectedMode = "classic";
  let audio = null, muted = !data.sound, toastTimer;
  const canvas = $("game-canvas"), ctx = canvas.getContext("2d");
  const W=canvas.width,H=canvas.height;
  let game = null, raf = 0, last=0, pointer=false;

  function loadData(){try{return {...defaultData,...JSON.parse(localStorage.getItem(STORAGE)||"{}"),achievements:{...defaultData.achievements,...(JSON.parse(localStorage.getItem(STORAGE)||"{}").achievements||{})}}}catch{return {...defaultData}}}
  function saveData(){localStorage.setItem(STORAGE,JSON.stringify(data));}
  function fmt(n){return String(Math.floor(n||0)).padStart(6,"0")}
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
  function initBackend(){
    const cfg=window.NEON_CONFIG||{};
    if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("YOUR_")||!cfg.SUPABASE_ANON_KEY||cfg.SUPABASE_ANON_KEY.includes("YOUR_"))return;
    try{supabase=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);$("connection-state").innerHTML="<i></i> CONNECTING";supabase.auth.getSession().then(({data:d})=>{user=d.session?.user||null;setConnection();renderProfile();if(user)refreshLeaderboard()});supabase.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;setConnection();renderProfile();refreshLeaderboard()})}catch(e){console.warn("Supabase initialization failed",e)}
  }
  function setConnection(){const el=$("connection-state");el.classList.toggle("online",!!user);el.innerHTML=`<i></i> ${user?"SYNCED ACCOUNT":supabase?"SUPABASE READY":"LOCAL MODE"}`}
  function renderProfile(){
    const name=(user?.user_metadata?.username||data.name||"GUEST RIDER").toUpperCase();
    $("profile-label").textContent=user?name.slice(0,14):"GUEST";$("avatar").textContent=name[0]||"G";$("big-avatar").textContent=name[0]||"G";
    $("dashboard-name").textContent=name;$("dashboard-status").textContent=user?"SUPABASE ACCOUNT · SYNC ENABLED":"LOCAL PROFILE · THIS DEVICE";
    $("best-stat").textContent=fmt(data.best);$("runs-stat").textContent=String(data.runs).padStart(2,"0");
    const rank=data.best>=5000?"NEON LEGEND":data.best>=2500?"NIGHT RIDER":data.best>=1000?"STREET PRO":"ROOKIE";
    $("rank-label").textContent=rank;$("rank-progress").style.width=Math.min(100,(data.best%1000)/10)+"%";
    renderAchievements();
  }
  function renderAchievements(){
    const a=data.achievements;const ids=["first","score","level"];const unlocked=ids.filter(k=>a[k]).length;
    ids.forEach(k=>{const el=$("ach-"+(k==="first"?"first":k==="score"?"score":"level"));el.textContent=a[k]?"UNLOCKED":"LOCKED";el.closest(".achievement").classList.toggle("unlocked",a[k])});
    $("achievement-count").textContent=`${unlocked} / 3`;
  }
  function unlock(key,label){if(!data.achievements[key]){data.achievements[key]=true;saveData();renderAchievements();toast(`ACHIEVEMENT UNLOCKED: ${label}`)}}
  function showGame(){ $("home-view").classList.add("hidden");$("game-view").classList.remove("hidden");$("game-overlay").classList.remove("hidden");$("pause-chip").classList.add("hidden");window.scrollTo({top:0,behavior:"smooth"});drawIdle()}
  function showHome(){stopLoop();$("game-view").classList.add("hidden");$("home-view").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
  function drawIdle(){ctx.fillStyle="#10091f";ctx.fillRect(0,0,W,H);drawWorld(0);drawCar(W/2,H-100);}

  function newGame(mode){
    selectedMode=mode;const m=MODES[mode];game={mode,score:0,level:1,lives:m.lives,time:m.time,elapsed:0,spawn:0,obstacles:[],orbs:[],particles:[],player:{x:W/2,y:H-90,w:34,h:48},shield:0,slow:0,magnet:0,boost:0,over:false};
    $("mode-name").textContent=m.label;$("game-overlay").classList.add("hidden");$("pause-chip").classList.add("hidden");updateHud();last=0;stopLoop();raf=requestAnimationFrame(loop);
  }
  function stopLoop(){cancelAnimationFrame(raf);raf=0}
  function updateHud(){
    if(!game)return;$("score").textContent=fmt(game.score);$("game-best").textContent=fmt(data.best);$("level").textContent=String(game.level).padStart(2,"0");$("lives").textContent=game.mode==="endless"?(game.lives?"♥":"♡"):"♥".repeat(game.lives)+"♡".repeat(Math.max(0,3-game.lives));
  }
  function spawnHazard(){
    const w=28+Math.random()*45,h=22+Math.random()*28;
    game.obstacles.push({x:25+Math.random()*(W-w-50),y:-50,w,h,v:150+game.level*20+Math.random()*90,type:Math.random()});
  }
  function spawnOrb(){game.orbs.push({x:35+Math.random()*(W-70),y:-20,r:9,kind:Math.random()<.25?"power":"score",pulse:Math.random()*6})}
  function particles(x,y,color,count=12){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*220;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.5,color})}}
  function intersects(a,b){return a.x-a.w/2<b.x+b.w/2&&a.x+a.w/2>b.x-b.w/2&&a.y-a.h/2<b.y+b.h/2&&a.y+a.h/2>b.y-b.h/2}
  function update(dt){
    if(!game||game.over)return;game.elapsed+=dt;
    if(game.mode==="time"){game.time=Math.max(0,60-game.elapsed);if(game.time<=0){finish(true);return}}
    const dir=(keys.right?1:0)-(keys.left?1:0);game.player.x+=dir*470*dt;game.player.x=Math.max(25,Math.min(W-25,game.player.x));
    if(game.slow>0)game.slow-=dt;if(game.shield>0)game.shield-=dt;if(game.magnet>0)game.magnet-=dt;
    game.score+=dt*(game.mode==="time"?24:12)*(game.boost>0?2:1);game.boost=Math.max(0,game.boost-dt);
    const level=1+Math.floor(game.score/240);if(level>game.level){game.level=level;toast(`LEVEL ${level} — SPEED INCREASED`);if(level>=5)unlock("level","LIGHTSPEED")}
    game.spawn-=dt;if(game.spawn<=0){spawnHazard();if(Math.random()<.62)spawnOrb();game.spawn=Math.max(.27,.88-game.level*.045)*(game.slow>0?1.7:1)}
    const slowFactor=game.slow>0?.48:1;
    game.obstacles.forEach(o=>o.y+=(o.v+game.level*13)*dt*slowFactor);
    game.orbs.forEach(o=>{o.y+=170*dt;if(game.magnet>0)o.x+=(game.player.x-o.x)*dt*2.5});
    game.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});
    game.obstacles=game.obstacles.filter(o=>o.y<H+60);game.orbs=game.orbs.filter(o=>o.y<H+30);game.particles=game.particles.filter(p=>p.life>0);
    const p=game.player,box={x:p.x,y:p.y,w:24,h:35};
    game.obstacles=game.obstacles.filter(o=>{if(intersects(box,{x:o.x+o.w/2,y:o.y+o.h/2,w:o.w,h:o.h})){if(game.shield>0){particles(o.x,o.y,"#54f7e2");return false}game.lives--;particles(p.x,p.y,"#ff557d",20);beep(90,.12);if(game.lives<=0){finish(false);return false}game.shield=1.1;return false}return true});
    game.orbs=game.orbs.filter(o=>{if(Math.hypot(p.x-o.x,p.y-o.y)<30){if(o.kind==="power"){const powers=["shield","slow","magnet","boost"];const power=powers[Math.floor(Math.random()*powers.length)];game[power]=power==="shield"?6:power==="slow"?5:power==="magnet"?6:5;toast(`${power.toUpperCase()} ACTIVATED`)}else game.score+=75;particles(o.x,o.y,o.kind==="power"?"#ffb35c":"#54f7e2");beep(660,.055);return false}return true});
    if(game.score>=1000)unlock("score","HIGH VOLTAGE");updateHud();
  }
  const keys={left:false,right:false};
  function drawWorld(t){
    ctx.fillStyle="#10091f";ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="#3c2353";ctx.lineWidth=1;
    for(let x=0;x<=W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    for(let y=(t*50)%48;y<=H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    const horizon=H*.43;const sunX=W/2,sunY=145;
    const g=ctx.createRadialGradient(sunX,sunY,8,sunX,sunY,210);g.addColorStop(0,"#ffb35c55");g.addColorStop(1,"#ff4ebc00");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.beginPath();ctx.arc(sunX,sunY,86,0,Math.PI*2);ctx.clip();ctx.fillStyle="#ff6f9d";ctx.fillRect(sunX-90,sunY-90,180,180);for(let i=0;i<9;i++){ctx.fillStyle="#32153e";ctx.fillRect(sunX-100,sunY+15+i*9,200,4+i*.45)}ctx.restore();
    ctx.fillStyle="#27163e";ctx.beginPath();ctx.moveTo(0,horizon+40);ctx.lineTo(150,horizon-90);ctx.lineTo(280,horizon+35);ctx.lineTo(400,horizon-50);ctx.lineTo(570,horizon+35);ctx.lineTo(740,horizon-80);ctx.lineTo(W,horizon+30);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.strokeStyle="#ff4ebc";ctx.shadowColor="#ff4ebc";ctx.shadowBlur=12;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W/2,horizon);ctx.lineTo(0,H);ctx.moveTo(W/2,horizon);ctx.lineTo(W,H);ctx.stroke();ctx.shadowBlur=0;
    for(let i=1;i<13;i++){const y=horizon+Math.pow(i/12,2)*(H-horizon);ctx.strokeStyle="#a33d9b";ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    for(let i=-8;i<=8;i++){ctx.strokeStyle="#8f3f9d";ctx.beginPath();ctx.moveTo(W/2,horizon);ctx.lineTo(W/2+i*75,H);ctx.stroke()}
  }
  function drawCar(x,y){
    ctx.save();ctx.translate(x,y);ctx.shadowColor="#54f7e2";ctx.shadowBlur=22;ctx.fillStyle="#54f7e2";ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(18,-7);ctx.lineTo(15,23);ctx.lineTo(-15,23);ctx.lineTo(-18,-7);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#26133c";ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(9,-4);ctx.lineTo(-9,-4);ctx.fill();ctx.fillStyle="#ff4ebc";ctx.fillRect(-14,13,6,5);ctx.fillRect(8,13,6,5);ctx.restore();
  }
  function draw(){
    if(!game)return;drawWorld(game.elapsed);
    game.obstacles.forEach(o=>{ctx.save();ctx.shadowColor="#ff557d";ctx.shadowBlur=20;ctx.fillStyle="#ff557d";ctx.fillRect(o.x,o.y,o.w,o.h);ctx.fillStyle="#ffd5e0";ctx.fillRect(o.x+4,o.y+4,o.w-8,3);ctx.restore()});
    game.orbs.forEach(o=>{const pulse=1+Math.sin(game.elapsed*7+o.pulse)*.2;ctx.save();ctx.translate(o.x,o.y);ctx.scale(pulse,pulse);ctx.shadowBlur=20;ctx.shadowColor=o.kind==="power"?"#ffb35c":"#54f7e2";ctx.fillStyle=o.kind==="power"?"#ffb35c":"#54f7e2";ctx.beginPath();ctx.arc(0,0,o.r,0,Math.PI*2);ctx.fill();ctx.restore()});
    game.particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)});ctx.globalAlpha=1;
    if(game.shield>0){ctx.strokeStyle="#54f7e2aa";ctx.lineWidth=3;ctx.beginPath();ctx.arc(game.player.x,game.player.y,31+Math.sin(game.elapsed*12)*3,0,Math.PI*2);ctx.stroke()}
    drawCar(game.player.x,game.player.y);
    ctx.fillStyle="#fff";ctx.font="12px 'DM Mono'";ctx.textAlign="left";ctx.fillText(game.mode==="time"?`TIME ${Math.ceil(game.time)}s`:`RUN ${Math.floor(game.elapsed)}s`,18,25);
    if(game.slow>0||game.magnet>0||game.boost>0||game.shield>0){ctx.fillStyle="#54f7e2";ctx.textAlign="right";ctx.fillText([game.slow>0?"SLOW":null,game.magnet>0?"MAGNET":null,game.boost>0?"2X":null,game.shield>0?"SHIELD":null].filter(Boolean).join("  /  "),W-18,25)}
  }
  function loop(ts){if(!game||game.over)return;const dt=Math.min((ts-(last||ts))/1000,.035);last=ts;update(dt);draw();if(game&&!game.over)raf=requestAnimationFrame(loop)}
  function finish(timeWon){
    if(!game||game.over)return;game.over=true;stopLoop();data.runs++;const score=Math.floor(game.score);const newBest=score>data.best;data.best=Math.max(data.best,score);unlock("first","FIRST IGNITION");saveData();renderProfile();updateHud();beep(timeWon?880:130,.2);
    if(user&&supabase){supabase.rpc("submit_score",{p_score:score,p_mode:game.mode}).then(({error})=>{if(error)console.warn("Score sync failed",error);else refreshLeaderboard()})}
    $("overlay-kicker").textContent=timeWon?"TIME ATTACK COMPLETE":"RUN TERMINATED";$("overlay-title").textContent=newBest?"NEW PERSONAL BEST!":"GRID OVER."; $("overlay-message").textContent=`FINAL SCORE ${fmt(score)} · LEVEL ${game.level}${newBest?" · RECORD BROKEN":""}`;
    $("mode-picker").classList.add("hidden");$("start-run").textContent="RUN IT BACK ↗";$("game-overlay").classList.remove("hidden");$("pause-chip").classList.add("hidden");
  }
  function pause(){if(!game||game.over)return;if(raf){stopLoop();$("pause-chip").classList.remove("hidden")}else{$("pause-chip").classList.add("hidden");last=0;raf=requestAnimationFrame(loop)}}
  function activatePower(){if(!game||game.over)return;game.boost=5;beep(500,.08);toast("OVERDRIVE — DOUBLE SCORE")}
  function beep(freq=440,duration=.06){if(muted)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),gain=audio.createGain();o.type="sine";o.frequency.value=freq;gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain);gain.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
  function movePointer(e){if(!game||game.over)return;const r=canvas.getBoundingClientRect();game.player.x=Math.max(25,Math.min(W-25,(e.clientX-r.left)/r.width*W))}
  async function refreshLeaderboard(){
    const list=$("leaderboard-list");if(!supabase){list.innerHTML='<div class="empty-state">Connect Supabase to load global riders.<br>Your local best is saved on this device.</div>';return}
    list.innerHTML='<div class="empty-state">SYNCING GLOBAL RIDERS...</div>';
    const {data:rows,error}=await supabase.from("scores").select("best_score,profiles(username)").eq("mode","classic").order("best_score",{ascending:false}).limit(5);
    if(error){list.innerHTML='<div class="empty-state">Leaderboard unavailable. Check the Supabase SQL setup and policies.</div>';return}
    if(!rows?.length){list.innerHTML='<div class="empty-state">No riders on the board yet.<br>Be the first to set a record.</div>';return}
    list.innerHTML=rows.map((r,i)=>`<div class="leader-row"><span class="leader-rider"><b>#${String(i+1).padStart(2,"0")}</b>${escapeHtml(r.profiles?.username||"UNKNOWN RIDER")}</span><span>${fmt(r.best_score)}</span></div>`).join("");
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function openAuth(){if(!supabase){toast("SUPABASE NOT CONFIGURED — LOCAL PLAY IS READY");return}authMode="signup";updateAuthForm();$("auth-dialog").showModal()}
  function updateAuthForm(){$("auth-title").textContent=authMode==="signup"?"JOIN THE GRID":"WELCOME BACK";$("auth-copy").textContent=authMode==="signup"?"Create an account to sync your profile and scores across devices.":"Sign in to sync your player identity and arcade records.";$("username-label").classList.toggle("hidden",authMode!=="signup");$("auth-submit").textContent=authMode==="signup"?"CREATE ACCOUNT ↗":"SIGN IN ↗";$("auth-switch").textContent=authMode==="signup"?"ALREADY REGISTERED? SIGN IN":"NEW RIDER? CREATE ACCOUNT";$("auth-message").textContent=""}
  $("auth-form").addEventListener("submit",async e=>{e.preventDefault();if(!supabase)return;const email=$("auth-email").value,password=$("auth-password").value,username=$("auth-username").value.trim()||"NEON RIDER";$("auth-submit").disabled=true;$("auth-message").textContent="CONTACTING THE GRID...";let result=authMode==="signup"?await supabase.auth.signUp({email,password,options:{data:{username}}}):await supabase.auth.signInWithPassword({email,password});$("auth-submit").disabled=false;if(result.error){$("auth-message").textContent=result.error.message;return}if(authMode==="signup"&&!result.data.session){$("auth-message").textContent="Check your email to confirm your account, then sign in.";return}$("auth-dialog").close();toast("IDENTITY SYNCED");});
  $("auth-switch").addEventListener("click",()=>{authMode=authMode==="signup"?"signin":"signup";updateAuthForm()});
  $("profile-button").addEventListener("click",async()=>{if(user&&supabase){if(confirm("Sign out from Neon Dash?"))await supabase.auth.signOut()}else openAuth()});
  $("edit-profile").addEventListener("click",()=>{$("player-name-input").value=data.name;$("name-dialog").showModal()});
  $("name-form").addEventListener("submit",async e=>{e.preventDefault();data.name=$("player-name-input").value.trim().toUpperCase();saveData();if(user&&supabase)await supabase.auth.updateUser({data:{username:data.name}});renderProfile();$("name-dialog").close();toast("CALLSIGN UPDATED")});
  $("play-button").addEventListener("click",showGame);$("exit-game").addEventListener("click",showHome);$("how-button").addEventListener("click",()=>$("how-section").scrollIntoView({behavior:"smooth"}));
  $("start-run").addEventListener("click",()=>{if(game?.over){$("mode-picker").classList.remove("hidden")}newGame(selectedMode)});
  document.querySelectorAll(".mode-card").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".mode-card").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedMode=b.dataset.mode;$("mode-name").textContent=MODES[selectedMode].label}));
  $("refresh-leaderboard").addEventListener("click",refreshLeaderboard);
  $("sound-toggle").addEventListener("click",()=>{muted=!muted;data.sound=!muted;saveData();$("sound-toggle").textContent=muted?"♫̸":"♫";toast(muted?"SOUND MUTED":"SOUND ENABLED")});
  window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")keys.left=true;if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")keys.right=true;if(e.code==="Space")activatePower();if(e.key==="Escape"&&$("game-view").classList.contains("hidden")===false&&game&&!game.over)pause()});
  window.addEventListener("keyup",e=>{if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")keys.left=false;if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")keys.right=false});
  window.addEventListener("blur",()=>{keys.left=keys.right=false});
  canvas.addEventListener("pointerdown",e=>{pointer=true;canvas.setPointerCapture(e.pointerId);movePointer(e)});canvas.addEventListener("pointermove",e=>{if(pointer)movePointer(e)});canvas.addEventListener("pointerup",()=>pointer=false);canvas.addEventListener("pointercancel",()=>pointer=false);
  $("sound-toggle").textContent=muted?"♫̸":"♫";renderProfile();setConnection();drawIdle();initBackend();
})();
