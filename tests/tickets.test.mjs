import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSubmission,escapeTelegram,makeTicketId,formatTelegramMessage} from '../src/tickets.mjs';

const valid={name:'نیما خالقا',contact:'@nima_project',category:'ai',budget:'',timeline:'',description:'یک پروژه هوش مصنوعی برای دسته‌بندی داده‌ها داریم.',website:''};
test('valid project request passes',()=>{const result=validateSubmission(valid);assert.equal(result.ok,true);assert.equal(result.data.category,'ai')});
test('invalid category is rejected',()=>assert.equal(validateSubmission({...valid,category:'hacker'}).ok,false));
test('short description is rejected',()=>assert.equal(validateSubmission({...valid,description:'کوتاه'}).ok,false));
test('honeypot is flagged as spam',()=>assert.equal(validateSubmission({...valid,website:'https://spam.test'}).spam,true));
test('html is escaped in telegram message',()=>{const message=formatTelegramMessage('NT-123',{...valid,name:'<b>Hello&</b>'});assert.ok(message.includes('&lt;b&gt;Hello&amp;&lt;/b&gt;'));assert.ok(!message.includes('<b>Hello&</b>'))});
test('ticket format contains a date and 6 random hex digits',()=>assert.match(makeTicketId(new Date('2026-10-26T12:00:00.000Z')),/^NT-20261026-[A-F0-9]{6}$/));
test('telegram escaping handles all html special chars',()=>assert.equal(escapeTelegram(`<>&"'`),'&lt;&gt;&amp;&quot;&#39;'));
