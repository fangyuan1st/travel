/* Shared, authenticated encryption primitives; no passwords or keys embedded. */
(function(root){
'use strict';
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=bytes=>{let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s)};
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const random=n=>crypto.getRandomValues(new Uint8Array(n));
const importKey=bytes=>crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
async function passwordKey(password,salt,iterations=600000){
 if(iterations!==600000)throw Error('Unsupported password derivation');
 const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:un64(salt),iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function seal(key,bytes,context){const iv=random(12),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(context)},key,bytes));const out=new Uint8Array(12+cipher.length);out.set(iv);out.set(cipher,12);return out}
async function open(key,bytes,context){bytes=new Uint8Array(bytes);if(bytes.length<28)throw Error('Invalid encrypted file');return crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12),additionalData:enc.encode(context)},key,bytes.slice(12))}
async function makeSlot(password,raw,packId){const salt=b64(random(16)),key=await passwordKey(password,salt);return {salt,iterations:600000,wrapped_key:b64(await seal(key,raw,'guest:'+packId))}}
async function unlock(password,access){if(access.format===2){const result=await unlockAccess(password,access);result.shared?.fill(0);return result.raw}if(access.format!==1||access.slots.length>20)throw Error('Unsupported release');for(const slot of access.slots){try{const key=await passwordKey(password,slot.salt,slot.iterations);return new Uint8Array(await open(key,un64(slot.wrapped_key),'guest:'+access.pack_id))}catch{}}throw Error('Incorrect password')}
async function unlockAccess(password,access){
 if(access.format!==2)return {raw:await unlock(password,access),scope:'family'};
 let shared;
 try{shared=await unlockLibrary(password,access.library);return {raw:await contentKey(shared,access),shared,scope:'family'}}catch{shared?.fill(0)}
 const raw=await unlock(password,{format:1,pack_id:access.pack_id,slots:access.guest_slots||[]});
 return {raw,scope:'guest'};
}
async function unlockLibrary(password,library){return unlock(password,{format:1,pack_id:library.id,slots:library.slots})}
async function contentKey(shared,access){return new Uint8Array(await open(await importKey(shared),un64(access.wrapped_content_key),'library:'+access.library.id+':'+access.pack_id))}
function lease(raw,packId,now=Date.now()){return {pack_id:packId,key:b64(raw),created:now,expires:now+30*24*60*60*1000}}
function validLease(v,packId,now=Date.now()){return !!v&&v.pack_id===packId&&Number.isFinite(v.created)&&Number.isFinite(v.expires)&&now>=v.created&&now<v.expires&&v.expires-v.created<=30*24*60*60*1000&&typeof v.key==='string'}
root.TripCrypto={enc,dec,b64,un64,random,importKey,passwordKey,seal,open,makeSlot,unlock,unlockAccess,unlockLibrary,contentKey,lease,validLease};
})(globalThis);
