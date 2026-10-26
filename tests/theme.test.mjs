import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function harness(saved=null, darkSystem=false) {
  const storage = new Map(saved ? [['ntlab-theme',saved]] : []);
  const label={textContent:''};
  const attrs=new Map();
  const callbacks=new Map();
  const button={
    setAttribute(key,value) {attrs.set(key,value);},
    getAttribute(key) {return attrs.get(key);},
    querySelector(selector) {return selector==='.theme-toggle-label'?label:null;},
    addEventListener(name,cb) {callbacks.set(name,cb);},
    title:''
  };
  const meta={setAttribute(key,value){attrs.set('meta:'+key,value);}};
  const html={dataset:{},style:{}};
  let preferenceListener;
  const window={matchMedia(){return {matches:darkSystem,addEventListener(event,listener){preferenceListener=listener;}}}};
  const document={documentElement:html,querySelector(selector){return selector==='meta[name="theme-color"]'?meta:null;},querySelectorAll(selector){return selector==='.theme-toggle'?[button]:[];}};
  const localStorage={getItem(key){return storage.get(key)??null;},setItem(key,value){storage.set(key,value);}};
  return {window,document,localStorage,storage,html,button,label,attrs,callbacks,systemChanged(matches){preferenceListener?.({matches});}};
}

test('preload chooses saved preference before CSS, otherwise the system preference',()=>{
 const src=readFileSync(new URL('../public/theme-preload.js',import.meta.url),'utf8');
 for(const [saved,system,expected] of [['light',true,'light'],['dark',false,'dark'],[null,true,'dark'],[null,false,'light']]){
  const env=harness(saved,system);
  runInNewContext(src,{document:env.document,localStorage:env.localStorage,matchMedia:env.window.matchMedia});
  assert.equal(env.html.dataset.theme,expected);
 }
});

test('theme switcher updates text, persists selection, and follows system only before manual choice',async()=>{
 const env=harness(null,false);
 globalThis.window=env.window;
 globalThis.document=env.document;
 globalThis.localStorage=env.localStorage;
 const {initTheme}=await import('../public/theme.js');
 initTheme();
 assert.equal(env.html.dataset.theme,'light');
 assert.equal(env.button.getAttribute('aria-checked'),'true');
 assert.equal(env.label.textContent,'حالت روشن');
 env.systemChanged(true);
 assert.equal(env.html.dataset.theme,'dark');
 assert.equal(env.button.getAttribute('aria-checked'),'false');
 env.callbacks.get('click')();
 assert.equal(env.html.dataset.theme,'light');
 assert.equal(env.storage.get('ntlab-theme'),'light');
 assert.equal(env.label.textContent,'حالت روشن');
 assert.equal(env.attrs.get('meta:content'),'#f4f8f3');
 env.systemChanged(true);
 assert.equal(env.html.dataset.theme,'light');
 env.callbacks.get('click')();
 assert.equal(env.html.dataset.theme,'dark');
 assert.equal(env.storage.get('ntlab-theme'),'dark');
 delete globalThis.window;delete globalThis.document;delete globalThis.localStorage;
});

test('both pages include preference preloader, the switch, and a versioned stylesheet',()=>{
 for(const page of ['index.html','team.html']){
   const html=readFileSync(new URL('../public/'+page,import.meta.url),'utf8');
   assert.match(html,/src="\/theme-preload\.js\?v=1\.4\.1"/);
   assert.match(html,/class="theme-toggle"/);
   assert.match(html,/href="\/styles\.css\?v=1\.4\.1"/);
 }
});
