import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createStore,validateProject,validatePerson,validateTexts,DEFAULT_TEXTS} from '../src/cms.mjs';
import {team} from '../public/content.js';
test('seeds project/team content and preserves edits and tickets across reopen',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ntlab-store-test-'));
 try{
  const a=createStore(dir),seed=await a.get();assert.equal(seed.team.length,2);assert.equal(seed.projects.length,7);
  const edits={...seed.texts,service_1_body:'توضیح تست نسخه جدید'};
  await a.update(s=>{s.texts=validateTexts(edits);s.tickets.push({id:'NT-20261026-ABCDEF',status:'new'});});
  const b=createStore(dir),again=await b.get();assert.equal(again.texts.service_1_body,'توضیح تست نسخه جدید');assert.equal(again.tickets[0].status,'new');
  const json=JSON.parse(await readFile(path.join(dir,'site-data.json'),'utf8'));assert.equal(json.projects.length,7);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('validates edits and prevents script injection or unsupported images',()=>{
 const project={title:'آزمایش تست',description:'توضیحات کامل و طولانی برای تست مدل',owner:'nima',kind:'پروژه تستی',number:'01',year:'۱۴۰۵',subtitle:'',source:'https://example.com',art:'robot',tags:['AI'],image:''};
 assert.equal(validateProject(project).owner,'nima');
 assert.throws(()=>validateProject({...project,source:'javascript:alert(1)'}));
 assert.throws(()=>validateProject({...project,image:'/uploads/payload.svg'}));
 assert.throws(()=>validateProject({...project,owner:'another'}));
 const person=validatePerson({...team[0],photo:''},'nima');assert.equal(person.slug,'nima');
 assert.throws(()=>validatePerson({...team[0],photo:'https://evil.example/spy.png'},'nima'));
 assert.throws(()=>validateTexts({...DEFAULT_TEXTS,hero_description:''}));
});
