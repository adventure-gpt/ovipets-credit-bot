// ==UserScript==
// @name         Unified Befriender & Ovipets Bots with AI Egg Solver
// @namespace    http://tampermonkey.net/
// @version      1.15
// @description  Befriender + Ovipets Auto‐Turn Eggs (single & across friends) with AI solver, retry on error, and no overlapping solves.  (“All” reuses original flow; only the hatchery egg‐scan is enhanced.)
// @match        *://*.ovipets.com/*
// @grant        GM_xmlhttpRequest
// @connect      im*.ovipets.com
// @connect      127.0.0.1
// @connect      localhost
// @connect      ovipets.com
// ==/UserScript==

(function() {
    'use strict';

    // --- Befriender 1.15 ---
    const Befriender = (function() {
        const RUN_KEY   = 'befriender_running';
        const LINKS_KEY = 'befriender_links';
        const IDX_KEY   = 'befriender_index';
        const BASE_KEY  = 'befriender_base_href';

        function log(...args) { console.log('%c[BEFRIENDER]','background:#0055aa;color:#fff;',...args); }
        function startBot() {
            log('Starting Befriender');
            sessionStorage.setItem(BASE_KEY, location.href);
            sessionStorage.setItem(RUN_KEY, 'true');
            sessionStorage.setItem(IDX_KEY, '0');
            sessionStorage.removeItem(LINKS_KEY);
            setTimeout(main, 500);
        }
        function stopBot() { sessionStorage.removeItem(RUN_KEY); log('Stopped Befriender'); }
        function isRunning() { return sessionStorage.getItem(RUN_KEY)==='true'; }
        function getBase() { return sessionStorage.getItem(BASE_KEY); }
        function getLinks() { try{ return JSON.parse(sessionStorage.getItem(LINKS_KEY))||[]; }catch{return [];} }
        function saveLinks(a){ sessionStorage.setItem(LINKS_KEY, JSON.stringify(a)); }
        function getIndex(){ return parseInt(sessionStorage.getItem(IDX_KEY)||'0',10); }
        function setIndex(i){ sessionStorage.setItem(IDX_KEY, String(i)); }

        function collectLinks() {
            log('Collecting avatar links');
            const xpath = '/html/body/div[1]/main/div/div/div/div/div[2]/section/div/form/fieldset[1]/div/ul';
            const ul = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (!ul) { log('UL not found'); stopBot(); return; }
            const links = Array.from(ul.querySelectorAll('li>a.user.avatar')).map(a => a.href);
            if (!links.length) { log('No links'); stopBot(); return; }
            log(`Found ${links.length} avatars`);
            saveLinks(links);
        }

        function goToProfile() {
            if (!isRunning()) return;
            const links = getLinks(), idx = getIndex();
            if (idx >= links.length) {
                log('All done');
                stopBot();
                location.href = getBase();
                return;
            }
            log(`Visiting profile ${idx+1}/${links.length}`);
            location.href = links[idx];
        }

        function handleProfile() {
            if (!isRunning()) return;
            log('Sending friend request');
            let tries = 0;
            const sel = 'button[onclick*="friend_request"]';
            const iv = setInterval(() => {
                const btn = document.querySelector(sel);
                if (btn) {
                    clearInterval(iv);
                    btn.click();
                    log('Clicked request');
                    setIndex(getIndex()+1);
                    setTimeout(() => location.href = getBase(), 1000);
                } else if (++tries > 2) {
                    clearInterval(iv);
                    log('No button, skipping');
                    setIndex(getIndex()+1);
                    setTimeout(goToProfile, 500);
                }
            }, 500);
        }

        function main() {
            if (!isRunning()) return;
            const href = location.href, base = getBase();
            if (!sessionStorage.getItem(LINKS_KEY) && href === base) {
                collectLinks(); setTimeout(goToProfile, 500);
            } else if (href === base) {
                setTimeout(goToProfile, 500);
            } else {
                handleProfile();
            }
        }

        return { startBot, stopBot, main };
    })();


    // --- Ovipets Auto‐Turn Eggs (Single Profile) 1.15 ---
    const OvipetsSingle = (function() {
        const RUN_KEY   = 'ovipets_single_running';
        const LINKS_KEY = 'ovipets_single_links';
        const IDX_KEY   = 'ovipets_single_index';
        const BASE_KEY  = 'ovipets_single_base';

        function log(...args) { console.log('%c[OVIPETS-SINGLE]','background:#222;color:#bada55;',...args); }
        function startBot() {
            log('Starting Single bot');
            sessionStorage.setItem(RUN_KEY,'true');
            sessionStorage.setItem(BASE_KEY,location.href);
            sessionStorage.removeItem(LINKS_KEY);
            sessionStorage.setItem(IDX_KEY,'0');
            hideResume();
            main();
        }
        function stopBot() { sessionStorage.removeItem(RUN_KEY); log('Stopped Single bot'); }
        function resumeBot() { sessionStorage.setItem(RUN_KEY,'true'); log('Resumed Single bot'); hideResume(); stepIndex(); navigateProfile(); }
        function showResume() { const btn=document.getElementById('ovipets-single-resume'); if(btn) btn.style.display='inline-block'; }
        function hideResume() { const btn=document.getElementById('ovipets-single-resume'); if(btn) btn.style.display='none'; }
        function isRunning() { return sessionStorage.getItem(RUN_KEY)==='true'; }
        function getLinks() { try{return JSON.parse(sessionStorage.getItem(LINKS_KEY))||[];}catch{return [];} }
        function setLinks(a){ sessionStorage.setItem(LINKS_KEY, JSON.stringify(a)); }
        function getIndex(){ return parseInt(sessionStorage.getItem(IDX_KEY)||'0',10); }
        function setIndex(i){ sessionStorage.setItem(IDX_KEY,String(i)); }
        function getBase(){ return sessionStorage.getItem(BASE_KEY)||location.href; }

        function collectLinks() {
            if (!isRunning()) return;
            log('Collecting single eggs');
            window.scrollTo(0,document.body.scrollHeight);
            setTimeout(()=>{
                const imgs = Array.from(document.querySelectorAll('img[title="Turn Egg"]'));
                const lis = imgs.map(img=>img.parentElement?.parentElement?.parentElement)
                                .filter(li=>li&&li.tagName==='LI');
                const available = new Set(
                    Array.from(document.querySelectorAll('img[title="Available"]'))
                         .map(av=>av.closest('li')).filter(li=>li)
                );
                const usable = lis.filter(li=>!available.has(li));
                if (!usable.length) { log('No eggs'); stopBot(); return; }
                const links = usable.map(li=>li.querySelector('a.pet')?.href).filter(Boolean);
                log(`Found ${links.length} eggs`);
                setLinks(links);
                navigateProfile();
            },800);
        }

        function navigateProfile() {
            if (!isRunning()) return;
            const links=getLinks(), idx=getIndex();
            if (idx>=links.length) { log('Single done'); stopBot(); location.href=getBase(); return; }
            log(`Go to egg ${idx+1}/${links.length}`); location.href=links[idx];
        }

        function stepIndex(){ setIndex(getIndex()+1); }

        async function solveAndSubmitSingle() {
            const dlgSel='div.ui-dialog[role="dialog"]', turnSel='button[onclick*="pet_turn_egg"]', maxRetries=2;
            for(let attempt=1;attempt<=maxRetries;attempt++){
                const dlg=document.querySelector(dlgSel);
                if (!dlg) continue;
                const img=dlg.querySelector('fieldset img');
                if(!img){ log('No puzzle image'); break; }
                const url=img.src.replace(/^\/\//,'https://');
                log(`Fetch ${url}`);
                const blob=await new Promise((res,rej)=>GM_xmlhttpRequest({
                    method:'GET',url,responseType:'blob',
                    onload:r=>res(r.response),onerror:e=>rej(e)
                }));
                const form=new FormData(); form.append('file',blob,'egg.jpg');
                log('Sending to AI');
                const resp=await fetch('http://127.0.0.1:8000/predict',{method:'POST',body:form});
                let {predicted_class}=await resp.json();
                if(attempt>1) predicted_class="Raptor/Vuples";
                log('Predicted',predicted_class);
                Array.from(dlg.querySelectorAll('label')).forEach(lbl=>{
                    if(lbl.textContent.trim()===predicted_class) lbl.click();
                });
                dlg.querySelector('.ui-dialog-buttonpane button').click();
                await new Promise(r=>setTimeout(r,800));
                const errorDlg=Array.from(document.querySelectorAll(dlgSel))
                    .find(d=>d.querySelector('.ui-dialog-title')?.innerText==='Error');
                if(errorDlg){
                    log('Error, retrying');
                    errorDlg.querySelector('.ui-dialog-buttonpane button').click();
                    document.querySelector(turnSel).click();
                    await new Promise(r=>setTimeout(r,800));
                    continue;
                }
                break;
            }
            log('Single moving on');
            stepIndex(); navigateProfile();
        }

        function handleProfile() {
            if (!isRunning()) return;
            log('On single profile');
            let tries=0, max=6;
            (function clickTry(){
                const btn=document.querySelector('button[onclick*="pet_turn_egg"]');
                if(btn){
                    log('Click turn'); btn.click();
                    setTimeout(async()=>{
                        const dlg=document.querySelector('div.ui-dialog[role="dialog"]');
                        if(dlg&&/Name the Species/.test(dlg.innerHTML)){
                            log('Solve puzzle'); await solveAndSubmitSingle();
                        } else {
                            log('No puzzle'); stepIndex(); navigateProfile();
                        }
                    },800);
                } else if(tries++<max){
                    setTimeout(clickTry,800);
                } else {
                    log('No button'); stepIndex(); navigateProfile();
                }
            })();
        }

        function main(){
            if(!isRunning())return;
            const h=location.hash;
            log('Single main',h);
            if(h.includes('sub=profile')&&h.includes('pet=')){
                handleProfile();
            } else {
                collectLinks();
            }
        }

        return { startBot, stopBot, resumeBot, main };
    })();


    // --- Ovipets Auto‐Turn Eggs Across Friends (Original Flow + Enhanced Scan) 1.15 ---
    const OvipetsAll = (function() {
        const RUN_KEY   = 'ovipets_running';
        const FR_KEY    = 'ovipets_friends';
        const FI_KEY    = 'ovipets_friend_index';
        const EG_KEY    = 'ovipets_eggs';
        const EI_KEY    = 'ovipets_egg_index';

        function log(...args){ console.log('%c[OVIPETS-ALL]','background:#222;color:#bada55;',...args); }
        function startBot(){
            log('Starting All-bot');
            sessionStorage.setItem(RUN_KEY,'true');
            sessionStorage.removeItem(FR_KEY);
            sessionStorage.setItem(FI_KEY,'0');
            sessionStorage.removeItem(EG_KEY);
            sessionStorage.setItem(EI_KEY,'0');
            hideResume();
            main();
        }
        function stopBot(){ sessionStorage.removeItem(RUN_KEY); log('Stopped All-bot'); }
        function resumeBot(){ sessionStorage.setItem(RUN_KEY,'true'); hideResume(); stepEggIndex(); navigateEggProfile(); }
        function showResume(){ const btn=document.getElementById('ovipets-all-resume'); if(btn) btn.style.display='inline-block'; }
        function hideResume(){ const btn=document.getElementById('ovipets-all-resume'); if(btn) btn.style.display='none'; }
        function isRunning(){ return sessionStorage.getItem(RUN_KEY)==='true'; }
        function getFriends(){ try{return JSON.parse(sessionStorage.getItem(FR_KEY))||[];}catch{return [];} }
        function setFriends(a){ sessionStorage.setItem(FR_KEY,JSON.stringify(a)); }
        function getFI(){ return parseInt(sessionStorage.getItem(FI_KEY)||'0',10); }
        function setFI(i){ sessionStorage.setItem(FI_KEY,String(i)); log(`Friend index set to ${i}`); }
        function stepFI(){ setFI(getFI()+1); }
        function getEggs(){ try{return JSON.parse(sessionStorage.getItem(EG_KEY))||[];}catch{return [];} }
        function setEggs(a){ sessionStorage.setItem(EG_KEY,JSON.stringify(a)); }
        function getEI(){ return parseInt(sessionStorage.getItem(EI_KEY)||'0',10); }
        function setEI(i){ sessionStorage.setItem(EI_KEY,String(i)); }
        function stepEggIndex(){ setEI(getEI()+1); }

        function collectFriends(){
            if(!isRunning())return;
            log('Collecting friends');
            const ul = document.querySelector('body div#friends-list-modal ul')
                    ||document.querySelector('body div.friends-list ul')
                    ||document.querySelector('body ul');
            if(!ul){ log('Friends list not found'); stopBot(); return; }
            const friends = Array.from(ul.querySelectorAll('a.user.avatar'))
                                  .map(a=>a.href).filter(Boolean)
                                  .filter(h=>h!==window.location.origin+window.location.hash);
            log(`Found ${friends.length} friends`);
            setFriends(friends);
            navigateToNextFriend();
        }

        function navigateToNextFriend(){
            if(!isRunning())return;
            const friends=getFriends();
            let idx=getFI();
            if(idx>=friends.length){
                log('Restarting friends at 0');
                idx=0; setFI(0);
            }
            const friendUrl=friends[idx];
            if(!friendUrl||typeof friendUrl!=='string'){
                log(`Invalid URL at ${idx}, skipping`);
                stepFI();
                setTimeout(navigateToNextFriend,500);
                return;
            }
            let url=friendUrl.replace('#!/','#!/?src=pets&sub=hatchery&usr=');
            if(url.includes('&usr=?usr=')) url=url.replace('&usr=?usr=','&usr=');
            log(`Go to friend ${idx+1}/${friends.length}`);
            location.href=url;
        }
        function hideAnnoyingDiv2(){
            const annoyingDiv=document.querySelector('div.ui-section.ui-widget.ui-widget-content.ui-corner-all#unnamed');
            if(annoyingDiv){
                annoyingDiv.style.display='none';
                log('Hiding annoying div');
            }
        }
        function hideAnnoyingDiv(){
            const annoyingSection=document.querySelector('#unnamed');
            if(annoyingSection){
                annoyingSection.style.display='none';
                log('Hiding annoying section');
            }
        }

        // Enhanced progressive hatchery scan
        function collectEggs(retries=0){
            if(!isRunning())return;
            setTimeout(function(){
            //try to hide the annoying div first
            hideAnnoyingDiv();
            // set display: none; on the div with the classes "ui-section ui-widget ui-widget-content ui-corner-all" and id="unnamed"
            log('Collecting eggs (enhanced scan)');
            document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.removeAttribute('loading'));
            /*
            const progressiveScan=async()=>{
                // wait for #hatchery > div > form and all child elements to load

                const found=new Set();
                const stepY=window.innerHeight * 0.1;
                log('--- SCAN DOWN ---');
                for(let y=0;y<=document.body.scrollHeight;y+=stepY){
                    window.scrollTo(0,y);
                    document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.removeAttribute('loading'));
                    // try to hide the annoying div
                    hideAnnoyingDiv();
                    await new Promise(r=>setTimeout(r,50));
                    document.querySelectorAll('img[title="Turn Egg"]').forEach(img=>{
                        log("checking img", img);
                        const li=img.parentElement?.parentElement?.parentElement;
                        // get the a tag from it <li><div><div class="left"></div><div class="right"><img src="//cdn.ovipets.com//icons/arrow_refresh.png" title="Turn Egg" loading="lazy"></div><input type="checkbox" name="PetID[]" value="478497505" style="display: none;"><a href="#!/?src=pets&amp;sub=profile&amp;usr=5262244&amp;pet=478497505" class="pet"><img src="//im2.ovipets.com/?img=pet&amp;pet=478497505&amp;modified=1748500923&amp;size=80" width="80" height="80" loading="lazy"></a></div></li>
                        const a=li?.querySelector('a.pet');
                        log("FOUND!", li);
                        if(a){found.add(a); log("Found!");}
                    });
                    // select for src="//cdn.ovipets.com//icons/arrow_refresh.png" and get the li and add to found
                    document.querySelectorAll('img[src="//cdn.ovipets.com//icons/arrow_refresh.png"]').forEach(img=>{
                        log("checking img", img);
                        const li=img.parentElement?.parentElement?.parentElement;
                        const a=li?.querySelector('a.pet');
                        log("FOUND!", li);
                        if(a){found.add(a); log("Found!");}
                    });
                    document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.removeAttribute('loading'));
                }
                document.querySelectorAll('img[title="Turn Egg"]').forEach(img=>{
                        log("checking img", img);
                        const li=img.parentElement?.parentElement?.parentElement;
                        const a=li?.querySelector('a.pet');
                        log("FOUND!", li);
                        if(a){found.add(a); log("Found!");}
                    });
                log('--- SCAN UP ---');
                for(let y=document.body.scrollHeight;y>=0;y-=stepY){
                    window.scrollTo(0,y);
                    document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.removeAttribute('loading'));
                    // try to hide the annoying div
                    hideAnnoyingDiv();
                    await new Promise(r=>setTimeout(r,15));
                    document.querySelectorAll('img[title="Turn Egg"]').forEach(img=>{
                        log("checking img", img);
                        const li=img.parentElement?.parentElement?.parentElement;
                        const a=li?.querySelector('a.pet');
                        log("FOUND!", li);
                        if(a){found.add(a); log("Found!");}
                    });
                    document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.removeAttribute('loading'));
                }

                window.scrollTo(0,0);
                document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.removeAttribute('loading'));
                document.querySelectorAll('img[title="Turn Egg"]').forEach(img=>{
                        log("checking img", img);
                        const li=img.parentElement?.parentElement?.parentElement;
                        const a=li?.querySelector('a.pet');
                        log("FOUND!", li);
                        if(a){found.add(a); log("Found!");}
                    });
                log(`Scan complete, found ${found.size} li`);
                log('--- SCAN DOWN ---');
                for(let y=0;y<=document.body.scrollHeight*.9;y+=stepY){
                    window.scrollTo(0,y);
                    document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.removeAttribute('loading'));
                    // try to hide the annoying div
                    hideAnnoyingDiv();
                    await new Promise(r=>setTimeout(r,50));
                    document.querySelectorAll('img[title="Turn Egg"]').forEach(img=>{
                        log("checking img", img);
                        const li=img.parentElement?.parentElement?.parentElement;
                        const a=li?.querySelector('a.pet');
                        log("FOUND!", li);
                        if(a){found.add(a); log("Found!");}
                    });
                    document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.removeAttribute('loading'));
                }
                document.querySelectorAll('img[title="Turn Egg"]').forEach(img=>{
                        log("checking img", img);
                        const li=img.parentElement?.parentElement?.parentElement;
                        const a=li?.querySelector('a.pet');
                        log("FOUND!", li);
                        if(a){found.add(a); log("Found!");}
                    });*/
                // get all the a tags that have
                // then we will store the result of finding all the img[title="Turn Egg"] img.parentElement?.parentElement?.parentElement?.querySelector('a.pet') in a variable in the response and then we will return that instead of the original response
                // get usr= from the url https://ovipets.com/#!/?src=pets&sub=hatchery&usr=5082218
                // get usr from here <div id="src_events usr="1234567"></div>  selector: #src_events
                var usr = document.querySelector('#src_pets')?.getAttribute('usr');
                // if usr undefined, loop until it is
                while (!usr) {
                    setTimeout(() => {
                    usr = document.querySelector('#src_pets')?.getAttribute('usr');
                    }, 100);
                }
                // make a request to https://ovipets.com/?src=pets&sub=hatchery&usr={usr}&?&!=jQuery36001195479668276287_1748584681454&_=1748584681455
                const retries = 3;
                const progressiveScan = async () => {
                    log('Progressive scan');
                    const found = new Set();
                    for (let i = 0; i < retries; i++) {
                        log(`Scan attempt ${i + 1}/${retries}`);
                        const response = await fetch(`https://ovipets.com/?src=pets&sub=hatchery&usr=${usr}&!=jQuery36001195479668276287_1748584681454&_=1748584681455`);
                        if (!response.ok) {
                            log('Failed to fetch hatchery page');
                            continue;
                        }
                        // log the response content in full
                        log('Response received, parsing HTML');
                        log (`Response URL: ${response.url}`);
                        log(`Response Status: ${response.status} ${response.statusText}`);
                        log(`Response Headers: ${JSON.stringify([...response.headers.entries()])}`);
                        log(`Response Size: ${response.headers.get('content-length')} bytes`);
                        log(`Response Type: ${response.headers.get('content-type')}`);
                        var text = await response.text();
                        // strip away outer "jQuery36001195479668276287_1748584681454({leave this json})" ie remove the jquery and parentheses but leave the JSON inside
                        text = text.replace(/^[^{]*\(/, '').replace(/\);?$/, '');
                        // parse into json object
                        text = JSON.parse(text);
                        // text = text['output']
                        text = text['output'];

                        const parser = new DOMParser();
                        const doc = parser.parseFromString(text, 'text/html');
                        const lis = doc.querySelectorAll('img[title="Turn Egg"]');
                        lis.forEach(li => {
                            const a = li.parentElement?.parentElement?.parentElement?.querySelector('a.pet');
                            if (a) found.add(a.href);
                        });
                    }
                    log(`Found ${found.size} eggs`);



                return Array.from(found);
            };
            const strict = lis=>lis.filter(li=>!li.querySelector('div.right img[title="Available"]'));
            (async()=>{
                let looseDone=false;
                async function attempt(n){
                    log(`Attempt ${n}/${retries}`);
                    var lis=await progressiveScan();
                    if(!looseDone){
                        looseDone=true;
                        document.querySelectorAll('img[title="Turn Egg"]').forEach(img=>{
                            log("checking img", img);
                            const li=img.parentElement?.parentElement?.parentElement;
                            const a=li?.querySelector('a.pet');
                            if(a){ lis.push(a); log("Found!"); }
                        });
                        log('Loose fallback');
                        if(lis.length){
                            log(`Loose found ${lis.length}`);
                            setEggs(lis.map(a=>a.href).filter(Boolean));
                            return navigateEggProfile();
                        }
                    }
                    if(n<retries) return attempt(n+1);
                    log('No eggs → next friend');
                    stepFI(); navigateToNextFriend();
                }
                attempt(1);
            })();
        }, 1500);
        }

        function navigateEggProfile(){
            if(!isRunning())return;
            const eggs=getEggs(), idx=getEI();
            if(idx>=eggs.length){
                log('Eggs done for this friend');
                stepFI(); navigateToNextFriend();
                return;
            }
            log(`Go to egg page ${idx+1}/${eggs.length}`);
            location.href=eggs[idx];
        }

        async function solveAndSubmitAll(){
            const dlgSel='div.ui-dialog[role="dialog"]', turnSel='button[onclick*="pet_turn_egg"]', maxR=2;
            for(let a=1;a<=maxR;a++){
                const dlg=document.querySelector(dlgSel);
                if(!dlg)continue;
                const img=dlg.querySelector('fieldset img');
                if(!img){ log('No modal image'); break; }
                const url=img.src.replace(/^\/\//,'https://');
                log(`Solve attempt ${a}: fetch ${url}`);
                const blob=await new Promise((res,rej)=>GM_xmlhttpRequest({
                    method:'GET',url,responseType:'blob',
                    onload:r=>res(r.response),onerror:e=>rej(e)
                }));
                const form=new FormData(); form.append('file',blob,'egg.jpg');
                log('Sending to AI');
                const resp=await fetch('http://127.0.0.1:8000/predict',{method:'POST',body:form});
                const {predicted_class}=await resp.json();
                log('Predicted',predicted_class);
                Array.from(dlg.querySelectorAll('label')).forEach(lbl=>{
                    if(lbl.textContent.trim()===predicted_class) lbl.click();
                });
                dlg.querySelector('.ui-dialog-buttonpane button').click();
                await new Promise(r=>setTimeout(r,1000));
                const err=Array.from(document.querySelectorAll(dlgSel))
                               .find(d=>d.querySelector('.ui-dialog-title')?.innerText==='Error');
                if(err){ log('Error modal, retry'); err.querySelector('.ui-dialog-buttonpane button').click(); document.querySelector(turnSel).click(); await new Promise(r=>setTimeout(r,1000)); continue; }
                break;
            }
            log('All solved, moving on');
            stepEggIndex();
            setTimeout(()=>{
                const prev=location.href;
                navigateEggProfile();
                setTimeout(()=>{ if(location.href===prev){ log('Stuck, retry nav'); navigateEggProfile(); } },1500);
            },500);
        }

        function handleProfile(){
            if(!isRunning())return;
            log('On egg profile');
            let tries=0,max=6;
            (function clickTry(){
                const btn=document.querySelector('button[onclick*="pet_turn_egg"]');
                if(btn){
                    log('Click turn'); btn.click();
                    setTimeout(async()=>{
                        const dlg=document.querySelector('div.ui-dialog[role="dialog"]');
                        if(dlg&&/Name the Species/.test(dlg.innerHTML)){
                            log('Puzzle'); await solveAndSubmitAll();
                        } else {
                            log('No puzzle'); stepEggIndex(); navigateEggProfile();
                        }
                    },800);
                } else if(tries++<max){
                    setTimeout(clickTry,200);
                } else {
                    log('No button'); stepEggIndex(); navigateEggProfile();
                }
            })();
        }

        function main(){
            if(!isRunning())return;
            const h=location.hash||'';
            log('All main',h);
            if(h.includes('sub=profile')&&h.includes('pet=')){
                handleProfile();
            } else if(h.includes('sub=hatchery')){
                collectEggs();
            } else {
                collectFriends();
            }
        }

        return { startBot, stopBot, resumeBot, main };
    })();


        // --- Ovipets Auto‐Turn Eggs Across Friends (Original Flow + Enhanced Scan) 1.15 ---
    const OvipetsThorough = (function() {
        const RUN_KEY   = 'ovipets_thorough_running';
        const FR_KEY    = 'ovipets_thorough_friends';
        const FI_KEY    = 'ovipets_thorough_friend_index';
        const EG_KEY    = 'ovipets_thorough_eggs';
        const EI_KEY    = 'ovipets_thorough_egg_index';

        function log(...args){ console.log('%c[OVIPETS-THOROUGH]','background:#222;color:#bada55;',...args); }
        function startBot(){
            log('Starting Thorough-bot');
            sessionStorage.setItem(RUN_KEY,'true');
            sessionStorage.removeItem(FR_KEY);
            sessionStorage.setItem(FI_KEY,'0');
            sessionStorage.removeItem(EG_KEY);
            sessionStorage.setItem(EI_KEY,'0');
            hideResume();
            main();
        }
        function stopBot(){ sessionStorage.removeItem(RUN_KEY); log('Stopped Thorough-bot'); }
        function resumeBot(){ sessionStorage.setItem(RUN_KEY,'true'); hideResume(); stepEggIndex(); navigateEggProfile(); }
        function showResume(){ const btn=document.getElementById('ovipets-thorough-resume'); if(btn) btn.style.display='inline-block'; }
        function hideResume(){ const btn=document.getElementById('ovipets-thorough-resume'); if(btn) btn.style.display='none'; }
        function isRunning(){ return sessionStorage.getItem(RUN_KEY)==='true'; }
        function getFriends(){ try{return JSON.parse(sessionStorage.getItem(FR_KEY))||[];}catch{return [];} }
        function setFriends(a){ sessionStorage.setItem(FR_KEY,JSON.stringify(a)); }
        function getFI(){ return parseInt(sessionStorage.getItem(FI_KEY)||'0',10); }
        function setFI(i){ sessionStorage.setItem(FI_KEY,String(i)); log(`Friend index set to ${i}`); }
        function stepFI(){ setFI(getFI()+1); }
        function getEggs(){ try{return JSON.parse(sessionStorage.getItem(EG_KEY))||[];}catch{return [];} }
        function setEggs(a){ sessionStorage.setItem(EG_KEY,JSON.stringify(a)); }
        function getEI(){ return parseInt(sessionStorage.getItem(EI_KEY)||'0',10); }
        function setEI(i){ sessionStorage.setItem(EI_KEY,String(i)); }
        function stepEggIndex(){ setEI(getEI()+1); }

        function collectFriends(){
            if(!isRunning())return;
            log('Collecting friends');
            const ul = document.querySelector('body div#friends-list-modal ul')
                    ||document.querySelector('body div.friends-list ul')
                    ||document.querySelector('body ul');
            if(!ul){ log('Friends list not found'); stopBot(); return; }
            const friends = Array.from(ul.querySelectorAll('a.user.avatar'))
                                  .map(a=>a.href).filter(Boolean)
                                  .filter(h=>h!==window.location.origin+window.location.hash);
            log(`Found ${friends.length} friends`);
            setFriends(friends);
            navigateToNextFriend();
        }

        function navigateToNextFriend(){
            if(!isRunning())return;
            const friends=getFriends();
            let idx=getFI();
            if(idx>=friends.length){
                log('Restarting friends at 0');
                idx=0; setFI(0);
            }
            const friendUrl=friends[idx];
            if(!friendUrl||typeof friendUrl!=='string'){
                log(`Invalid URL at ${idx}, skipping`);
                stepFI();
                setTimeout(navigateToNextFriend,500);
                return;
            }
            let url=friendUrl.replace('#!/','#!/?src=pets&sub=hatchery&usr=');
            if(url.includes('&usr=?usr=')) url=url.replace('&usr=?usr=','&usr=');
            log(`Go to friend ${idx+1}/${friends.length}`);
            location.href=url;
        }
        function hideAnnoyingDiv2(){
            const annoyingDiv=document.querySelector('div.ui-section.ui-widget.ui-widget-content.ui-corner-all#unnamed');
            if(annoyingDiv){
                annoyingDiv.style.display='none';
                log('Hiding annoying div');
            }
        }
        function hideAnnoyingDiv(){
            const annoyingSection=document.querySelector('#unnamed');
            if(annoyingSection){
                annoyingSection.style.display='none';
                log('Hiding annoying section');
            }
        }

        // Enhanced progressive hatchery scan
        function collectEggs(retries=0){
            if(!isRunning())return;
            setTimeout(function(){
            //try to hide the annoying div first
            hideAnnoyingDiv();
            // set display: none; on the div with the classes "ui-section ui-widget ui-widget-content ui-corner-all" and id="unnamed"
            log('Collecting eggs (enhanced scan)');
            const progressiveScan=async()=>{
                // wait for #hatchery > div > form and all child elements to load

                const found=new Set();
                const stepY=window.innerHeight * 0.1;
                log('--- SCAN DOWN ---');
                for(let y=0;y<=document.body.scrollHeight;y+=stepY){
                    window.scrollTo(0,y);
                }
                hideAnnoyingDiv();
                window.scrollTo(0,0);
                log(`Scan complete, found ${found.size} li`);

                // get all the a tags that have #hatchery > div > form > ul > li:nth-child > div > a
                return Array.from(document.querySelectorAll('#hatchery > div > form > ul > li > div > a'));
            };
            (async()=>{
                let looseDone=false;
                async function attempt(n){
                    log(`Attempt ${n}/${retries}`);
                    var lis=await progressiveScan();
                        looseDone=true;
                        log('Loose fallback');
                        if(lis.length){
                            log(`Loose found ${lis.length}`);
                            setEggs(lis.map(a=>a.href).filter(Boolean));
                            return navigateEggProfile();
                        }
                    if(n<retries) return attempt(n+1);
                    log('No eggs → next friend');
                    stepFI(); navigateToNextFriend();
                }
                attempt(1);
            })();
        }, 1500);
        }

        function navigateEggProfile(){
            if(!isRunning())return;
            const eggs=getEggs(), idx=getEI();
            if(idx>=eggs.length){
                log('Eggs done for this friend');
                stepFI(); navigateToNextFriend();
                return;
            }
            log(`Go to egg page ${idx+1}/${eggs.length}`);
            location.href=eggs[idx];
        }

        async function solveAndSubmitAll(){
            const dlgSel='div.ui-dialog[role="dialog"]', turnSel='button[onclick*="pet_turn_egg"]', maxR=2;
            for(let a=1;a<=maxR;a++){
                const dlg=document.querySelector(dlgSel);
                if(!dlg)continue;
                const img=dlg.querySelector('fieldset img');
                if(!img){ log('No modal image'); break; }
                const url=img.src.replace(/^\/\//,'https://');
                log(`Solve attempt ${a}: fetch ${url}`);
                const blob=await new Promise((res,rej)=>GM_xmlhttpRequest({
                    method:'GET',url,responseType:'blob',
                    onload:r=>res(r.response),onerror:e=>rej(e)
                }));
                const form=new FormData(); form.append('file',blob,'egg.jpg');
                log('Sending to AI');
                const resp=await fetch('http://127.0.0.1:8000/predict',{method:'POST',body:form});
                const {predicted_class}=await resp.json();
                log('Predicted',predicted_class);
                Array.from(dlg.querySelectorAll('label')).forEach(lbl=>{
                    if(lbl.textContent.trim()===predicted_class) lbl.click();
                });
                dlg.querySelector('.ui-dialog-buttonpane button').click();
                await new Promise(r=>setTimeout(r,1000));
                const err=Array.from(document.querySelectorAll(dlgSel))
                               .find(d=>d.querySelector('.ui-dialog-title')?.innerText==='Error');
                if(err){ log('Error modal, retry'); err.querySelector('.ui-dialog-buttonpane button').click(); document.querySelector(turnSel).click(); await new Promise(r=>setTimeout(r,1000)); continue; }
                break;
            }
            log('All solved, moving on');
            stepEggIndex();
            setTimeout(()=>{
                const prev=location.href;
                navigateEggProfile();
                setTimeout(()=>{ if(location.href===prev){ log('Stuck, retry nav'); navigateEggProfile(); } },1500);
            },500);
        }

        function handleProfile(){
            if(!isRunning())return;
            log('On egg profile');
            let tries=0,max=2;
            (function clickTry(){
                const btn=document.querySelector('button[onclick*="pet_turn_egg"]');
                if(btn){
                    log('Click turn'); btn.click();
                    setTimeout(async()=>{
                        const dlg=document.querySelector('div.ui-dialog[role="dialog"]');
                        if(dlg&&/Name the Species/.test(dlg.innerHTML)){
                            log('Puzzle'); await solveAndSubmitAll();
                        } else {
                            log('No puzzle'); stepEggIndex(); navigateEggProfile();
                        }
                    },800);
                } else if(tries++<max){
                    setTimeout(clickTry,100);
                } else {
                    log('No button'); stepEggIndex(); navigateEggProfile();
                }
            })();
        }

        function main(){
            if(!isRunning())return;
            const h=location.hash||'';
            log('All main',h);
            if(h.includes('sub=profile')&&h.includes('pet=')){
                handleProfile();
            } else if(h.includes('sub=hatchery')){
                collectEggs();
            } else {
                collectFriends();
            }
        }

        return { startBot, stopBot, resumeBot, main };
    })();


    // --- Unified Control Panel ---
    function injectUnifiedControls(){
        if(document.getElementById('unified-control'))return;
        const panel=document.createElement('div');
        panel.id='unified-control';
        Object.assign(panel.style,{
            position:'fixed',bottom:'20px',left:'20px',
            padding:'8px',background:'rgba(0,0,0,0.6)',
            color:'#fff',zIndex:9999,fontSize:'14px',borderRadius:'4px'
        });

        // Befriender
        const bef=document.createElement('div');
        bef.innerHTML=`<strong>Befriender</strong>
            <button>▶️ Start</button>
            <button>⏹️ Stop</button>`;
        bef.querySelector('button:first-of-type').onclick=Befriender.startBot;
        bef.querySelector('button:last-of-type').onclick=Befriender.stopBot;
        panel.append(bef);

        // Across Friends
        const all=document.createElement('div');
        all.innerHTML=`<strong>Ovipets Across</strong>
            <button>▶️ Start</button>
            <button>⏹️ Stop</button>
            <button id="ovipets-all-resume" style="display:none">⏯️ Resume</button>`;
        all.querySelector('button:nth-of-type(1)').onclick=OvipetsAll.startBot;
        all.querySelector('button:nth-of-type(2)').onclick=OvipetsAll.stopBot;
        all.querySelector('#ovipets-all-resume').onclick=OvipetsAll.resumeBot;
        panel.append(all);

        // Across Friends Thorough
        const thor=document.createElement('div');
        thor.innerHTML=`<strong>Ovipets Across Thorough</strong>
            <button>▶️ Start</button>
            <button>⏹️ Stop</button>
            <button id="ovipets-thorough-resume" style="display:none">⏯️ Resume</button>`;
        thor.querySelector('button:nth-of-type(1)').onclick=OvipetsThorough.startBot;
        thor.querySelector('button:nth-of-type(2)').onclick=OvipetsThorough.stopBot;
        thor.querySelector('#ovipets-thorough-resume').onclick=OvipetsThorough.resumeBot;
        panel.append(thor);

        document.body.append(panel);
    }

    window.addEventListener('load', ()=>{
        injectUnifiedControls();
        Befriender.main();
        OvipetsSingle.main();
        OvipetsAll.main();
        OvipetsThorough.main();
    });
    window.addEventListener('hashchange', ()=>{
        Befriender.main();
        OvipetsSingle.main();
        OvipetsAll.main();
        OvipetsThorough.main();
    });

})();