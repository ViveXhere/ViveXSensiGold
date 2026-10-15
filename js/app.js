(() => {
  const chat = document.getElementById('chat');
  const VERIFY_API = 'https://script.google.com/macros/s/AKfycbwW7iwNSA7kLXKqbEwrzSDlHw3vRtHJ_xJJ5GMMPN8eMN4kjj9sJJJNhpOK6_jZOytuEw/exec';
  const PAYMENT_MESSAGE_TYPE = 'VIVEX_PAYMENT_RESULT';
  let userData = {brand:'',ram:'',storage:'',style:'Balanced'};
  let displayMetrics = {width:0,height:0,ratio:'Unavailable',ppi:0,dpr:1,scanned:false};
  const BRAND_FACTOR = {'Samsung':0,'Realme':2,'Vivo':2,'OPPO':1,'Oppo':1,'Xiaomi / Redmi':3,'Xiaomi':3,'Redmi':3,'OnePlus':4,'Motorola':0,'Infinix':3,'Tecno':3,'iQOO':5,'Poco':4,'POCO':4,'Nothing':1,'Honor':1,'Google Pixel':-2,'Other Android':0};
  const clamp = (value,min,max)=>Math.max(min,Math.min(max,Math.round(value)));
  function getRamEffect(ram){return ({4:5,6:3,8:1,12:-1,16:-3,24:-5})[Number(ram)] ?? 0;}
  function getStorageEffect(storage){return ({32:5,64:3,128:1,256:-1,512:-3,1024:-5})[Number(storage)] ?? 0;}
  function readDisplayMetrics(){
    const dpr=window.devicePixelRatio||1;
    const sw=window.screen?.width||window.innerWidth||0;
    const sh=window.screen?.height||window.innerHeight||0;
    const width=Math.round(sw*dpr),height=Math.round(sh*dpr);
    const gcd=(a,b)=>b?gcd(b,a%b):a;
    const divisor=gcd(width,height)||1;
    displayMetrics={width,height,ratio:width&&height?`${Math.round(width/divisor)}:${Math.round(height/divisor)}`:'Unavailable',ppi:Math.round(160*dpr),dpr,scanned:true};
    return displayMetrics;
  }
  function calculateLegacySettings(){
    const m=displayMetrics.scanned?displayMetrics:readDisplayMetrics();
    const dpr=m.dpr||window.devicePixelRatio||1;
    const width=m.width||Math.round((window.screen?.width||window.innerWidth)*(window.devicePixelRatio||1));
    const height=m.height||Math.round((window.screen?.height||window.innerHeight)*(window.devicePixelRatio||1));
    const density=m.ppi||Math.round(160*dpr);
    const resolutionFactor=width*height>=2500000?2:width*height>=1500000?1:0;
    const ppiFactor=density>=400?-2:density>=300?0:2;
    const dprFactor=dpr>=3?-1:dpr<=1?1:0;
    const ram=Number.parseInt(userData.ram,10)||4;
    const storageText=String(userData.storage);
    const storage=storageText.includes('TB')?1024:(Number.parseInt(storageText,10)||128);
    const brandEffect=BRAND_FACTOR[userData.brand]??0;
    const ramEffect=getRamEffect(ram),storageEffect=getStorageEffect(storage);
    const totalFactor=resolutionFactor+ppiFactor+dprFactor+brandEffect+ramEffect+storageEffect;
    const base=145+totalFactor;
    return {general:clamp(base+15,100,200),redDot:clamp(base+8,90,195),twoX:clamp(base,80,190),fourX:clamp(base-12,70,180),sniper:clamp(base-45,40,140),freeLook:clamp(base+4,90,195),fireButton:clamp(38+totalFactor/2,33,43),dpi:clamp(480-(density-320)*.35+ramEffect*4+storageEffect*3+brandEffect*1.5,400,550),width,height,ratio:m.ratio,ppi:density};
  }
  let formSubmitted = false;
  let displayScanned = false;

  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function scrollBottom(){ window.setTimeout(()=>{ const area=document.getElementById('screenArea'); area.scrollTo({top:area.scrollHeight,behavior:'smooth'}); },60); }
  function bot(html, cls='') {
    const row=document.createElement('section'); row.className='row bot-row';
    row.innerHTML=`<div class="avatar">🤖</div><div class="message-wrap"><div class="who">VIVEX BOT</div><div class="bubble">${html}</div></div>`;
    chat.appendChild(row); scrollBottom(); return row.querySelector('.bubble');
  }
  function user(text) {
    const row=document.createElement('section'); row.className='row user';
    row.innerHTML=`<div class="message-wrap"><div class="who">YOU</div><div class="bubble">${escapeHTML(text)}</div></div>`;
    chat.appendChild(row); scrollBottom();
  }
  function startScreen() {
    const el = bot(`👋 Welcome to <b>ViveX Sensi BOT!</b><br>Choose an option below to continue.<div class="options"><button class="option" id="startCode"><span class="emoji">🔑</span><span><strong>Enter Verification Code</strong><small>Already have your access code?</small></span></button><button class="option" id="startGet"><span class="emoji">🎟️</span><span><strong>Get Verification Code</strong><small>View the ₹49 payment instructions</small></span></button><button class="option" id="startPaid"><span class="emoji">✅</span><span><strong>I Have Done the Payment</strong><small>Continue directly to the payment form</small></span></button></div>`);
    el.querySelector('#startCode').onclick=()=>{user('Enter Verification Code');addCodePrompt();};
    el.querySelector('#startGet').onclick=()=>{user('Get Verification Code');paymentFlow();};
    el.querySelector('#startPaid').onclick=()=>{user('I Have Done the Payment');paymentForm();};
  }

  function getDeviceId(){
    const key='vivex_device_id';
    let id='';
    try{id=localStorage.getItem(key)||'';}catch(e){}
    if(!id){
      const randomPart=()=>Math.random().toString(36).slice(2,10);
      id='vx-'+randomPart()+'-'+randomPart()+'-'+Date.now().toString(36);
      try{localStorage.setItem(key,id);}catch(e){}
    }
    return id;
  }
  function verifyWithServer(code){
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(VERIFY_API)) return Promise.reject(new Error('Verification backend is not configured yet.'));
    return new Promise((resolve,reject)=>{
      const callback='vxVerifyCallback_'+Date.now()+'_'+Math.floor(Math.random()*100000);
      const script=document.createElement('script');
      let finished=false;
      const cleanup=()=>{if(finished)return;finished=true;clearTimeout(timer);try{delete window[callback];}catch(e){window[callback]=undefined;}script.remove();};
      const timer=setTimeout(()=>{cleanup();reject(new Error('Verification server timed out. Please try again.'));},12000);
      window[callback]=(result)=>{cleanup();resolve(result||{success:false,message:'Empty server response.'});};
      script.onerror=()=>{cleanup();reject(new Error('Could not connect to the verification server. Check the Web App deployment and access settings.'));};
      script.src=VERIFY_API+'?code='+encodeURIComponent(code)+'&device='+encodeURIComponent(getDeviceId())+'&callback='+encodeURIComponent(callback)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }
  function addCodePrompt() {
    const el=bot(`👋 Welcome to <b>ViveX Sensi BOT!</b><br>Enter the verification code sent to your email.<div class="card"><label for="codeInput">Verification code</label><input id="codeInput" autocomplete="off" placeholder="e.g. VX-ABC123"><button class="btn" id="verifyBtn">Verify &amp; Continue →</button><div id="codeStatus" class="status" role="status" aria-live="polite"></div></div>`);
    const input=el.querySelector('#codeInput'), status=el.querySelector('#codeStatus'), button=el.querySelector('#verifyBtn');
    let busy=false;
    async function submitCode(){
      const value=input.value.trim().toUpperCase();
      if(!value){status.className='status bad';status.textContent='Please enter your verification code.';return;}
      if(busy)return;busy=true;button.disabled=true;input.disabled=true;status.className='status';status.textContent='Checking your code...';
      user('Submitted verification code');
      try{
        const result=await verifyWithServer(value);
        if(result.success===true||result.valid===true||String(result.status||'').toLowerCase()==='success'){
          status.className='status good';status.textContent=result.message||'Verification successful.';
          bot('✅ <b>Verification successful!</b><br>Your code is accepted on this device. Let’s set up your phone.');
          askBrand();
        }else{
          status.className='status bad';status.textContent=result.message||'Code not accepted. Please check it and try again.';
          button.disabled=false;input.disabled=false;
          const msg=bot('❌ <b>Verification unsuccessful.</b><br>If your payment has been approved, check the code in your email or contact support.<button class="btn" id="getCode">🔑 Get Verification Code</button>');
          msg.querySelector('#getCode').onclick=()=>{user('Get Verification Code');paymentFlow();};
        }
      }catch(error){status.className='status bad';status.textContent=error.message||'Verification could not be completed. Please try again.';button.disabled=false;input.disabled=false;}
      finally{busy=false;}
    }
    button.onclick=submitCode;
    input.addEventListener('keydown',e=>{if(e.key==='Enter')submitCode();});
  }
  function paymentFlow(){
    bot(`<b>Get your ViveX Sensi BOT access code</b><br>Pay <b>₹49</b> using the owner's actual QR/UPI details. After payment, submit the transaction details for manual verification.<div class="card"><div class="muted" style="text-align:center">PAYMENT AMOUNT</div><div class="amount">₹49</div><div class="qr"><div><span>▦</span><br><small>QR PLACEHOLDER<br>Replace with your actual QR</small></div></div><div class="muted" style="text-align:center">UPI ID: <b>YOUR-UPI-ID</b><br>Replace this with your real UPI ID.</div><button class="btn" id="paymentDone">✓ Payment Done</button><div class="muted" style="margin-top:8px">Payment claims are reviewed manually. Submitting details does not confirm payment.</div></div>`);
    chat.lastElementChild.querySelector('#paymentDone').onclick=()=>{user('Payment Done');paymentForm();};
  }
  function submitPaymentToServer(details){
    return new Promise((resolve, reject) => {
      if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(VERIFY_API)) {
        reject(new Error('Payment backend is not configured yet.')); return;
      }
      const frame = document.createElement('iframe');
      frame.name = 'vxPaymentFrame_' + Date.now();
      frame.style.display = 'none';
      frame.setAttribute('title', 'Payment submission');
      const form = document.createElement('form');
      form.method = 'POST'; form.action = VERIFY_API; form.target = frame.name; form.style.display = 'none';
      const fields = {action:'submitPayment', email:details.email, payer:details.payer, utr:details.utr};
      Object.keys(fields).forEach(key => {
        const input = document.createElement('input'); input.type = 'hidden'; input.name = key; input.value = fields[key]; form.appendChild(input);
      });
      let done = false;
      const cleanup = () => { window.removeEventListener('message', onMessage); clearTimeout(timer); form.remove(); frame.remove(); };
      const finish = (fn, value) => { if (done) return; done = true; cleanup(); fn(value); };
      const onMessage = event => {
        if (!event.data || event.data.type !== PAYMENT_MESSAGE_TYPE) return;
        const payload = event.data.payload || {};
        if (payload.ok) finish(resolve, payload);
        else finish(reject, new Error(payload.message || 'Could not submit payment details.'));
      };
      window.addEventListener('message', onMessage);
      const timer = setTimeout(() => finish(reject, new Error('The server did not respond in time. Check your connection and try again.')), 20000);
      document.body.appendChild(frame); document.body.appendChild(form);
      try { form.submit(); } catch (err) { finish(reject, new Error('Could not send the form. Please try again.')); }
    });
  }
  function paymentForm(){
    const el=bot(`<div class="card"><div class="card-title">🧾 Payment Verification Form</div><div class="muted">Your details will be sent for manual payment review. Never enter your UPI PIN or bank OTP.</div><form id="paymentForm" novalidate><label for="gmail">Gmail address</label><input id="gmail" type="email" placeholder="you@gmail.com" required><label for="payer">Name of the payer</label><input id="payer" placeholder="Name used for payment" required><label for="utr">UTR / transaction reference</label><input id="utr" placeholder="Enter payment UTR" required><div class="muted">Never enter your UPI PIN or bank OTP.</div><button class="btn" type="submit">Submit Form</button><div id="formStatus" class="status" role="status" aria-live="polite"></div></form><button class="btn secondary" id="submitted" disabled>I Submitted the Form</button></div>`);
    const form=el.querySelector('#paymentForm'), status=el.querySelector('#formStatus'), ack=el.querySelector('#submitted'), submit=form.querySelector('button[type="submit"]');
    let busy=false;
    form.onsubmit=async e=>{
      e.preventDefault();
      const gmail=el.querySelector('#gmail').value.trim(), payer=el.querySelector('#payer').value.trim(), utr=el.querySelector('#utr').value.trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail)){status.className='status bad';status.textContent='Enter a valid email address.';return;}
      if(payer.length<2||utr.replace(/\s/g,'').length<6){status.className='status bad';status.textContent='Please check the payer name and transaction reference.';return;}
      if(busy)return; busy=true; submit.disabled=true; status.className='status'; status.textContent='Submitting details for manual review...';
      try {
        await submitPaymentToServer({email:gmail,payer,utr});
        formSubmitted=true; status.className='status good'; status.textContent='Details submitted. Your payment is pending manual review; submitting the form does not guarantee approval.';
        ack.disabled=false;
      } catch(error) {
        status.className='status bad'; status.textContent=error.message || 'Submission failed. Please check your connection and try again.';
        submit.disabled=false;
      } finally { busy=false; }
    };
    ack.onclick=()=>{user('I Submitted the Form');submissionConfirmation();};
  }
  function submissionConfirmation(){
    bot(`📩 <b>Thanks for submitting your details!</b><br><br>If you have genuinely paid ₹49 and your transaction is verified, your access code will be sent to your email within <b>24 hours</b>.<br><br>If no valid payment was made, no code will be issued. Submitting a form alone does not confirm payment.<button class="btn" id="confirmOk">OK →</button>`);
    chat.lastElementChild.querySelector('#confirmOk').onclick=()=>{user('OK');finalMessage();};
  }
  function finalMessage(){
    bot(`⏳ Please wait for your code to arrive by email.<br><br>After you receive it, start a new chat and enter your code to continue.<button class="btn" id="restart">↻ Restart Chat</button>`);
    chat.lastElementChild.querySelector('#restart').onclick=()=>{chat.innerHTML='';userData={brand:'',ram:'',storage:'',style:'Balanced'};formSubmitted=false;displayScanned=false;displayMetrics={width:0,height:0,ratio:'Unavailable',ppi:0,dpr:1,scanned:false};startScreen();};
  }
  function customDropdown(id, placeholder, options){
    return `<div class="custom-select" id="${id}Wrap"><div class="muted" style="margin-bottom:8px">${placeholder}</div><div class="select-options" id="${id}Menu" role="group" aria-label="${placeholder}">${options.map(v=>`<button type="button" class="select-option" data-value="${v}" aria-pressed="false">${v}</button>`).join('')}</div></div>`;
  }
  function wireDropdown(el,id,placeholder,onChange){
    const wrap=el.querySelector('#'+id+'Wrap'), menu=el.querySelector('#'+id+'Menu');
    let value='';
    menu.querySelectorAll('.select-option').forEach(option=>option.onclick=()=>{
      value=option.dataset.value;
      menu.querySelectorAll('.select-option').forEach(item=>{
        const chosen=item===option;
        item.classList.toggle('selected',chosen);
        item.setAttribute('aria-pressed',String(chosen));
      });
      onChange(value);
    });
    return ()=>value;
  }
  function askBrand(){
    const brands=['Poco','Xiaomi / Redmi','Realme','Samsung','Vivo','Oppo','OnePlus','Motorola','Infinix','Tecno','iQOO','Other Android'];
    const el=bot(`Which phone brand do you use?<div class="card"><label>Select your phone brand</label>${customDropdown('brand','Select Device',brands)}<button class="btn" id="brandNext" disabled>Continue →</button></div>`);
    const next=el.querySelector('#brandNext');let selected='';
    wireDropdown(el,'brand','Select Device',v=>{selected=v;next.disabled=false;});
    next.onclick=()=>{if(!selected)return;userData.brand=selected;user(selected);askRam();};
  }
  function askRam(){
    const options=['2 GB','3 GB','4 GB','6 GB','8 GB','12 GB','16 GB or more'];
    const el=bot(`Got it! <b>${escapeHTML(userData.brand)}</b> 📱<br>How much RAM does your phone have?<div class="card"><label>RAM</label>${customDropdown('ram','Select RAM',options)}<button class="btn" id="ramNext" disabled>Continue →</button></div>`);
    const next=el.querySelector('#ramNext');let selected='';
    wireDropdown(el,'ram','Select RAM',v=>{selected=v;next.disabled=false;});
    next.onclick=()=>{if(!selected)return;userData.ram=selected;user(selected);askStorage();};
  }
  function askStorage(){
    const options=['32 GB','64 GB','128 GB','256 GB','512 GB','1 TB or more'];
    const el=bot(`And how much internal storage does your phone have?<div class="card"><label>Internal storage</label>${customDropdown('storage','Select Storage',options)}<button class="btn" id="storageNext" disabled>Continue →</button></div>`);
    const next=el.querySelector('#storageNext');let selected='';
    wireDropdown(el,'storage','Select Storage',v=>{selected=v;next.disabled=false;});
    next.onclick=()=>{if(!selected)return;userData.storage=selected;user(selected);askScan();};
  }
  function askScan(){
    const el=bot(`May I scan your screen resolution, aspect ratio and estimated PPI? The browser can estimate some display details but may not read your phone's exact system DPI.<div class="options"><button class="option" id="yesScan"><span class="emoji">🔍</span><span><strong>Scan My Display</strong><small>Scan resolution, aspect ratio and estimated PPI</small></span></button></div>`);
    el.querySelector('#yesScan').onclick=()=>{user('Scan My Display');scanDisplay();};
  }
  function scanDisplay(skipped=false){
    const el=bot(`<b>${skipped?'Continuing without a scan':'Scanning your display...'}</b><div class="muted" id="scanLabel" style="margin-top:8px">Preparing scan...</div><div class="progress"><div id="scanBar"></div></div><div id="scanPct" class="muted">0%</div>`);
    const bar=el.querySelector('#scanBar'),label=el.querySelector('#scanLabel'),pct=el.querySelector('#scanPct');
    const stages=['Scanning Resolution','Scanning Aspect Ratio','Estimating PPI (Pixels Per Inch)'];
    let start=performance.now();
    function tick(now){
      let p=Math.min(100,Math.round((now-start)/2200*100));bar.style.width=p+'%';pct.textContent=p+'%';label.textContent=skipped?'Continuing...':stages[Math.min(2,Math.floor(p/34))];
      if(p<100)requestAnimationFrame(tick);else{displayScanned=!skipped;if(!skipped)readDisplayMetrics();showScanResult(skipped);}
    }
    requestAnimationFrame(tick);
  }
  function showScanResult(skipped){
    const m=displayMetrics;bot(`${skipped?'Skipping the display scan for this demo.':'✅ Display scan complete!'}<div class="card"><div class="card-title">📱 Display Scan Summary</div><div class="result-row"><span>Resolution</span><b>${skipped?'Not scanned':`${m.width} × ${m.height} px`}</b></div><div class="result-row"><span>Aspect ratio</span><b>${skipped?'Not scanned':m.ratio}</b></div><div class="result-row"><span>Estimated PPI</span><b>${skipped?'Not scanned':`≈ ${m.ppi}`}</b></div><div class="muted" style="margin-top:8px">Browser estimates only. This is not the phone’s verified physical PPI or Android system DPI.</div><button class="btn" id="scanContinue">Continue →</button></div>`);
    chat.lastElementChild.querySelector('#scanContinue').onclick=()=>{user('Continue');askStyle();};
  }
  function askStyle(){
    const el=bot(`What kind of sensitivity do you prefer?<div class="options"><button class="option" id="high"><span class="emoji">⚡</span><span><strong>High Sensitivity</strong><small>Faster drag feel; control needs practice</small></span></button><button class="option" id="balanced"><span class="emoji">🎯</span><span><strong>Balanced Sensitivity</strong><small>A balance of speed and control</small></span></button></div>`);
    el.querySelector('#high').onclick=()=>{userData.style='High';user('High Sensitivity');generate();};
    el.querySelector('#balanced').onclick=()=>{userData.style='Balanced';user('Balanced Sensitivity');generate();};
  }
  function generate(){
    const el=bot(`🔥 Generating your <b>${userData.style}</b> settings...<div class="progress"><div id="genBar"></div></div><div class="muted" id="genPct">0%</div>`);
    const bar=el.querySelector('#genBar'),pct=el.querySelector('#genPct');let start=performance.now();
    function tick(now){let p=Math.min(100,Math.round((now-start)/1800*100));bar.style.width=p+'%';pct.textContent=p+'%';if(p<100)requestAnimationFrame(tick);else showResults();}
    requestAnimationFrame(tick);
  }
  function showResults(){
    const result=calculateLegacySettings();
    const vals=[result.general,result.redDot,result.twoX,result.fourX,result.sniper,result.freeLook];
    const names=['General','Red Dot','2x Scope','4x Scope','Sniper Scope','Free Look'];
    const row=bot(`✅ <b>Your settings are ready!</b><div class="card"><div class="card-title">🎯 VIVEX SENSI SETTINGS</div><div class="muted">${escapeHTML(userData.brand)} · ${escapeHTML(userData.ram)} RAM · ${escapeHTML(userData.storage)} · ${escapeHTML(userData.style)} profile</div>${names.map((name,i)=>`<div class="result-row"><span>${name}</span><b>${vals[i]}</b></div>`).join('')}<div class="result-row"><span>Fire Button Size</span><b>${result.fireButton}%</b></div><div class="result-row"><span>DPI recommendation</span><b>${result.dpi}</b></div><div class="muted" style="margin-top:8px">Calculation adapted from your previous website's heuristic algorithm. Display values are browser estimates; recommendations are not scientifically validated or guaranteed to improve gameplay.</div><button class="btn" id="copySettings">▣ Copy All Settings</button><div id="copyStatus" class="status"></div></div><div class="card"><div class="card-title">⚙️ Device Performance Suggestions</div><div class="result-row"><span>Display size</span><b>Small (if available)</b></div><div class="result-row"><span>Dwell timing</span><b>0.01 (if available)</b></div><div class="result-row"><span>Graphics driver</span><b>System driver</b></div><div class="muted" style="margin-top:8px">Suggestions only; they are not applied automatically. Some settings may require Developer Options.</div></div>`);
    row.querySelector('#copySettings').onclick=async()=>{
      const text=`ViveX Sensi BOT — SETTINGS\nDevice brand: ${userData.brand}\nRAM: ${userData.ram}\nStorage: ${userData.storage}\nProfile: ${userData.style}\nEstimated resolution: ${result.width} × ${result.height} px\nEstimated aspect ratio: ${result.ratio}\nEstimated PPI: ${result.ppi}\n\nSENSITIVITY SETTINGS\nGeneral: ${result.general}\nRed Dot: ${result.redDot}\n2x Scope: ${result.twoX}\n4x Scope: ${result.fourX}\nSniper Scope: ${result.sniper}\nFree Look: ${result.freeLook}\nFire Button Size: ${result.fireButton}%\nDPI recommendation: ${result.dpi}\n\nDEVICE PERFORMANCE SUGGESTIONS\nDisplay size: Small (if available)\nDwell timing: 0.01 (if available)\nGraphics driver: System driver\n\nNote: Adapted heuristic recommendations, not guaranteed results. Display metrics are browser estimates. Suggestions are not applied automatically.`;
      const status=row.querySelector('#copyStatus');let copied=false;
      try{await navigator.clipboard.writeText(text);copied=true;}catch(e){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{copied=document.execCommand('copy');}catch(err){}ta.remove();}
      if(copied){status.className='status good';status.textContent='✓ All settings copied.';const msg=bot(`📌 <b>Settings copied successfully!</b><br>Screenshot le lo ya Notes app mein paste karke save kar lo.<button class="btn secondary" id="resetChat">↻ Reset Chat</button>`);msg.querySelector('#resetChat').onclick=()=>{chat.innerHTML='';userData={brand:'',ram:'',storage:'',style:'Balanced'};formSubmitted=false;displayScanned=false;displayMetrics={width:0,height:0,ratio:'Unavailable',ppi:0,dpr:1,scanned:false};startScreen();};}else{status.className='status bad';status.textContent='Copy was blocked. Please copy the values manually.';}
    };
  }

  const homeScreen=document.getElementById('homeScreen');
  const botScreen=document.getElementById('botScreen');
  const guideScreen=document.getElementById('guideScreen');
  const screenArea=document.getElementById('screenArea');
  const navButtons={bot:document.getElementById('navBot'),home:document.getElementById('navHome'),guide:document.getElementById('navGuide')};
  let botStarted=false;
  function switchTab(tab){
    homeScreen.classList.toggle('hidden',tab!=='home');
    botScreen.classList.toggle('hidden',tab!=='bot');
    guideScreen.classList.toggle('hidden',tab!=='guide');
    Object.entries(navButtons).forEach(([key,button])=>button.classList.toggle('active',key===tab));
    screenArea.scrollTop=0;
    if(tab==='bot'&&!botStarted){startScreen();botStarted=true;}
  }
  navButtons.bot.onclick=()=>switchTab('bot');
  navButtons.home.onclick=()=>switchTab('home');
  navButtons.guide.onclick=()=>switchTab('guide');
  document.getElementById('homeGetSensi').onclick=()=>switchTab('bot');
  document.getElementById('homeGetCode').onclick=()=>{switchTab('bot');user('Get Verification Code');paymentFlow();};
  document.getElementById('homeVerificationTutorial').onclick=()=>window.open('https://www.youtube.com/@ViveXhere','_blank','noopener,noreferrer');
  document.getElementById('homeSensiTutorial').onclick=()=>window.open('https://www.youtube.com/@ViveXhere','_blank','noopener,noreferrer');
})();
